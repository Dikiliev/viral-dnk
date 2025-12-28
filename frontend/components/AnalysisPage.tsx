
import React, { useState, useRef } from 'react';
import { AnalysisStatus, AnalysisResult, AnalysisInput } from '../types';
import { analyzeContent } from '../gemini';

const AnalysisPage: React.FC<{ onComplete: (res: AnalysisResult) => void }> = ({ onComplete }) => {
  const [url, setUrl] = useState('');
  const [inputs, setInputs] = useState<AnalysisInput[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addUrl = () => {
    if (!url.trim()) return;
    setInputs([...inputs, { type: 'url', value: url, label: url }]);
    setUrl('');
  };

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  const startAnalysis = async () => {
    if (inputs.length === 0) return;
    
    setStatus(AnalysisStatus.PROCESSING);
    setProgress(5);
    
    const steps = [
      { status: AnalysisStatus.DOWNLOADING, p: 35 },
      { status: AnalysisStatus.TRANSCRIBING, p: 65 },
      { status: AnalysisStatus.ANALYZING, p: 95 },
    ];

    try {
      let currentIdx = 0;
      const interval = setInterval(() => {
        if (currentIdx < steps.length) {
          const currentStep = steps[currentIdx];
          setStatus(currentStep.status);
          setProgress(prev => {
            if (prev < currentStep.p) {
              return prev + 1;
            } else {
              currentIdx++;
              return prev;
            }
          });
        } else {
          clearInterval(interval);
        }
      }, 150);

      // Store a reference to inputs to pass them as result
      const sourceInputs = [...inputs];
      const result = await analyzeContent(sourceInputs);
      
      clearInterval(interval);
      setProgress(100);
      setStatus(AnalysisStatus.READY);

      // Use a slightly longer delay to show the 100% state before navigating
      setTimeout(() => {
        onComplete(result);
      }, 1000);
    } catch (e: any) {
      console.error(e);
      setStatus(AnalysisStatus.ERROR);
    }
  };

  if (status === AnalysisStatus.ERROR) {
    return (
      <div className="max-w-xl mx-auto py-20 flex flex-col items-center animate-in fade-in text-center space-y-8">
        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center text-4xl">⚠️</div>
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Ошибка группового анализа</h3>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Нейросеть не смогла найти общие закономерности в предоставленных видео. 
            Попробуйте добавить больше видеофайлов или убедитесь, что ссылки доступны.
          </p>
        </div>
        <button 
          onClick={() => setStatus(AnalysisStatus.IDLE)}
          className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (status !== AnalysisStatus.IDLE) {
    const size = 260;
    const strokeWidth = 10;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="max-w-xl mx-auto py-20 flex flex-col items-center animate-in fade-in duration-500">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="progress-ring overflow-visible">
            <circle
              cx={center} cy={center} r={radius}
              stroke="currentColor" strokeWidth={strokeWidth}
              fill="transparent"
              className="text-slate-200 dark:text-white/5"
            />
            <circle
              cx={center} cy={center} r={radius}
              stroke="currentColor" strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="text-brand-500 transition-all duration-300 shadow-xl"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-6xl font-[900] tracking-tighter text-slate-900 dark:text-white">{progress}%</span>
            <span className="text-[9px] uppercase font-bold tracking-[0.3em] text-brand-500 mt-2">Deep DNA Scan</span>
          </div>
        </div>
        
        <div className="mt-12 text-center space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {status === AnalysisStatus.DOWNLOADING && "Обработка очереди..."}
            {status === AnalysisStatus.TRANSCRIBING && "Синхронизация стилей..."}
            {status === AnalysisStatus.ANALYZING && "Выявление паттернов успеха..."}
            {status === AnalysisStatus.READY && "ДНК готово!"}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic">Анализируем {inputs.length} видео одновременно</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-[900] tracking-tight text-slate-900 dark:text-white">Групповой анализ</h2>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Загрузите до 5 видео для выявления общих секретов успеха</p>
      </div>

      <div className="space-y-8">
        {/* Input Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-brand-500/10 rounded-[28px] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
              <div className="relative flex p-1.5 glass rounded-[24px]">
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Ссылка на Shorts..." 
                  className="flex-1 px-5 py-3.5 text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 bg-transparent"
                />
                <button 
                  onClick={addUrl}
                  className="bg-brand-600 text-white px-6 py-3.5 rounded-[18px] font-bold hover:bg-brand-700 transition-all"
                >
                  Добавить
                </button>
              </div>
            </div>

            <input type="file" accept="video/*" multiple className="hidden" ref={fileInputRef} onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file: File) => {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  setInputs(prev => [...prev, { 
                    type: 'file', 
                    value: { data: base64, mimeType: file.type },
                    label: file.name
                  }]);
                };
                reader.readAsDataURL(file);
              });
            }} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full glass py-8 rounded-[24px] border-dashed border-2 hover:border-brand-500/50 transition-all flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📁</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">Загрузить файлы</span>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest">MP4 / MOV / AVI</span>
            </button>
          </div>

          {/* Staging Area */}
          <div className="glass rounded-[32px] p-8 flex flex-col">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">Очередь анализа ({inputs.length})</h4>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
              {inputs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-sm font-medium">
                  Добавьте видео для начала...
                </div>
              ) : (
                inputs.map((input, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="text-lg">{input.type === 'url' ? '🔗' : '📹'}</span>
                      <span className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">{input.label}</span>
                    </div>
                    <button 
                      onClick={() => removeInput(i)}
                      className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-lg"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            {inputs.length > 0 && (
              <button 
                onClick={startAnalysis}
                className="mt-6 w-full bg-brand-600 text-white py-4 rounded-[20px] font-black text-lg shadow-xl shadow-brand-600/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Запустить Анализ ДНК
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
