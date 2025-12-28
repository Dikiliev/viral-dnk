from django.db import models
from django.contrib.postgres.fields import ArrayField, JSONField
import uuid


class Analysis(models.Model):
    """Модель для хранения результатов анализа ДНК успеха"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Статус анализа
    STATUS_CHOICES = [
        ('idle', 'IDLE'),
        ('processing', 'PROCESSING'),
        ('downloading', 'DOWNLOADING'),
        ('transcribing', 'TRANSCRIBING'),
        ('analyzing', 'ANALYZING'),
        ('ready', 'READY'),
        ('error', 'ERROR'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    
    # Результаты анализа
    transcript = models.JSONField(default=list, blank=True)  # TranscriptSegment[]
    style_passport = models.JSONField(default=dict, blank=True)  # StylePassport
    patterns = models.JSONField(default=list, blank=True)  # ContentPattern[]
    grounding_sources = models.JSONField(default=list, blank=True)  # GroundingSource[]
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Анализ'
        verbose_name_plural = 'Анализы'

    def __str__(self):
        return f"Analysis {self.id} - {self.status}"


class AnalysisSource(models.Model):
    """Источники для анализа (URL или файлы)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.ForeignKey(Analysis, related_name='sources', on_delete=models.CASCADE)
    
    SOURCE_TYPE_CHOICES = [
        ('url', 'URL'),
        ('file', 'FILE'),
    ]
    source_type = models.CharField(max_length=10, choices=SOURCE_TYPE_CHOICES)
    label = models.CharField(max_length=500)
    
    # Для URL
    url = models.URLField(max_length=2000, blank=True, null=True)
    
    # Для файлов
    file = models.FileField(upload_to='analysis_sources/', blank=True, null=True)
    file_mime_type = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Источник анализа'
        verbose_name_plural = 'Источники анализа'

    def __str__(self):
        return f"{self.source_type}: {self.label}"


class Script(models.Model):
    """Сценарий, созданный на основе анализа"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    analysis = models.ForeignKey(Analysis, related_name='scripts', on_delete=models.CASCADE)
    topic = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Сценарий'
        verbose_name_plural = 'Сценарии'

    def __str__(self):
        return f"Script: {self.topic}"


class ScriptSegment(models.Model):
    """Сегмент сценария"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    script = models.ForeignKey(Script, related_name='segments', on_delete=models.CASCADE)
    
    timeframe = models.CharField(max_length=50)
    visual = models.TextField()  # Визуальный план
    audio = models.TextField()  # Текст автора
    
    # Порядок сегмента в сценарии
    order = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = 'Сегмент сценария'
        verbose_name_plural = 'Сегменты сценария'

    def __str__(self):
        return f"Segment {self.order}: {self.timeframe}"


class MediaFile(models.Model):
    """Медиа файлы для сегментов сценария"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    segment = models.ForeignKey(ScriptSegment, related_name='media_files', on_delete=models.CASCADE)
    
    MEDIA_TYPE_CHOICES = [
        ('image', 'IMAGE'),
        ('video', 'VIDEO'),
        ('audio', 'AUDIO'),
    ]
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPE_CHOICES)
    
    STATUS_CHOICES = [
        ('idle', 'IDLE'),
        ('generating_image', 'GENERATING_IMAGE'),
        ('generating_video', 'GENERATING_VIDEO'),
        ('generating_audio', 'GENERATING_AUDIO'),
        ('done', 'DONE'),
        ('error', 'ERROR'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='idle')
    
    # Файлы
    image_file = models.ImageField(upload_to='media/images/', blank=True, null=True)
    video_file = models.FileField(upload_to='media/videos/', blank=True, null=True)
    audio_file = models.FileField(upload_to='media/audio/', blank=True, null=True)
    
    # URL для внешних ресурсов (например, сгенерированных через API)
    external_url = models.URLField(max_length=2000, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['created_at']
        verbose_name = 'Медиа файл'
        verbose_name_plural = 'Медиа файлы'

    def __str__(self):
        return f"{self.media_type} for segment {self.segment.id} - {self.status}"
