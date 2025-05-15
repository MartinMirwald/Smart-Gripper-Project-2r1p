import React from 'react';
import { Activity, Thermometer, Battery, Wifi } from 'lucide-react';

interface StatusDisplayProps {
  torque: number;
  temperature: number;
  voltage: number;
  connected: boolean;
}

const StatusDisplay: React.FC<StatusDisplayProps> = ({ torque, temperature, voltage, connected }) => {
  // Determine temperature status color
  const tempColor = temperature < 40 ? 'text-green-500' : 
                   temperature < 60 ? 'text-yellow-500' : 
                   'text-red-500';
  
  // Determine voltage status
  const voltageStatus = voltage > 12.0 ? 'Optimal' : 
                       voltage > 11.0 ? 'Normal' : 
                       'Low';
  
  const voltageColor = voltage > 12.0 ? 'text-green-500' : 
                      voltage > 11.0 ? 'text-yellow-500' : 
                      'text-red-500';
  
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-6 border border-blue-400/30 hover:shadow-blue-400/20 hover:shadow-xl transition-all duration-300">
      <h3 className="text-lg font-medium mb-4 text-blue-400 border-b border-blue-500/20 pb-2">System Status</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900 border border-blue-500/30 hover:shadow-md transition-shadow duration-300">
          <div className="text-sm text-gray-400 flex items-center mb-1">
            <Activity size={16} className="mr-1 text-blue-500" />
            Torque
          </div>
          <div className="text-xl font-semibold text-blue-300">{torque} Nm</div>
          <div className="text-xs text-gray-500 mt-1">Max: 5 Nm</div>
        </div>
        
        <div className="p-4 rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900 border border-blue-500/30 hover:shadow-md transition-shadow duration-300">
          <div className="text-sm text-gray-400 flex items-center mb-1">
            <Thermometer size={16} className="mr-1 text-blue-500" />
            Temperature
          </div>
          <div className={`text-xl font-semibold ${tempColor}`}>{temperature} °C</div>
          <div className="text-xs text-gray-500 mt-1">Normal range: 20-50°C</div>
        </div>
        
        <div className="p-4 rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900 border border-blue-500/30 hover:shadow-md transition-shadow duration-300">
          <div className="text-sm text-gray-400 flex items-center mb-1">
            <Battery size={16} className="mr-1 text-blue-500" />
            Voltage
          </div>
          <div className={`text-xl font-semibold ${voltageColor}`}>{voltage} V</div>
          <div className="text-xs text-gray-500 mt-1">{voltageStatus}</div>
        </div>
        
        <div className="p-4 rounded-lg bg-gradient-to-br from-slate-800/80 to-slate-900 border border-blue-500/30 hover:shadow-md transition-shadow duration-300">
          <div className="text-sm text-gray-400 flex items-center mb-1">
            <Wifi size={16} className="mr-1 text-blue-500" />
            Status
          </div>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-xl font-semibold text-gray-300">{connected ? 'Connected' : 'Disconnected'}</div>
          </div>
          <div className="text-xs text-gray-500 mt-1">Uptime: 3h 24m</div>
        </div>
      </div>
    </div>
  );
};

export default StatusDisplay;