import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnalysisResult, ScriptSegment } from '../types';
import { getAnalysis } from '../api';
import { generateMediaForSegment } from '../api';
import LoadingSpinner from './LoadingSpinner';

const ScriptsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number | null>(null);
  
  const videoRefs = useRef<{[key: string]: HTMLVideoElement | null}>({});
  const audioRefs = useRef<{[key: string]: HTMLAudioElement | null}>({});

  useEffect(() => {
    if (id) {
      getAnalysis(id)
        .then(setAnalysis)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  useEffect(() => {
    if (analysis?.generatedScripts && analysis.generatedScripts.length > 0 && selectedScriptIndex === null) {
      setSelectedScriptIndex(0);
    }
  }, [analysis, selectedScriptIndex]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Загрузка сценариев..." />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4 opacity-20">⚠️</div>
        <h3 className="text-2xl font-bold text-slate-400 mb-2">Анализ не найден</h3>
        <button
          onClick={() => navigate('/history')}
          className="mt-4 text-brand-600 hover:text-brand-700 font-bold"
        >
          Вернуться к истории
        </button>
      </div>
    );
  }

  const scripts = analysis.generatedScripts || [];
  const selectedScript = selectedScriptIndex !== null ? scripts[selectedScriptIndex] : null;

  const playScene = (scriptIndex: number, segmentIndex: number) => {
    const key = `${scriptIndex}-${segmentIndex}`;
    const v = videoRefs.current[key];
    const a = audioRefs.current[key];
    if (v) { v.currentTime = 0; v.play(); }
    if (a) { a.currentTime = 0; a.play(); }
  };

  const handleRenderScene = async (scriptIndex: number, segmentIndex: number, segment: ScriptSegment) => {
    const script = scripts[scriptIndex];
    if (!script?.scriptId || !segment.id) {
      alert('Ошибка: отсутствует ID сценария или сегмента');
      return;
    }

    try {
      await generateMediaForSegment(script.scriptId, segment.id);
      const updated = await getAnalysis(analysis.id);
      setAnalysis(updated);
    } catch (error) {
      console.error(error);
      alert('Ошибка генерации медиа: ' + (error as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
        <div>
          <button
            onClick={() => navigate(`/results/${id}`)}
            className="text-xs sm:text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors mb-3 sm:mb-4 flex items-center gap-2 group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span>
            <span>Назад к результатам</span>
          </button>
          <h2 className="text-3xl sm:text-4xl font-[900] tracking-tight text-slate-900 dark:text-white">Все сценарии</h2>
          <p className="text-slate-500 font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.3em] mt-1 sm:mt-2">
            {scripts.length} {scripts.length === 1 ? 'сценарий' : scripts.length < 5 ? 'сценария' : 'сценариев'} для этого анализа
          </p>
        </div>
        <button
          onClick={() => navigate(`/generate/${id}`)}
          className="bg-brand-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-[14px] sm:rounded-[16px] font-bold hover:bg-brand-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm sm:text-base shrink-0"
        >
          <span>✨</span>
          <span>Новый сценарий</span>
        </button>
      </div>

      {scripts.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-6 opacity-20">📝</div>
          <h3 className="text-2xl font-bold text-slate-400 mb-2">Нет сценариев</h3>
          <p className="text-sm text-slate-500 mb-6">
            Создайте первый сценарий на основе этого анализа
          </p>
          <button
            onClick={() => navigate(`/generate/${id}`)}
            className="bg-brand-600 text-white px-8 py-3 rounded-[16px] font-bold hover:bg-brand-700 transition-all hover:scale-105 active:scale-95"
          >
            Создать сценарий
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: Horizontal Scroll Scripts List */}
          <div className="lg:hidden">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-base font-bold text-slate-900 dark:text-white">📚</span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Список сценариев</h3>
              <span className="text-xs text-slate-400 ml-auto">({scripts.length})</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
              {scripts.map((script, idx) => (
                <button
                  key={script.scriptId || idx}
                  onClick={() => setSelectedScriptIndex(idx)}
                  className={`shrink-0 w-[280px] glass p-5 rounded-[20px] transition-all text-left ${
                    selectedScriptIndex === idx
                      ? 'border-2 border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                      : 'border border-slate-200 dark:border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5'
                  }`}
                >
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 line-clamp-2">
                    {script.topic}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {script.content?.length || 0} {script.content?.length === 1 ? 'сегмент' : 'сегментов'}
                  </p>
                  {selectedScriptIndex === idx && (
                    <div className="mt-3 pt-3 border-t border-brand-500/20">
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Активен</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop & Mobile Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Desktop: Vertical Scripts List */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="glass rounded-[24px] p-5 border border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg">📚</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Список сценариев</h3>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pr-2">
                  {scripts.map((script, idx) => (
                    <button
                      key={script.scriptId || idx}
                      onClick={() => setSelectedScriptIndex(idx)}
                      className={`w-full glass p-4 rounded-[16px] transition-all text-left border ${
                        selectedScriptIndex === idx
                          ? 'border-brand-500 bg-brand-500/10 shadow-md shadow-brand-500/10'
                          : 'border-slate-200 dark:border-white/10 hover:border-brand-500/40 hover:bg-brand-500/5'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5 line-clamp-2">
                        {script.topic}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {script.content?.length || 0} {script.content?.length === 1 ? 'сегмент' : 'сегментов'}
                      </p>
                      {selectedScriptIndex === idx && (
                        <div className="mt-2 pt-2 border-t border-brand-500/20">
                          <span className="text-[9px] font-bold text-brand-600 uppercase tracking-widest">✓ Активен</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Selected Script Content */}
            <div className="lg:col-span-2">
              {selectedScript ? (
                <div className="space-y-8 sm:space-y-12 animate-in fade-in duration-300">
                  {/* Script Header */}
                  <div className="glass rounded-[24px] p-6 sm:p-8 border border-slate-200 dark:border-white/10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                          {selectedScript.topic}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {selectedScript.content?.length || 0} {selectedScript.content?.length === 1 ? 'сегмент' : 'сегментов'}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-brand-600/10 dark:bg-brand-500/20 flex items-center justify-center text-xl">
                          📝
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Script Content */}
                  <div className="relative space-y-8 sm:space-y-12">
                    <div className="absolute left-[29px] sm:left-[39px] top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

                    {selectedScript.content?.map((segment, i) => {
                      const status = segment.media?.status || 'idle';
                      const isLoading = status.startsWith('generating');
                      const key = `${selectedScriptIndex}-${i}`;

                      return (
                        <div key={segment.id || i} className="flex gap-4 sm:gap-8 items-start group">
                          <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center pt-2">
                            <div className="relative z-10 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white dark:bg-brand-dark border-2 border-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                            <div className="mono text-[9px] sm:text-[10px] font-bold text-slate-400 mt-2 sm:mt-3">{segment.timeframe}</div>
                          </div>

                          <div className="flex-1 space-y-4 sm:space-y-6">
                            <div className="glass p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-200 dark:border-white/10 hover:border-brand-500/30 transition-all duration-500 group-hover:translate-x-1">
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
                                <div className="lg:col-span-4 space-y-4">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Визуальный план</span>
                                  <p className="text-sm font-medium text-slate-500 leading-relaxed italic">
                                    {segment.visual}
                                  </p>
                                </div>
                                <div className="lg:col-span-8 space-y-4">
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Текст автора</span>
                                  <p className="text-xl sm:text-2xl font-[800] text-slate-900 dark:text-white leading-snug">
                                    {segment.audio}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-6 sm:mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                                {status === 'idle' && (
                                  <button 
                                    onClick={() => handleRenderScene(selectedScriptIndex!, i, segment)}
                                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 bg-brand-600 text-white rounded-[12px] sm:rounded-[14px] text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 hover:scale-105 active:scale-95"
                                  >
                                    🎬 Предпросмотр
                                  </button>
                                )}

                                {isLoading && (
                                  <div className="flex items-center gap-4 py-2">
                                    <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500 animate-pulse">
                                      {status === 'generating_image' && "Рисуем..."}
                                      {status === 'generating_video' && "Анимируем..."}
                                      {status === 'generating_audio' && "Озвучиваем..."}
                                    </span>
                                  </div>
                                )}

                                {status === 'done' && segment.media && (
                                  <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-center bg-slate-50 dark:bg-white/5 p-5 sm:p-6 rounded-[20px] sm:rounded-[24px] border border-slate-200 dark:border-white/10">
                                    <div className="w-full md:w-32 aspect-[9/16] bg-black rounded-[16px] sm:rounded-[18px] overflow-hidden relative group/player shadow-xl shrink-0">
                                      <video 
                                        ref={el => { videoRefs.current[key] = el }}
                                        src={segment.media!.videoUrl} 
                                        className="w-full h-full object-cover"
                                        loop muted playsInline
                                      />
                                      <audio ref={el => { audioRefs.current[key] = el }} src={segment.media!.audioUrl} />
                                      <button 
                                        onClick={() => playScene(selectedScriptIndex!, i)}
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
                                        <button onClick={() => playScene(selectedScriptIndex!, i)} className="px-5 sm:px-6 py-2 bg-brand-600 text-white rounded-[10px] sm:rounded-[12px] text-xs font-bold hover:bg-brand-700 transition-all">Смотреть</button>
                                        <a href={segment.media!.videoUrl} download className="px-5 sm:px-6 py-2 glass rounded-[10px] sm:rounded-[12px] text-xs font-bold text-slate-500 hover:border-brand-500/30 transition-all border border-slate-200 dark:border-white/10">MP4</a>
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
                </div>
              ) : (
                <div className="glass rounded-[24px] sm:rounded-[32px] p-12 text-center border border-slate-200 dark:border-white/10">
                  <div className="text-5xl mb-4 opacity-20">👈</div>
                  <p className="text-slate-500 font-medium">Выберите сценарий из списка для просмотра</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScriptsPage;
