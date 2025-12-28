
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ScriptSegment } from '../types';
import { generateScript } from '../gemini';
import { generateMediaForSegment } from '../api';

const GeneratorPage: React.FC<{ analysis: AnalysisResult; onUpdate: (updated: AnalysisResult) => void }> = ({ analysis, onUpdate }) => {
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const firstScript = analysis.generatedScripts?.[0];
  const [script, setScript] = useState<ScriptSegment[] | null>(firstScript?.content || null);
  const [currentScriptId, setCurrentScriptId] = useState<string | null>(firstScript?.scriptId || null);
  
  // Если есть существующий сценарий, устанавливаем тему
  useEffect(() => {
    if (firstScript && !topic) {
      setTopic(firstScript.topic);
    }
  }, [firstScript, topic]);

  const videoRefs = useRef<{[key: number]: HTMLVideoElement | null}>({});
  const audioRefs = useRef<{[key: number]: HTMLAudioElement | null}>({});

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const { scriptId, segments } = await generateScript(topic, analysis.id);
      setScript(segments);
      setCurrentScriptId(scriptId);
      const updated: AnalysisResult = {
        ...analysis,
        generatedScripts: [{ scriptId, topic, content: segments }, ...(analysis.generatedScripts || [])]
      };
      onUpdate(updated);
    } catch (e) {
      console.error(e);
      alert('Ошибка генерации сценария: ' + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateMediaState = (index: number, status: ScriptSegment['media']['status'], data: Partial<ScriptSegment['media']> = {}) => {
    setScript(prev => {
      if (!prev) return null;
      const newScript = [...prev];
      const currentMedia = newScript[index].media || { status: 'idle' } as any;
      newScript[index] = { ...newScript[index], media: { ...currentMedia, status, ...data } };
      return newScript;
    });
  };

  const handleRenderScene = async (index: number, segment: ScriptSegment) => {
    if (!currentScriptId || !segment.id) {
      alert('Ошибка: отсутствует ID сценария или сегмента');
      return;
    }

    updateMediaState(index, 'generating_image');
    try {
      const updatedSegment = await generateMediaForSegment(currentScriptId, segment.id);
      
      // Обновляем сегмент с полученными данными
      setScript(prev => {
        if (!prev) return null;
        const newScript = [...prev];
        newScript[index] = {
          ...newScript[index],
          media: updatedSegment.media
        };
        return newScript;
      });

      // Обновляем analysis с новыми данными
      const updated: AnalysisResult = {
        ...analysis,
        generatedScripts: analysis.generatedScripts.map(s => {
          if (s.scriptId === currentScriptId) {
            return {
              ...s,
              content: script?.map((seg, i) => i === index ? {
                ...seg,
                media: updatedSegment.media
              } : seg) || []
            };
          }
          return s;
        })
      };
      onUpdate(updated);
    } catch (error) {
      console.error(error);
      updateMediaState(index, 'error');
      alert('Ошибка генерации медиа: ' + (error as Error).message);
    }
  };

  const playScene = (index: number) => {
    const v = videoRefs.current[index];
    const a = audioRefs.current[index];
    if (v) { v.currentTime = 0; v.play(); }
    if (a) { a.currentTime = 0; a.play(); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-8">
      {/* Header section */}
      <div className="text-center space-y-8">
        <div className="space-y-3">
          <h2 className="text-5xl font-[900] tracking-tight text-slate-900 dark:text-white">Сценарий</h2>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Neural Content Studio</p>
        </div>
        
        <form onSubmit={handleGenerate} className="max-w-2xl mx-auto flex flex-col md:flex-row gap-2 p-2 glass rounded-[24px]">
          <input 
            type="text" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="О чем будет ваш новый ролик?" 
            className="flex-1 px-6 py-3 text-lg font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-transparent border-none outline-none focus:outline-none focus:ring-0"
          />
          <button 
            disabled={isGenerating}
            className="bg-brand-600 text-white px-8 py-3 rounded-[16px] font-bold hover:bg-brand-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isGenerating ? 'Пишем...' : 'Создать'}
          </button>
        </form>
        
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
            </div>
          </div>
        )}
      </div>

      {script && (
        <div className="relative space-y-12">
          {/* Timeline Backbone */}
          <div className="absolute left-[39px] top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

          {script.map((segment, i) => {
            const status = segment.media?.status || 'idle';
            const isLoading = status.startsWith('generating');

            return (
              <div key={i} className="flex gap-8 items-start group">
                {/* Timeline Column */}
                <div className="w-20 shrink-0 flex flex-col items-center pt-2">
                  <div className="relative z-10 w-4 h-4 rounded-full bg-white dark:bg-brand-dark border-2 border-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
                  <div className="mono text-[10px] font-bold text-slate-400 mt-3">{segment.timeframe}</div>
                </div>

                {/* Content Area */}
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

                    {/* Action Area */}
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5">
                      {status === 'idle' && (
                        <button 
                          onClick={() => handleRenderScene(i, segment)}
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
                              ref={el => { videoRefs.current[i] = el }}
                              src={segment.media!.videoUrl} 
                              className="w-full h-full object-cover"
                              loop muted playsInline
                            />
                            <audio ref={el => { audioRefs.current[i] = el }} src={segment.media!.audioUrl} />
                            <button 
                              onClick={() => playScene(i)}
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
                              <button onClick={() => playScene(i)} className="px-6 py-2 bg-brand-600 text-white rounded-[12px] text-xs font-bold">Смотреть</button>
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
      )}
    </div>
  );
};

export default GeneratorPage;
