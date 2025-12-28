import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { AnalysisResult, AnalysisStatus } from './types';
import LandingPage from './components/LandingPage';
import AnalysisPage from './components/AnalysisPage';
import ResultsPage from './components/ResultsPage';
import GeneratorPage from './components/GeneratorPage';
import HistoryPage from './components/HistoryPage';
import ScriptsPage from './components/ScriptsPage';
import Navigation from './components/Navigation';
import { getHistory, getAnalysis } from './api';

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
      
      <footer className="border-t border-black/5 dark:border-white/5 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
              &copy; 2024 ViralDNA Intelligence • Premium Content AI
            </p>
            <div className="flex items-center gap-6 text-xs text-gray-400">
              <span className="hover:text-brand-600 transition-colors cursor-pointer">Документация</span>
              <span className="hover:text-brand-600 transition-colors cursor-pointer">Поддержка</span>
            </div>
          </div>
        </div>
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
