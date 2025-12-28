import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnalysisResult } from '../types';

const ResultsPage: React.FC<{ analysis: AnalysisResult; onGenerate: () => void }> = ({ analysis, onGenerate }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'passport' | 'transcript' | 'patterns'>('passport');
  const scripts = analysis.generatedScripts || [];

  const passport = analysis.stylePassport;
  const structure = passport.structure || [];
  const toneTags = passport.tone_tags || [];
  const catchphrases = passport.catchphrases || [];
  const visualContext = passport.visual_context || [];
  const patterns = analysis.patterns || [];
  const transcript = analysis.transcript || [];

  const tabs = [
    { id: 'passport' as const, label: 'Общий паспорт стиля', icon: '🧬', count: structure.length },
    { id: 'patterns' as const, label: 'Паттерны успеха', icon: '📈', count: patterns.length },
    { id: 'transcript' as const, label: 'Синтез речи', icon: '📝', count: transcript.length },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 pb-6 sm:pb-8 border-b border-slate-200 dark:border-white/5">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="px-2 sm:px-3 py-1 bg-brand-600 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-full shadow-sm">
              Batch Analysis
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {analysis.sources.length} Источников • {new Date(analysis.timestamp).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-[900] tracking-tight leading-none text-slate-900 dark:text-white">
            Кросс-Видео ДНК
          </h2>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-1">
            {analysis.sources.map((s, i) => (
              <span 
                key={i} 
                className="px-2 sm:px-3 py-1 sm:py-1.5 glass rounded-lg text-[8px] sm:text-[9px] font-black uppercase text-slate-400 truncate max-w-[120px] sm:max-w-[150px] hover:border-brand-500/30 transition-colors"
                title={s.label}
              >
                {s.type === 'url' ? '🔗' : '📄'} {s.label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2 sm:gap-4 flex-wrap">
          {scripts.length > 0 && (
            <button 
              onClick={() => navigate(`/scripts/${analysis.id}`)}
              className="glass text-slate-900 dark:text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-[18px] sm:rounded-[22px] font-bold text-sm sm:text-base hover:border-brand-500/40 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <span>📚</span>
              <span className="hidden sm:inline">Все сценарии ({scripts.length})</span>
              <span className="sm:hidden">Сценарии ({scripts.length})</span>
            </button>
          )}
          <button 
            onClick={onGenerate}
            className="bg-brand-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-[18px] sm:rounded-[22px] font-bold text-base sm:text-lg shadow-xl shadow-brand-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>✨</span>
            <span className="hidden sm:inline">Создать по этому ДНК</span>
            <span className="sm:hidden">Создать</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar pb-2 -mx-4 sm:mx-0 px-4 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap group ${
              activeTab === tab.id 
                ? 'text-brand-600 dark:text-brand-400' 
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <span className="text-lg sm:text-xl group-hover:scale-110 transition-transform">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            {tab.count > 0 && (
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black ${
                activeTab === tab.id 
                  ? 'bg-brand-600/20 text-brand-600' 
                  : 'bg-slate-200 dark:bg-white/10 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-brand-600 rounded-full"></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'passport' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {/* Structure */}
              <section className="glass rounded-[40px] p-10 md:p-12 relative overflow-hidden">
                <h3 className="text-2xl font-black mb-10 flex items-center gap-4 text-slate-900 dark:text-white">
                  <div className="w-2 h-8 bg-brand-600 rounded-full"></div>
                  Типичный Скелет
                </h3>
                <div className="space-y-10">
                  {structure.length > 0 ? structure.map((item, i) => (
                    <div key={i} className="flex gap-8 group relative">
                      <div className="w-px bg-slate-200 dark:bg-white/15 absolute left-[103px] top-10 bottom-[-40px] group-last:hidden"></div>
                      <div className="mono text-[11px] font-bold text-brand-600 bg-brand-600/10 px-4 py-2 rounded-xl border border-brand-600/20 h-fit shrink-0 w-[105px] text-center shadow-sm">
                        {item.start} — {item.end}
                      </div>
                      <div className="flex-1 pb-10">
                        <h4 className="font-extrabold text-2xl mb-3 group-hover:text-brand-600 transition-colors text-slate-900 dark:text-white">{item.segment}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-lg font-medium leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 opacity-50 font-bold italic text-lg">Не удалось извлечь структуру. Попробуйте добавить больше файлов.</div>
                  )}
                </div>
              </section>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass rounded-[32px] p-10 hover:border-brand-500/30 transition-all">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6">Средний Темп</h4>
                  <div className="flex items-baseline gap-3 text-slate-900 dark:text-white">
                    <span className="text-6xl font-black">{passport.speech_rate_wpm || 0}</span>
                    <span className="text-sm font-bold opacity-60">слов/мин</span>
                  </div>
                </div>
                <div className="glass rounded-[32px] p-10 hover:border-brand-500/30 transition-all">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-6">Характерная Тональность</h4>
                  <div className="flex flex-wrap gap-2">
                    {toneTags.length > 0 ? toneTags.map((tag, i) => (
                      <span key={i} className="px-4 py-1.5 bg-brand-600/10 border border-brand-600/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-600 hover:bg-brand-600/20 transition-colors">
                        {tag}
                      </span>
                    )) : (
                      <span className="text-sm text-slate-400 italic">Не определено</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4 space-y-10">
              <div className="glass rounded-[32px] p-10 hover:border-brand-500/30 transition-all">
                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-8">Повторяющиеся фразы</h4>
                <div className="space-y-4">
                  {catchphrases.length > 0 ? catchphrases.map((phrase, i) => (
                    <div key={i} className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl text-base font-semibold leading-relaxed text-slate-700 dark:text-slate-300 hover:border-brand-500/30 transition-colors">
                      "{phrase}"
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 italic text-center py-4">Нет повторяющихся фраз</p>
                  )}
                </div>
              </div>
              
              <div className="glass rounded-[32px] p-10 hover:border-brand-500/30 transition-all">
                <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-400 mb-8">Общие визуальные коды</h4>
                <ul className="space-y-6">
                  {visualContext.length > 0 ? visualContext.map((ctx, i) => (
                    <li key={i} className="text-base text-slate-600 dark:text-slate-300 font-bold flex items-start gap-4 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
                      <div className="w-2 h-2 rounded-full bg-brand-600 mt-2.5 shrink-0"></div>
                      {ctx}
                    </li>
                  )) : (
                    <li className="text-sm text-slate-400 italic text-center py-4">Нет данных</li>
                  )}
                </ul>
              </div>
            </aside>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {patterns.length > 0 ? patterns.map((pattern, i) => (
              <div key={i} className="glass rounded-[40px] p-12 group hover:scale-[1.01] transition-all hover:border-brand-500/30">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{pattern.name}</h3>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    pattern.impact === 'Высокий' ? 'bg-green-500/15 text-green-600 border border-green-500/20' : 
                    pattern.impact === 'Средний' ? 'bg-orange-500/15 text-orange-600 border border-orange-500/20' : 
                    'bg-slate-500/15 text-slate-600 border border-slate-500/20'
                  }`}>
                    {pattern.impact}
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300 font-semibold text-lg leading-relaxed mb-10">{pattern.description}</p>
                <div className="space-y-5">
                  <div className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-500">Доказательства в роликах</div>
                  {pattern.evidence_segments?.map((evidence, j) => (
                    <div key={j} className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-base text-slate-500 dark:text-slate-400 font-bold border border-slate-200 dark:border-white/10 italic hover:border-brand-500/30 transition-colors">
                      "{evidence}"
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="col-span-2 text-center py-20">
                <p className="text-lg text-slate-400 italic">Паттерны не найдены</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transcript' && (
          <div className="glass rounded-[40px] p-10 md:p-16">
            <div className="max-w-3xl mx-auto space-y-12 text-center">
              <div className="text-sm font-black uppercase tracking-[0.4em] text-brand-500 mb-4">Представительный отрывок</div>
              {transcript.length > 0 ? transcript.map((item, i) => (
                <div key={i} className="flex gap-10 group text-left hover:bg-slate-50 dark:hover:bg-white/5 p-4 rounded-2xl transition-colors">
                  <div className="mono text-[11px] font-black text-slate-400 pt-2 shrink-0">
                    [{item.start}]
                  </div>
                  <div className="text-xl font-semibold text-slate-700 dark:text-slate-300 leading-relaxed group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {item.text}
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 opacity-50 italic text-xl font-bold">
                  Синтез речи не удался. Добавьте видеофайлы для точного разбора тембра и лексики.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
