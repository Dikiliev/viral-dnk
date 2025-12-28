import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

interface NavigationProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ theme, toggleTheme }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Главная', path: '/' }];
    
    if (paths[0] === 'analyze') {
      breadcrumbs.push({ label: 'Анализ', path: '/analyze' });
    } else if (paths[0] === 'results' && paths[1]) {
      breadcrumbs.push({ label: 'Результаты', path: `/results/${paths[1]}` });
    } else if (paths[0] === 'generate' && paths[1]) {
      breadcrumbs.push(
        { label: 'Результаты', path: `/results/${paths[1]}` },
        { label: 'Создание сценария', path: `/generate/${paths[1]}` }
      );
    } else if (paths[0] === 'scripts' && paths[1]) {
      breadcrumbs.push(
        { label: 'Результаты', path: `/results/${paths[1]}` },
        { label: 'Все сценарии', path: `/scripts/${paths[1]}` }
      );
    } else if (paths[0] === 'history') {
      breadcrumbs.push({ label: 'История', path: '/history' });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav className="border-b border-black/5 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Navigation */}
        <div className="h-20 flex items-center justify-between">
          {/* Logo */}
          <Link 
            to="/"
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg group-hover:scale-105 transition-all duration-300">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl leading-none tracking-tight text-slate-900 dark:text-white">ViralDNA</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-purple-500 font-bold hidden xs:block">Intelligence</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/history"
              className={`text-sm font-bold transition-all relative group ${
                isActive('/history') 
                  ? 'text-purple-600 dark:text-purple-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
              }`}
            >
              История
              {isActive('/history') && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400 rounded-full"></span>
              )}
            </Link>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 rounded-lg glass flex items-center justify-center hover:scale-110 transition-all active:scale-95"
              aria-label="Меню"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>

            <button 
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full glass flex items-center justify-center hover:scale-110 transition-all text-xl active:scale-95"
              aria-label="Переключить тему"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <button 
              onClick={() => {
                navigate('/analyze');
                setMobileMenuOpen(false);
              }}
              className="bg-purple-600 dark:bg-white text-white dark:text-black px-3 sm:px-4 md:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-black hover:scale-105 transition-all active:scale-95 shadow-lg hover:shadow-xl"
            >
              <span className="hidden sm:inline">Новый анализ</span>
              <span className="sm:hidden">+</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-black/5 dark:border-white/5 py-4 animate-in fade-in">
            <Link
              to="/history"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-base font-bold transition-all ${
                isActive('/history')
                  ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              📚 История
            </Link>
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="h-12 hidden sm:flex items-center border-t border-black/5 dark:border-white/5">
            <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 overflow-x-auto no-scrollbar">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <span className="mx-2 shrink-0">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-purple-600 dark:text-purple-400 font-bold whitespace-nowrap">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.path}
                      className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
