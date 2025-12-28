from rest_framework import serializers
from .models import Analysis, AnalysisSource, Script, ScriptSegment, MediaFile


class AnalysisSourceSerializer(serializers.ModelSerializer):
    """Сериализатор для источников анализа"""
    class Meta:
        model = AnalysisSource
        fields = ['id', 'source_type', 'label', 'url', 'file', 'file_mime_type', 'created_at']
        read_only_fields = ['id', 'created_at']


class MediaFileSerializer(serializers.ModelSerializer):
    """Сериализатор для медиа файлов"""
    image_url = serializers.SerializerMethodField()
    video_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaFile
        fields = [
            'id', 'media_type', 'status', 'image_file', 'video_file', 'audio_file',
            'external_url', 'image_url', 'video_url', 'audio_url', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_file.url)
            return obj.image_file.url
        return None
    
    def get_video_url(self, obj):
        if obj.video_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.video_file.url)
            return obj.video_file.url
        if obj.external_url and obj.media_type == 'video':
            return obj.external_url
        return None
    
    def get_audio_url(self, obj):
        if obj.audio_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.audio_file.url)
            return obj.audio_file.url
        if obj.external_url and obj.media_type == 'audio':
            return obj.external_url
        return None


class ScriptSegmentSerializer(serializers.ModelSerializer):
    """Сериализатор для сегментов сценария"""
    media = serializers.SerializerMethodField()
    
    class Meta:
        model = ScriptSegment
        fields = ['id', 'timeframe', 'visual', 'audio', 'order', 'media', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_media(self, obj):
        """Возвращает медиа в формате, совместимом с фронтендом"""
        media_files = obj.media_files.all()
        if not media_files.exists():
            return {'status': 'idle'}
        
        # Находим последний медиа файл (самый актуальный статус)
        latest_media = media_files.order_by('-updated_at').first()
        
        result = {
            'status': latest_media.status,
        }
        
        # Добавляем URL в зависимости от типа
        if latest_media.image_file:
            request = self.context.get('request')
            if request:
                result['imageUrl'] = request.build_absolute_uri(latest_media.image_file.url)
            else:
                result['imageUrl'] = latest_media.image_file.url
        
        if latest_media.video_file or (latest_media.external_url and latest_media.media_type == 'video'):
            if latest_media.video_file:
                request = self.context.get('request')
                if request:
                    result['videoUrl'] = request.build_absolute_uri(latest_media.video_file.url)
                else:
                    result['videoUrl'] = latest_media.video_file.url
            else:
                result['videoUrl'] = latest_media.external_url
        
        if latest_media.audio_file or (latest_media.external_url and latest_media.media_type == 'audio'):
            if latest_media.audio_file:
                request = self.context.get('request')
                if request:
                    result['audioUrl'] = request.build_absolute_uri(latest_media.audio_file.url)
                else:
                    result['audioUrl'] = latest_media.audio_file.url
            else:
                result['audioUrl'] = latest_media.external_url
        
        return result


class ScriptSerializer(serializers.ModelSerializer):
    """Сериализатор для сценария"""
    segments = ScriptSegmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Script
        fields = ['id', 'topic', 'segments', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnalysisSerializer(serializers.ModelSerializer):
    """Сериализатор для анализа"""
    sources = AnalysisSourceSerializer(many=True, read_only=True)
    scripts = ScriptSerializer(many=True, read_only=True)
    
    class Meta:
        model = Analysis
        fields = [
            'id', 'status', 'transcript', 'style_passport', 'patterns', 
            'grounding_sources', 'sources', 'scripts', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnalysisCreateSerializer(serializers.Serializer):
    """Сериализатор для создания анализа"""
    sources = serializers.ListField(
        child=serializers.DictField(),
        help_text="Список источников: [{'type': 'url', 'value': '...', 'label': '...'}, ...]"
    )


class ScriptCreateSerializer(serializers.Serializer):
    """Сериализатор для создания сценария"""
    analysis_id = serializers.UUIDField()
    topic = serializers.CharField(max_length=500)


class ScriptSegmentCreateSerializer(serializers.Serializer):
    """Сериализатор для создания сегментов сценария"""
    script_id = serializers.UUIDField()
    segments = serializers.ListField(
        child=serializers.DictField(),
        help_text="Список сегментов: [{'timeframe': '...', 'visual': '...', 'audio': '...'}, ...]"
    )
