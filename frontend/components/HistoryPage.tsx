
import React from 'react';
import { AnalysisResult } from '../types';

const HistoryPage: React.FC<{ items: AnalysisResult[]; onSelect: (res: AnalysisResult) => void }> = ({ items, onSelect }) => {
  return (
    <div className="max-w-5xl mx-auto py-8 space-y-12 animate-in fade-in duration-700">
      <div className="space-y-3 text-center md:text-left">
        <h2 className="text-4xl md:text-5xl font-[800] tracking-tight text-slate-900 dark:text-white leading-none">Архив ДНК</h2>
        <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">История ваших продюсерских исследований</p>
      </div>
      
      {items.length === 0 ? (
        <div className="glass rounded-[40px] py-32 text-center space-y-6">
          <div className="text-7xl grayscale opacity-20">📂</div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-400">Пусто</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">Ваши анализы появятся здесь после первой обработки группы видео.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const toneTags = item.stylePassport?.tone_tags || [];
            return (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="group glass p-8 rounded-[32px] hover:translate-y-[-2px] hover:border-brand-500/40 transition-all cursor-pointer flex flex-col justify-between h-[300px] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {item.sources.slice(0, 3).map((s, idx) => (
                        <div key={idx} className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-sm shadow-md">
                          {s.type === 'url' ? '🔗' : '📹'}
                        </div>
                      ))}
                      {item.sources.length > 3 && (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                          +{item.sources.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <h3 className="font-black text-xl leading-tight group-hover:text-brand-600 transition-colors line-clamp-1 text-slate-900 dark:text-white mb-2">
                      Групповой разбор ДНК
                    </h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider line-clamp-2">
                      {item.sources.map(s => s.label).join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-white/5 relative z-10">
                  <div className="flex gap-2">
                    {toneTags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[9px] font-bold text-brand-600 bg-brand-500/5 px-3 py-1 rounded-lg border border-brand-600/10 uppercase tracking-widest">#{tag}</span>
                    ))}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                    Смотреть DNA <span>→</span>
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

export default HistoryPage;
