import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { AnalysisResult, AnalysisStatus } from './types';
import LandingPage from './components/LandingPage';
import AnalysisPage from './components/AnalysisPage';
import ResultsPage from './components/ResultsPage';
import GeneratorPage from './components/GeneratorPage';
import HistoryPage from './components/HistoryPage';
import ScriptsPage from './components/ScriptsPage';
import { getHistory, getAnalysis } from './api';

// Компонент для навигации
const Navigation: React.FC<{ theme: 'light' | 'dark'; toggleTheme: () => void }> = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="border-b border-black/5 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg group-hover:scale-105 transition-all duration-300">
            V
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-none tracking-tight text-slate-900 dark:text-white">ViralDNA</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-purple-500 font-bold">Intelligence</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/history')}
              className={`text-sm font-bold transition-all hover:text-purple-500 ${location.pathname === '/history' ? 'text-purple-500' : 'text-gray-500'}`}
            >
              История
            </button>
          </div>

          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 transition-all text-xl"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <button 
            onClick={() => navigate('/analyze')}
            className="bg-purple-600 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-2xl text-sm font-black hover:scale-105 transition-all active:scale-95 shadow-lg"
          >
            Новый анализ
          </button>
        </div>
      </div>
    </nav>
  );
};

// Компонент для работы с анализом
const AnalysisWrapper: React.FC<{ onComplete: (res: AnalysisResult) => void }> = ({ onComplete }) => {
  const navigate = useNavigate();
  
  return (
    <AnalysisPage 
      onComplete={(res) => {
        onComplete(res);
        navigate(`/results/${res.id}`);
      }} 
    />
  );
};

// Компонент для результатов
const ResultsWrapper: React.FC<{ onGenerate: () => void }> = ({ onGenerate }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <ResultsPage 
      analysis={analysis} 
      onGenerate={() => navigate(`/generate/${id}`)} 
    />
  );
};

// Компонент для генерации
const GeneratorWrapper: React.FC<{ onUpdate: (updated: AnalysisResult) => void }> = ({ onUpdate }) => {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <GeneratorPage 
      analysis={analysis} 
      onUpdate={(updated) => {
        onUpdate(updated);
        setAnalysis(updated);
      }}
    />
  );
};

const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Загружаем историю с бекенда
    getHistory()
      .then(setHistory)
      .catch((error) => {
        console.error('Ошибка загрузки истории:', error);
        // Fallback на localStorage если бекенд недоступен
        const saved = localStorage.getItem('viral_dna_history');
        if (saved) {
          try {
            setHistory(JSON.parse(saved));
          } catch (e) {
            console.error('Ошибка парсинга истории из localStorage:', e);
          }
        }
      });
    
    const savedTheme = localStorage.getItem('viral_dna_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('viral_dna_theme', newTheme);
  };

  const saveToHistory = (result: AnalysisResult) => {
    // Результат уже сохранен на бекенде при создании анализа
    // Просто обновляем локальное состояние
    const updated = [result, ...history.filter(h => h.id !== result.id)].slice(0, 20);
    setHistory(updated);
    
    // Также сохраняем в localStorage как fallback
    try {
      localStorage.setItem('viral_dna_history', JSON.stringify(updated.map(r => ({
        ...r,
        sources: r.sources.map(s => ({
          ...s,
          value: s.type === 'file' ? '[FILE_DATA_OMITTED]' : s.value
        }))
      }))));
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  };

  return (
    <div className="min-h-screen selection:bg-purple-500/30 transition-colors duration-300">
      <Navigation theme={theme} toggleTheme={toggleTheme} />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Routes>
          <Route path="/" element={<LandingPage onStart={() => navigate('/analyze')} />} />
          <Route path="/analyze" element={<AnalysisWrapper onComplete={saveToHistory} />} />
          <Route path="/results/:id" element={<ResultsWrapper onGenerate={() => {}} />} />
          <Route path="/generate/:id" element={<GeneratorWrapper onUpdate={saveToHistory} />} />
          <Route path="/scripts/:id" element={<ScriptsPage />} />
          <Route 
            path="/history" 
            element={
              <HistoryPage 
                items={history} 
                onSelect={(item) => navigate(`/results/${item.id}`)} 
              />
            } 
          />
        </Routes>
      </main>
      
      <footer className="border-t border-black/5 dark:border-white/5 py-12 text-center">
        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">&copy; 2024 ViralDNA Intelligence • Premium Content AI</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
