
import React from 'react';

const LandingPage: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center py-16 relative">
      <div className="absolute top-0 -z-10 w-full h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--accent-glow),_transparent_70%)] opacity-30"></div>
      
      <div className="text-center space-y-8 max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-bold uppercase tracking-[0.2em] mb-4 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Next-Gen Content Intelligence
        </div>
        
        <h1 className="text-5xl md:text-7xl font-[800] tracking-tight leading-[1.1] text-slate-900 dark:text-white">
          Раскрой <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-pink-500 to-orange-500">
            ДНК Виральности
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 max-w-xl mx-auto font-medium leading-relaxed">
          Перестаньте гадать, почему видео залетают. Наш ИИ деконструирует психологию удержания и создает идеальные сценарии.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
          <button 
            onClick={onStart}
            className="group relative bg-brand-600 text-white px-10 py-5 rounded-[20px] font-bold text-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-600/25"
          >
            Начать Анализ
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div className="flex flex-col items-start justify-center">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">1,200+</span>
              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Криэйторов</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-32">
        {[
          {
            title: "Глубокий Анализ",
            desc: "ИИ находит скрытые триггеры, коронные фразы и структуру, которая держит внимание.",
            icon: "🧬",
            color: "from-purple-500/5"
          },
          {
            title: "Умный Сценарий",
            desc: "Генерация контента на любую тему, сохраняющая вашу уникальную подачу и ритм.",
            icon: "✍️",
            color: "from-blue-500/5"
          },
          {
            title: "Трекинг Трендов",
            desc: "Интеграция с поиском позволяет анализировать актуальные события в реальном времени.",
            icon: "📈",
            color: "from-pink-500/5"
          }
        ].map((feature, i) => (
          <div key={i} className="glass p-10 rounded-[40px] text-left hover:translate-y-[-4px] transition-all duration-300 group relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.color} to-transparent blur-2xl opacity-50`}></div>
            <div className="text-4xl mb-8 group-hover:scale-110 transition-transform duration-300 block">{feature.icon}</div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
