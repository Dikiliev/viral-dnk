from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.files.base import ContentFile
import uuid
import base64
import json
from io import BytesIO

from .models import Analysis, AnalysisSource, Script, ScriptSegment, MediaFile
from .serializers import (
    AnalysisSerializer, AnalysisCreateSerializer,
    ScriptSerializer, ScriptCreateSerializer, ScriptSegmentCreateSerializer,
    ScriptSegmentSerializer
)
from .gemini_service import GeminiService
from .youtube_service import YouTubeService
from .kie_service import KieService


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
        youtube_service = YouTubeService()
        
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
                
                # Если это YouTube или TikTok URL, скачиваем видео
                if youtube_service.is_supported_url(value):
                    try:
                        analysis.status = 'downloading'
                        analysis.save()
                        
                        # Скачиваем видео
                        video_data = youtube_service.download_video(value)
                        
                        # Сохраняем как файл
                        file_name = f"{youtube_service._sanitize_filename(video_data['title'])}.mp4"
                        source.file.save(
                            file_name,
                            ContentFile(video_data['file_data']),
                            save=True
                        )
                        source.file_mime_type = video_data['mime_type']
                        source.source_type = 'file'  # Меняем тип на file после скачивания
                        source.save()
                        
                        # Для передачи в Gemini используем base64
                        value = {
                            'data': base64.b64encode(video_data['file_data']).decode('utf-8'),
                            'mimeType': video_data['mime_type']
                        }
                        label = video_data['title']
                        source_type = 'file'  # Обновляем тип для sources_list
                        
                    except Exception as e:
                        # Если не удалось скачать, оставляем как URL
                        source.save()
                        platform = 'YouTube' if youtube_service.is_youtube_url(value) else 'TikTok'
                        return Response(
                            {'error': f'Ошибка при скачивании видео с {platform}: {str(e)}'},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
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
            
            # Формируем данные для передачи в Gemini
            source_item = {
                'type': source_type,
                'value': value,
                'label': label
            }
            sources_list.append(source_item)
        
        # Запускаем анализ в фоне (можно использовать Celery для асинхронности)
        try:
            analysis.status = 'transcribing'
            analysis.save()
            
            gemini_service = GeminiService()
            analysis_result = gemini_service.analyze_content(sources_list)
            
            # Сохраняем результаты
            analysis.status = 'analyzing'
            analysis.save()
            
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
    
    @action(detail=True, methods=['post'])
    def generate_video_preview(self, request, pk=None):
        """Генерация видео через Kie.ai для предпросмотра сегментов"""
        script = self.get_object()
        segment_ids = request.data.get('segment_ids', [])  # Список ID сегментов для генерации
        model = request.data.get('model')  # 'sora-2-text-to-video' или 'grok-imagine/text-to-video'
        additional_notes = request.data.get('additional_notes', '')
        
        if not segment_ids:
            return Response(
                {'error': 'Не указаны ID сегментов'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if model not in ['sora-2-text-to-video', 'grok-imagine/text-to-video']:
            return Response(
                {'error': 'Неподдерживаемая модель'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            kie_service = KieService()
            segments = ScriptSegment.objects.filter(id__in=segment_ids, script=script)
            
            if not segments.exists():
                return Response(
                    {'error': 'Сегменты не найдены'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Формируем промпт из всех сегментов
            prompt_parts = []
            for segment in segments.order_by('order'):
                prompt_parts.append(
                    f"Таймлайн: {segment.timeframe}\n"
                    f"Визуальный план: {segment.visual}\n"
                    f"Текст автора: {segment.audio}"
                )
            
            prompt = "\n\n---\n\n".join(prompt_parts)

            print(f"Prompt: {prompt}")
            
            # Создаем задачу на генерацию видео
            # Для grok-imagine используем aspect_ratio 2:3 (вертикальный формат, portrait)
            # Для sora-2-text-to-video не передаем aspect_ratio
            aspect_ratio = "2:3" if model == 'grok-imagine/text-to-video' else None
            
            try:
                task_response = kie_service.create_video_task(
                    model=model,
                    prompt=prompt,
                    additional_notes=additional_notes,
                    aspect_ratio=aspect_ratio,
                    mode="normal"
                )
            except Exception as e:
                return Response(
                    {'error': f'Ошибка создания задачи в Kie.ai: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Проверяем ответ от Kie.ai
            if not task_response:
                return Response(
                    {'error': 'Пустой ответ от Kie.ai API'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            if not isinstance(task_response, dict):
                return Response(
                    {'error': f'Неверный формат ответа от Kie.ai: {type(task_response)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            data = task_response.get('data')
            if not data:
                return Response(
                    {'error': f'Не удалось получить data от Kie.ai. Ответ: {task_response}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            if not isinstance(data, dict):
                return Response(
                    {'error': f'Неверный формат data от Kie.ai: {type(data)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            task_id = data.get('taskId')
            if not task_id:
                return Response(
                    {'error': f'Не удалось получить taskId от Kie.ai. Ответ: {task_response}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Создаем или обновляем MediaFile для каждого сегмента
            created_media = []
            for segment in segments:
                media_file, created = MediaFile.objects.get_or_create(
                    segment=segment,
                    media_type='video',
                    defaults={
                        'status': 'generating_video',
                        'kie_task_id': task_id,
                        'kie_model': model
                    }
                )
                
                if not created:
                    # Обновляем существующий медиа файл
                    media_file.status = 'generating_video'
                    media_file.kie_task_id = task_id
                    media_file.kie_model = model
                    media_file.save()
                
                created_media.append(media_file)
            
            # Запускаем асинхронное ожидание завершения задачи
            # В продакшене лучше использовать Celery или другой task queue
            import threading
            
            def poll_and_update():
                try:
                    result = kie_service.poll_task_until_complete(task_id)
                    if result['status'] == 'success':
                        video_urls = result['result'].get('resultUrls', [])
                        if video_urls:
                            video_url = video_urls[0] if isinstance(video_urls, list) else video_urls
                            
                            # Обновляем все MediaFile для сегментов
                            for media_file in created_media:
                                media_file.status = 'done'
                                media_file.external_url = video_url
                                media_file.save()
                except Exception as e:
                    # Обновляем статус на ошибку
                    for media_file in created_media:
                        media_file.status = 'error'
                        media_file.save()
                    print(f"Ошибка генерации видео: {str(e)}")
            
            # Запускаем в отдельном потоке
            thread = threading.Thread(target=poll_and_update)
            thread.daemon = True
            thread.start()
            
            return Response({
                'task_id': task_id,
                'status': 'generating',
                'message': 'Задача на генерацию видео создана'
            }, status=status.HTTP_202_ACCEPTED)
            
        except Exception as e:
            return Response(
                {'error': f'Ошибка генерации видео: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='video_task_status')
    def video_task_status(self, request):
        """Получение статуса задачи генерации видео"""
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {'error': 'Не указан task_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            kie_service = KieService()
            status_data = kie_service.get_task_status(task_id)
            data = status_data.get('data', {})
            state = data.get('state', 'waiting')
            
            result = {
                'state': state,
            }
            
            if state == 'success':
                result_json = data.get('resultJson', '{}')
                try:
                    result_data = json.loads(result_json) if isinstance(result_json, str) else result_json
                    result['resultUrls'] = result_data.get('resultUrls', [])
                except json.JSONDecodeError:
                    result['resultUrls'] = []
            elif state == 'fail':
                result['failMsg'] = data.get('failMsg', 'Неизвестная ошибка')
            
            return Response(result)
        except Exception as e:
            return Response(
                {'error': f'Ошибка получения статуса: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
