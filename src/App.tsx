import { useState, useEffect } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { arduinoService } from './services/ArduinoService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Checking connection...');

  useEffect(() => {
    // Subscribe to connection changes
    const unsubscribe = arduinoService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setConnectionStatus(connected ? 'Connected to Arduino' : 'Arduino not connected');
    });

    // Initial connection attempt
    arduinoService.connect();

    // Cleanup on unmount
    return () => {
      unsubscribe();
      arduinoService.disconnect();
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-slate-200">
      <header className="bg-slate-800/80 backdrop-blur-sm shadow-lg border-b border-blue-900/20 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-300 bg-clip-text text-transparent font-bold tracking-tight">
              Gripper Control
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
              <div className={`bg-gradient-to-r from-slate-800 to-slate-700 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-500/30 shadow-inner shadow-blue-500/5 flex items-center ${!isConnected && 'opacity-50'}`}>
                <span className={`inline-block w-2 h-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'} rounded-full mr-2 ${isConnected ? 'animate-pulse' : ''}`}></span>
                {connectionStatus}
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
      <main className="h-[calc(100vh-48px)] overflow-auto">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
