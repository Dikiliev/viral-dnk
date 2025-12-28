import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnalysisResult, ScriptSegment } from '../types';
import { getAnalysis } from '../api';
import { generateMediaForSegment } from '../api';

const ScriptsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number | null>(null);
  
  // Все хуки должны быть на верхнем уровне, до условных возвратов
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

  if (loading) {
    return <div className="text-center py-20">Загрузка...</div>;
  }

  if (!analysis) {
    return <div className="text-center py-20">Анализ не найден</div>;
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
      // Перезагружаем анализ для получения обновленных данных
      const updated = await getAnalysis(analysis.id);
      setAnalysis(updated);
    } catch (error) {
      console.error(error);
      alert('Ошибка генерации медиа: ' + (error as Error).message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 space-y-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate(`/results/${id}`)}
            className="text-sm font-bold text-slate-500 hover:text-brand-600 transition-colors mb-4"
          >
            ← Назад к результатам
          </button>
          <h2 className="text-4xl font-[900] tracking-tight text-slate-900 dark:text-white">Все сценарии</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">
            {scripts.length} сценариев для этого анализа
          </p>
        </div>
        <button
          onClick={() => navigate(`/generate/${id}`)}
          className="bg-brand-600 text-white px-6 py-3 rounded-[16px] font-bold hover:bg-brand-700 transition-all"
        >
          + Новый сценарий
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
            className="bg-brand-600 text-white px-8 py-3 rounded-[16px] font-bold hover:bg-brand-700 transition-all"
          >
            Создать сценарий
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Список сценариев */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Список сценариев</h3>
            {scripts.map((script, idx) => (
              <div
                key={script.scriptId || idx}
                onClick={() => setSelectedScriptIndex(idx)}
                className={`glass p-6 rounded-[24px] cursor-pointer transition-all ${
                  selectedScriptIndex === idx
                    ? 'border-2 border-brand-500 bg-brand-500/5'
                    : 'hover:border-brand-500/40 hover:translate-y-[-2px]'
                }`}
              >
                <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {script.topic}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {script.content?.length || 0} сегментов
                </p>
              </div>
            ))}
          </div>

          {/* Выбранный сценарий */}
          <div className="lg:col-span-2">
            {selectedScript ? (
              <div className="space-y-12">
                <div className="glass p-6 rounded-[24px]">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {selectedScript.topic}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {selectedScript.content?.length || 0} сегментов
                  </p>
                </div>

                <div className="relative space-y-12">
                  <div className="absolute left-[39px] top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

                  {selectedScript.content?.map((segment, i) => {
                    const status = segment.media?.status || 'idle';
                    const isLoading = status.startsWith('generating');
                    const key = `${selectedScriptIndex}-${i}`;

                    return (
                      <div key={segment.id || i} className="flex gap-8 items-start group">
                        <div className="w-20 shrink-0 flex flex-col items-center pt-2">
                          <div className="relative z-10 w-4 h-4 rounded-full bg-white dark:bg-brand-dark border-2 border-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                          <div className="mono text-[10px] font-bold text-slate-400 mt-3">{segment.timeframe}</div>
                        </div>

                        <div className="flex-1 space-y-6">
                          <div className="glass p-8 rounded-[32px] hover:border-brand-500/30 transition-all duration-500 group-hover:translate-x-1">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
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

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                              {status === 'idle' && (
                                <button 
                                  onClick={() => handleRenderScene(selectedScriptIndex!, i, segment)}
                                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-[14px] text-xs font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20"
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
                                <div className="flex flex-col md:flex-row gap-8 items-center bg-slate-50 dark:bg-white/5 p-6 rounded-[24px]">
                                  <div className="w-full md:w-32 aspect-[9/16] bg-black rounded-[18px] overflow-hidden relative group/player shadow-xl shrink-0">
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
                                  
                                  <div className="flex-1 space-y-4">
                                    <div>
                                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">Сцена готова</h4>
                                      <p className="text-xs text-slate-500 font-medium">Контент сгенерирован ИИ-моделями VEO 3.1 и Gemini TTS.</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => playScene(selectedScriptIndex!, i)} className="px-6 py-2 bg-brand-600 text-white rounded-[12px] text-xs font-bold">Смотреть</button>
                                      <a href={segment.media!.videoUrl} download className="px-6 py-2 glass rounded-[12px] text-xs font-bold text-slate-500">MP4</a>
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
              <div className="glass rounded-[32px] p-12 text-center">
                <div className="text-5xl mb-4 opacity-20">👈</div>
                <p className="text-slate-500 font-medium">Выберите сценарий из списка для просмотра</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptsPage;

