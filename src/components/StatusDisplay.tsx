import React from 'react';

interface StatusDisplayProps {
  torque: number; // Sum of magnetic field components
  temperature: number;
  voltage: number;
  connected: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ torque, temperature, voltage, connected }) => {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-4 border border-blue-400/20">
      <h3 className="text-sm font-medium mb-3 text-blue-400">System Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-blue-300">Force</div>
            <div className="text-lg font-bold text-white">{torque.toFixed(2)} mT</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-blue-300">Temperature</div>
            <div className="text-lg font-bold text-white">{temperature.toFixed(1)} °C</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-xs text-blue-300">Voltage</div>
            <div className="text-lg font-bold text-white">{voltage.toFixed(2)} V</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
          </div>
          <div>
            <div className="text-xs text-blue-300">Connection</div>
            <div className="text-lg font-bold text-white">{connected ? 'Connected' : 'Disconnected'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusDisplay;