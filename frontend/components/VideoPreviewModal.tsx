import React, { useState, useEffect } from 'react';
import { generateVideoPreview, getVideoTaskStatus } from '../api';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  scriptId: string;
  segmentIds: string[];
  segments: Array<{ timeframe: string; visual: string; audio: string }>;
  existingVideoUrl?: string;
  existingTaskId?: string;
  onVideoGenerated?: () => void; // Callback для обновления данных после генерации
}

const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  isOpen,
  onClose,
  scriptId,
  segmentIds,
  segments,
  existingVideoUrl,
  existingTaskId,
  onVideoGenerated
}) => {
  const [selectedModel, setSelectedModel] = useState<string>('grok-imagine/text-to-video');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [taskId, setTaskId] = useState<string | null>(existingTaskId || null);
  const [videoUrl, setVideoUrl] = useState<string | null>(existingVideoUrl || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // При открытии модального окна проверяем, есть ли уже готовое видео
    if (isOpen) {
      if (existingVideoUrl) {
        setVideoUrl(existingVideoUrl);
        setGenerationStatus('success');
        setIsGenerating(false);
        setTaskId(existingTaskId || null);
      } else if (existingTaskId) {
        // Если есть taskId, но нет видео, проверяем статус задачи
        setTaskId(existingTaskId);
        setGenerationStatus('generating');
        setIsGenerating(true);
        checkTaskStatus(existingTaskId);
      } else {
        // Если нет ни видео, ни taskId, сбрасываем состояние
        setGenerationStatus('idle');
        setVideoUrl(null);
        setTaskId(null);
        setIsGenerating(false);
      }
    }
  }, [existingVideoUrl, existingTaskId, isOpen]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isGenerating && taskId && generationStatus === 'generating') {
      intervalId = setInterval(() => {
        checkTaskStatus(taskId);
      }, 5000); // Проверяем каждые 5 секунд
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isGenerating, taskId, generationStatus]);

  const checkTaskStatus = async (currentTaskId: string) => {
    try {
      const status = await getVideoTaskStatus(currentTaskId);
      
      if (status.state === 'success') {
        const urls = status.resultUrls || [];
        if (urls.length > 0) {
          setVideoUrl(urls[0]);
          setGenerationStatus('success');
          setIsGenerating(false);
          setStatusMessage('Видео успешно сгенерировано!');
          // Вызываем callback для обновления данных на странице
          if (onVideoGenerated) {
            setTimeout(() => {
              onVideoGenerated();
            }, 1000);
          }
        }
      } else if (status.state === 'fail') {
        setGenerationStatus('error');
        setIsGenerating(false);
        setErrorMessage(status.failMsg || 'Ошибка генерации видео');
      } else {
        // waiting, queuing, generating
        const statusMessages: { [key: string]: string } = {
          'waiting': 'Ожидание в очереди...',
          'queuing': 'В очереди...',
          'generating': 'Генерация видео...'
        };
        setStatusMessage(statusMessages[status.state] || 'Обработка...');
        setGenerationStatus('generating');
      }
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      setGenerationStatus('error');
      setIsGenerating(false);
      setErrorMessage('Ошибка проверки статуса задачи');
    }
  };

  const handleSubmit = async () => {
    if (!selectedModel || segmentIds.length === 0) return;
    
    setIsGenerating(true);
    setGenerationStatus('generating');
    setErrorMessage(null);
    setStatusMessage('Создание задачи на генерацию...');
    
    try {
      // Отправляем только первый сегмент (каждый сегмент генерирует свое отдельное видео)
      const result = await generateVideoPreview(
        scriptId,
        [segmentIds[0]], // Передаем только один сегмент
        selectedModel,
        additionalNotes
      );
      
      setTaskId(result.task_id);
      setStatusMessage('Задача создана. Ожидание генерации...');
      
      // Начинаем проверку статуса
      checkTaskStatus(result.task_id);
      
      // Обновляем данные через некоторое время, чтобы получить обновленный taskId
      if (onVideoGenerated) {
        setTimeout(() => {
          onVideoGenerated();
        }, 2000);
      }
      
    } catch (error) {
      setIsGenerating(false);
      setGenerationStatus('error');
      setErrorMessage((error as Error).message || 'Ошибка генерации видео');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-[32px] p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto border border-slate-200 dark:border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Генерация предпросмотра видео
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            disabled={isGenerating}
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Показываем видео если оно уже сгенерировано */}
        {generationStatus === 'success' && videoUrl && (
          <div className="mb-6 space-y-4">
            <div className="bg-black rounded-[20px] overflow-hidden max-h-[60vh] flex items-center justify-center">
              <video
                src={videoUrl}
                controls
                className="max-w-full max-h-[60vh] object-contain"
                autoPlay
                loop
              />
            </div>
            <div className="flex gap-4">
              <a
                href={videoUrl}
                download
                className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-[16px] font-bold hover:bg-brand-700 transition-all text-center"
              >
                Скачать видео
              </a>
              <button
                onClick={() => {
                  setGenerationStatus('idle');
                  setVideoUrl(null);
                }}
                className="flex-1 px-6 py-3 glass rounded-[16px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
              >
                Сгенерировать заново
              </button>
            </div>
          </div>
        )}

        {/* Показываем форму только если видео не сгенерировано или пользователь хочет сгенерировать заново */}
        {(generationStatus === 'idle' || generationStatus === 'generating' || generationStatus === 'error') && (
          <div className="space-y-6">
            {/* Выбор модели */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-widest">
                Выберите модель
              </label>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => setSelectedModel('grok-imagine/text-to-video')}
                  disabled={isGenerating}
                  className={`p-4 rounded-[20px] border-2 text-left transition-all ${
                    selectedModel === 'grok-imagine/text-to-video'
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-brand-500/40'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Grok Imagine - Text to Video
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Генерация видео с использованием Grok AI
                      </div>
                    </div>
                    {selectedModel === 'grok-imagine/text-to-video' && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setSelectedModel('sora-2-text-to-video')}
                  disabled={isGenerating}
                  className={`p-4 rounded-[20px] border-2 text-left transition-all ${
                    selectedModel === 'sora-2-text-to-video'
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-slate-200 dark:border-white/10 hover:border-brand-500/40'
                  } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white mb-1">
                        Sora 2 - Text to Video
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Высококачественная генерация видео из текста
                      </div>
                    </div>
                    {selectedModel === 'sora-2-text-to-video' && (
                      <div className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Дополнительные пожелания */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-widest">
                Дополнительные пожелания (необязательно)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                disabled={isGenerating}
                placeholder="Например: более динамичная анимация, яркие цвета, плавные переходы..."
                className="w-full p-4 rounded-[16px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={4}
              />
            </div>

            {/* Статус генерации */}
            {(isGenerating || generationStatus === 'generating') && (
              <div className="p-6 rounded-[20px] bg-brand-500/10 border border-brand-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 dark:text-white mb-1">
                      Генерация видео...
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {statusMessage || 'Обработка запроса...'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Ошибка */}
            {generationStatus === 'error' && errorMessage && (
              <div className="p-6 rounded-[20px] bg-red-500/10 border border-red-500/20">
                <div className="font-bold text-red-600 dark:text-red-400 mb-1">
                  Ошибка генерации
                </div>
                <div className="text-sm text-red-500 dark:text-red-400">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                disabled={isGenerating}
                className="flex-1 px-6 py-3 glass rounded-[16px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
              >
                {videoUrl ? 'Закрыть' : 'Отмена'}
              </button>
              {(generationStatus === 'idle' || generationStatus === 'generating' || generationStatus === 'error') && (
                <button
                  onClick={handleSubmit}
                  disabled={isGenerating || !selectedModel}
                  className="flex-1 px-6 py-3 bg-brand-600 text-white rounded-[16px] font-bold hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Генерация...</span>
                    </>
                  ) : (
                    <>
                      <span>🎬</span>
                      <span>Сгенерировать видео</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPreviewModal;
