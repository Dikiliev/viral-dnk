import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult, ScriptSegment } from '../types';
import { generateScript } from '../gemini';
import { generateVideoPreview, getAnalysis } from '../api';
import VideoPreviewModal from './VideoPreviewModal';

const GeneratorPage: React.FC<{ analysis: AnalysisResult; onUpdate: (updated: AnalysisResult) => void }> = ({ analysis, onUpdate }) => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScript, setCurrentScript] = useState<{ scriptId: string; segments: ScriptSegment[] } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<ScriptSegment | null>(null);

  const videoRefs = useRef<{[key: number]: HTMLVideoElement | null}>({});
  const audioRefs = useRef<{[key: number]: HTMLAudioElement | null}>({});

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const { scriptId, segments } = await generateScript(topic, analysis.id);
      
      setCurrentScript({ scriptId, segments });
      
      const updated: AnalysisResult = {
        ...analysis,
        generatedScripts: [{ scriptId, topic, content: segments }, ...(analysis.generatedScripts || [])]
      };
      onUpdate(updated);
      
      setTopic('');
    } catch (e) {
      console.error(e);
      alert('Ошибка генерации сценария: ' + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Обработчик клика на кнопку предпросмотра - открывает модальное окно
  const handlePreviewClick = (segment: ScriptSegment) => {
    if (!currentScript?.scriptId || !segment.id) return;
    setPreviewSegment(segment);
    setPreviewModalOpen(true);
  };

  // Получаем информацию о сгенерированном видео для текущего сегмента
  const getPreviewVideoInfo = () => {
    if (!previewSegment?.media) return null;
    
    const media = previewSegment.media;
    
    if (media.status === 'done' && media.videoUrl) {
      return {
        videoUrl: media.videoUrl,
        taskId: media.kieTaskId || undefined
      };
    }
    
    if (media.status === 'generating_video' && media.kieTaskId) {
      return {
        videoUrl: undefined,
        taskId: media.kieTaskId
      };
    }
    
    return null;
  };

  // Обновление данных после генерации видео
  const refreshScript = async () => {
    if (!currentScript || !analysis.id) return;
    
    try {
      // Загружаем свежие данные с сервера
      const updatedAnalysis = await getAnalysis(analysis.id);
      
      // Обновляем analysis через onUpdate
      onUpdate(updatedAnalysis);
      
      // Обновляем currentScript из обновленного analysis
      const scriptInAnalysis = updatedAnalysis.generatedScripts?.find(s => s.scriptId === currentScript.scriptId);
      if (scriptInAnalysis) {
        setCurrentScript({
          scriptId: currentScript.scriptId,
          segments: scriptInAnalysis.content || []
        });
      }
    } catch (error) {
      console.error('Ошибка обновления сценария:', error);
    }
  };

  // Открытие модального окна для просмотра существующего видео
  const handleViewVideo = (segment: ScriptSegment) => {
    if (!currentScript?.scriptId || !segment.id) return;
    setPreviewSegment(segment);
    setPreviewModalOpen(true);
  };

  const playScene = (index: number) => {
    const v = videoRefs.current[index];
    const a = audioRefs.current[index];
    if (v) { v.currentTime = 0; v.play(); }
    if (a) { a.currentTime = 0; a.play(); }
  };

  const allScripts = analysis.generatedScripts || [];
  const hasScripts = allScripts.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16 py-6 sm:py-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-6 sm:space-y-8">
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-[900] tracking-tight text-slate-900 dark:text-white">Сценарий</h2>
          <p className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">Neural Content Studio</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleGenerate} className="max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-2 p-2 glass rounded-[20px] sm:rounded-[24px] hover:border-brand-500/30 transition-all focus-within:border-brand-500/50">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="О чем будет ваш новый ролик?" 
              className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-base sm:text-lg font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent border-none outline-none focus:outline-none focus:ring-0"
              disabled={isGenerating}
            />
            <button 
              type="submit"
              disabled={isGenerating || !topic.trim()}
              className="bg-brand-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-[14px] sm:rounded-[16px] font-bold hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Создание...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Создать</span>
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* Loading State */}
        {isGenerating && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="glass rounded-[24px] p-8 text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                <span className="typing-animation">Пишем сценарий</span>
                <span className="typing-dots inline-block w-6 text-left"></span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                ИИ анализирует ДНК успеха и создает уникальный контент. Это может занять несколько минут.
              </p>
            </div>
          </div>
        )}

        {/* View All Scripts Button */}
        {hasScripts && !currentScript && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => navigate(`/scripts/${analysis.id}`)}
              className="w-full glass p-6 rounded-[24px] hover:border-brand-500/40 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-brand-600/10 dark:bg-brand-500/20 flex items-center justify-center text-xl">
                  📚
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors">
                    Все сценарии ({allScripts.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Просмотреть и редактировать созданные сценарии
                  </p>
                </div>
              </div>
              <span className="text-brand-600 group-hover:translate-x-1 transition-transform text-xl">→</span>
            </button>
          </div>
        )}
      </div>

      {/* Current Script */}
      {currentScript && (
        <div className="relative space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Timeline Backbone */}
          <div className="absolute left-[29px] sm:left-[39px] top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

          {currentScript.segments.map((segment, i) => {
            const status = segment.media?.status || 'idle';
            const isLoading = status.startsWith('generating');

            return (
              <div key={segment.id || i} className="flex gap-4 sm:gap-8 items-start group">
                {/* Timeline Column */}
                <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center pt-2">
                  <div className="relative z-10 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white dark:bg-brand-dark border-2 border-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                  <div className="mono text-[9px] sm:text-[10px] font-bold text-slate-400 mt-2 sm:mt-3">{segment.timeframe}</div>
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-4 sm:space-y-6">
                  <div className="glass p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] hover:border-brand-500/30 transition-all duration-500 group-hover:translate-x-1">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                      <div className="lg:col-span-4 space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Визуальный план</span>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                          {segment.visual}
                        </p>
                      </div>
                      <div className="lg:col-span-8 space-y-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Текст автора</span>
                        <p className="text-2xl font-[800] text-slate-900 dark:text-white leading-snug">
                          {segment.audio}
                        </p>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                      {/* Кнопка предпросмотра для генерации видео */}
                      {(status === 'idle' || status === 'generating_image' || status === 'generating_audio' || status === 'error') && (
                        <button 
                          onClick={() => handlePreviewClick(segment)}
                          className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-brand-600 text-white rounded-[12px] sm:rounded-[14px] text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95"
                        >
                          🎬 Предпросмотр
                        </button>
                      )}

                      {/* Статус генерации видео */}
                      {status === 'generating_video' && (
                        <div className="flex items-center gap-4 py-2">
                          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 animate-pulse">
                            Анимируем...
                          </span>
                        </div>
                      )}

                      {/* Отображение сгенерированного видео */}
                      {status === 'done' && segment.media && segment.media.videoUrl && (
                        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center bg-slate-50 dark:bg-white/5 p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-200 dark:border-white/10">
                          <div className="w-full md:w-32 aspect-[9/16] bg-black rounded-[16px] sm:rounded-[18px] overflow-hidden relative group/player shadow-xl shrink-0">
                            <video 
                              ref={el => { videoRefs.current[i] = el }}
                              src={segment.media.videoUrl} 
                              className="w-full h-full object-cover"
                              loop muted playsInline
                            />
                            <audio ref={el => { audioRefs.current[i] = el }} src={segment.media.audioUrl} />
                            <button 
                              onClick={() => playScene(i)}
                              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/player:opacity-100 transition-all"
                            >
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center pl-0.5 shadow-xl">
                                <span className="text-black text-xs">▶</span>
                              </div>
                            </button>
                          </div>
                          
                          <div className="flex-1 space-y-4 w-full">
                            <div>
                              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Сцена готова</h4>
                              <p className="text-xs text-slate-500 font-medium">Контент сгенерирован ИИ-моделями VEO 3.1 и Gemini TTS.</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleViewVideo(segment)} className="px-5 sm:px-6 py-2 bg-brand-600 text-white rounded-[10px] sm:rounded-[12px] text-xs font-bold hover:bg-brand-700 transition-all">Смотреть</button>
                              <a href={segment.media.videoUrl} download className="px-5 sm:px-6 py-2 glass rounded-[10px] sm:rounded-[12px] text-xs font-bold text-slate-500 hover:border-brand-500/30 transition-all border border-slate-200 dark:border-white/10">MP4</a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!currentScript && !hasScripts && (
        <div className="text-center py-20 animate-in fade-in duration-500">
          <div className="text-6xl mb-6 opacity-20">📝</div>
          <h3 className="text-2xl font-bold text-slate-400 mb-2">Создайте первый сценарий</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Введите тему для нового ролика и нажмите "Создать" для генерации сценария на основе ДНК успеха
          </p>
        </div>
      )}

      {/* Модальное окно для генерации видео */}
      {previewModalOpen && currentScript && previewSegment && (
        <VideoPreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          scriptId={currentScript.scriptId}
          segmentIds={[previewSegment.id!].filter(Boolean)}
          segments={[{
            timeframe: previewSegment.timeframe,
            visual: previewSegment.visual,
            audio: previewSegment.audio
          }]}
          existingVideoUrl={getPreviewVideoInfo()?.videoUrl}
          existingTaskId={getPreviewVideoInfo()?.taskId}
          onVideoGenerated={refreshScript}
        />
      )}
    </div>
  );
};

export default GeneratorPage;
