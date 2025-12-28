from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.files.base import ContentFile
import uuid
import base64
from io import BytesIO

from .models import Analysis, AnalysisSource, Script, ScriptSegment, MediaFile
from .serializers import (
    AnalysisSerializer, AnalysisCreateSerializer,
    ScriptSerializer, ScriptCreateSerializer, ScriptSegmentCreateSerializer,
    ScriptSegmentSerializer
)
from .gemini_service import GeminiService


class AnalysisViewSet(viewsets.ModelViewSet):
    """ViewSet для работы с анализами"""
    queryset = Analysis.objects.all()
    serializer_class = AnalysisSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AnalysisCreateSerializer
        return AnalysisSerializer
    
    @transaction.atomic
    def create(self, request):
        """Создание нового анализа"""
        serializer = AnalysisCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        sources_data = serializer.validated_data['sources']
        
        # Создаем анализ
        analysis = Analysis.objects.create(status='processing')
        
        # Создаем источники
        sources_list = []
        for source_data in sources_data:
            source_type = source_data.get('type')
            label = source_data.get('label', '')
            value = source_data.get('value')
            
            source = AnalysisSource.objects.create(
                analysis=analysis,
                source_type=source_type,
                label=label
            )
            
            if source_type == 'url':
                source.url = value
                source.save()
            else:
                # Для файлов - сохраняем base64 данные
                if isinstance(value, dict) and 'data' in value:
                    # Сохраняем файл из base64
                    file_data = base64.b64decode(value['data'])
                    file_name = label or 'video.mp4'
                    source.file.save(
                        file_name,
                        ContentFile(file_data),
                        save=True
                    )
                    source.file_mime_type = value.get('mimeType', 'video/mp4')
                    source.save()
            
            sources_list.append({
                'type': source_type,
                'value': value,
                'label': label
            })
        
        # Запускаем анализ в фоне (можно использовать Celery для асинхронности)
        try:
            gemini_service = GeminiService()
            analysis_result = gemini_service.analyze_content(sources_list)
            
            # Сохраняем результаты
            analysis.transcript = analysis_result['transcript']
            analysis.style_passport = analysis_result['stylePassport']
            analysis.patterns = analysis_result['patterns']
            analysis.grounding_sources = analysis_result['sources']
            analysis.status = 'ready'
            analysis.save()
        except Exception as e:
            analysis.status = 'error'
            analysis.save()
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Возвращаем результат
        result_serializer = AnalysisSerializer(analysis, context={'request': request})
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def history(self, request):
        """Получение истории анализов"""
        analyses = self.queryset.filter(status='ready').order_by('-created_at')[:20]
        serializer = self.get_serializer(analyses, many=True)
        return Response(serializer.data)


class ScriptViewSet(viewsets.ModelViewSet):
    """ViewSet для работы со сценариями"""
    queryset = Script.objects.all()
    serializer_class = ScriptSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ScriptCreateSerializer
        return ScriptSerializer
    
    @transaction.atomic
    def create(self, request):
        """Создание нового сценария"""
        serializer = ScriptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        analysis_id = serializer.validated_data['analysis_id']
        topic = serializer.validated_data['topic']
        
        analysis = get_object_or_404(Analysis, id=analysis_id)
        
        # Генерируем сценарий
        try:
            gemini_service = GeminiService()
            segments_data = gemini_service.generate_script(
                topic=topic,
                style_passport=analysis.style_passport,
                patterns=analysis.patterns
            )
        except Exception as e:
            return Response(
                {'error': f'Ошибка генерации сценария: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Создаем сценарий
        script = Script.objects.create(
            analysis=analysis,
            topic=topic
        )
        
        # Создаем сегменты
        for order, segment_data in enumerate(segments_data):
            ScriptSegment.objects.create(
                script=script,
                timeframe=segment_data.get('timeframe', ''),
                visual=segment_data.get('visual', ''),
                audio=segment_data.get('audio', ''),
                order=order
            )
        
        result_serializer = ScriptSerializer(script, context={'request': request})
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def generate_media(self, request, pk=None):
        """Генерация медиа для сегмента сценария"""
        script = self.get_object()
        segment_id = request.data.get('segment_id')
        segment = get_object_or_404(ScriptSegment, id=segment_id, script=script)
        
        # Проверяем, есть ли уже медиа файл
        media_file, created = MediaFile.objects.get_or_create(
            segment=segment,
            media_type='image',
            defaults={'status': 'idle'}
        )
        
        if not created and media_file.status == 'done':
            # Медиа уже сгенерировано
            serializer = ScriptSegmentSerializer(segment, context={'request': request})
            return Response(serializer.data)
        
        try:
            gemini_service = GeminiService()
            
            # Генерируем изображение
            media_file.status = 'generating_image'
            media_file.save()
            
            image_data = gemini_service.generate_image(segment.visual)
            image_file = ContentFile(image_data, name=f'image_{segment.id}.png')
            media_file.image_file = image_file
            media_file.save()
            
            # Генерируем видео
            media_file.status = 'generating_video'
            media_file.save()
            
            image_base64 = base64.b64encode(image_data).decode('utf-8')
            video_url = gemini_service.generate_video_from_image(image_base64, segment.visual)
            media_file.external_url = video_url
            media_file.media_type = 'video'
            media_file.save()
            
            # Генерируем аудио
            media_file.status = 'generating_audio'
            media_file.save()
            
            audio_data = gemini_service.generate_speech(segment.audio)
            audio_file = ContentFile(audio_data, name=f'audio_{segment.id}.wav')
            media_file.audio_file = audio_file
            media_file.media_type = 'audio'
            media_file.save()
            
            # Завершено
            media_file.status = 'done'
            media_file.save()
            
        except Exception as e:
            media_file.status = 'error'
            media_file.save()
            return Response(
                {'error': f'Ошибка генерации медиа: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        serializer = ScriptSegmentSerializer(segment, context={'request': request})
        return Response(serializer.data)
