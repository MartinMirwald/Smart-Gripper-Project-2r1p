
import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AnalyticsPage from './components/AnalyticsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'analytics':
        return <AnalyticsPage />;
      case 'dashboard':
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-slate-200">
      <header className="bg-slate-800/80 backdrop-blur-sm shadow-lg border-b border-blue-900/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent font-bold tracking-tight">
              Gripper Control
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30 shadow-inner shadow-blue-500/5 flex items-center">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Connected
              </div>
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center overflow-hidden">
                {/* TUM Logo - blue white pattern */}
                <div className="w-full h-full bg-blue-600 flex items-center justify-center leading-none">
                  <span className="text-[8px] font-bold text-white">TUM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="flex h-[calc(100vh-48px)]">
        <Sidebar activePage={currentPage} onNavigate={handleNavigate} />
        <main className="flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;
