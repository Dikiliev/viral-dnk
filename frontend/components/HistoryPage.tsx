import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult } from '../types';

const HistoryPage: React.FC<{ items: AnalysisResult[]; onSelect: (res: AnalysisResult) => void }> = ({ items, onSelect }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const sourcesText = item.sources.map(s => s.label).join(' ').toLowerCase();
      const scriptsText = (item.generatedScripts || []).map(s => s.topic).join(' ').toLowerCase();
      return sourcesText.includes(query) || scriptsText.includes(query);
    });
  }, [items, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="space-y-4 sm:space-y-6">
        <div className="space-y-2 sm:space-y-3 text-center md:text-left">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-[800] tracking-tight text-slate-900 dark:text-white leading-none">Архив ДНК</h2>
          <p className="text-slate-500 dark:text-slate-400 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.3em]">История ваших продюсерских исследований</p>
        </div>

        {/* Search */}
        {items.length > 0 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по источникам или сценариям..."
              className="w-full px-4 sm:px-6 py-3 sm:py-4 glass rounded-[20px] sm:rounded-[24px] text-sm sm:text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
            />
            <span className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      {filteredItems.length === 0 ? (
        <div className="glass rounded-[32px] sm:rounded-[40px] py-20 sm:py-32 text-center space-y-4 sm:space-y-6">
          {items.length === 0 ? (
            <>
              <div className="text-6xl sm:text-7xl grayscale opacity-20">📂</div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-400">Пусто</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto font-medium">Ваши анализы появятся здесь после первой обработки группы видео.</p>
              </div>
            </>
          ) : (
            <>
              <div className="text-5xl sm:text-6xl opacity-20">🔍</div>
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-400">Ничего не найдено</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto font-medium">Попробуйте изменить поисковый запрос.</p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {filteredItems.map((item) => {
            const toneTags = item.stylePassport?.tone_tags || [];
            const scripts = item.generatedScripts || [];
            
            return (
              <div key={item.id} className="space-y-3 sm:space-y-4">
                {/* Analysis Card */}
                <div 
                  onClick={() => onSelect(item)}
                  className="group glass p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] hover:translate-y-[-2px] hover:border-brand-500/40 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="space-y-4 sm:space-y-6 relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-1.5 flex-wrap">
                        {item.sources.slice(0, 3).map((s, idx) => (
                          <div 
                            key={idx} 
                            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs sm:text-sm shadow-md hover:scale-110 transition-transform"
                            title={s.label}
                          >
                            {s.type === 'url' ? '🔗' : '📄'}
                          </div>
                        ))}
                        {item.sources.length > 3 && (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-200 dark:bg-white/10 text-slate-500 flex items-center justify-center text-[9px] sm:text-[10px] font-bold">
                            +{item.sources.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-black text-lg sm:text-xl leading-tight group-hover:text-brand-600 transition-colors line-clamp-1 text-slate-900 dark:text-white mb-1 sm:mb-2">
                        Групповой разбор ДНК
                      </h3>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-wider line-clamp-2">
                        {item.sources.map(s => s.label).join(', ')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 sm:pt-6 border-t border-slate-200 dark:border-white/5 relative z-10 gap-2">
                    <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                      {toneTags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[8px] sm:text-[9px] font-bold text-brand-600 bg-brand-500/5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-brand-600/10 uppercase tracking-widest">
                          #{tag}
                        </span>
                      ))}
                      {toneTags.length > 2 && (
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 px-2 sm:px-3 py-0.5 sm:py-1">
                          +{toneTags.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-brand-600 transition-colors flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
                      <span className="hidden sm:inline">Смотреть DNA</span>
                      <span className="sm:hidden">DNA</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>

                {/* Scripts */}
                {scripts.length > 0 && (
                  <div className="ml-2 sm:ml-4 space-y-2 sm:space-y-3">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">
                      Сценарии ({scripts.length})
                    </h4>
                    {scripts.map((script, idx) => (
                      <div
                        key={script.scriptId || idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (script.scriptId) {
                            navigate(`/scripts/${item.id}`);
                          }
                        }}
                        className="group glass p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] hover:translate-y-[-2px] hover:border-brand-500/40 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-brand-600/10 dark:bg-brand-500/20 flex items-center justify-center text-lg sm:text-xl shrink-0">
                            📝
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-brand-600 transition-colors">
                              {script.topic}
                            </h5>
                            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
                              {script.content?.length || 0} сегментов
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] sm:text-[10px] font-bold text-brand-600 uppercase tracking-widest group-hover:text-brand-500 transition-colors hidden sm:inline">
                            Открыть →
                          </span>
                          <span className="text-brand-600 sm:hidden">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
