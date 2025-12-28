from django.contrib import admin
from .models import Analysis, AnalysisSource, Script, ScriptSegment, MediaFile


@admin.register(Analysis)
class AnalysisAdmin(admin.ModelAdmin):
    list_display = ['id', 'status', 'created_at', 'updated_at']
    list_filter = ['status', 'created_at']
    search_fields = ['id']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(AnalysisSource)
class AnalysisSourceAdmin(admin.ModelAdmin):
    list_display = ['id', 'analysis', 'source_type', 'label', 'created_at']
    list_filter = ['source_type', 'created_at']
    search_fields = ['label', 'url']


@admin.register(Script)
class ScriptAdmin(admin.ModelAdmin):
    list_display = ['id', 'analysis', 'topic', 'created_at']
    list_filter = ['created_at']
    search_fields = ['topic']


@admin.register(ScriptSegment)
class ScriptSegmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'script', 'timeframe', 'order', 'created_at']
    list_filter = ['created_at']
    search_fields = ['timeframe', 'visual', 'audio']


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    list_display = ['id', 'segment', 'media_type', 'status', 'created_at']
    list_filter = ['media_type', 'status', 'created_at']
    search_fields = ['segment__timeframe']
