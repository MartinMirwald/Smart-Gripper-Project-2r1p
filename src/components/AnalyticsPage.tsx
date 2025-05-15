import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { arduinoService } from '../services/ArduinoService';

interface DataPoint {
  time: string;
  magneticX: number;
  magneticY: number;
  magneticZ: number;
  output: number;
}

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(50);
  const [isMoving, setIsMoving] = useState(false);
  
  // Connect to backend when component mounts
  useEffect(() => {
    const connectToBackend = async () => {
      try {
        const connected = await arduinoService.connect();
        setIsConnected(connected);
        setError(null);
      } catch (err) {
        setError('Failed to connect to backend');
        console.error(err);
      }
    };

    connectToBackend();

    // Cleanup on unmount
    return () => {
      arduinoService.disconnect();
    };
  }, []);

  // Subscribe to data updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = arduinoService.onData((newData) => {
      setData(prevData => {
        const newPoint: DataPoint = {
          time: '0s ago',
          ...newData
        };
        
        // Shift all times one second older
        const updatedData = prevData.map((point, i) => ({
          ...point,
          time: `${i + 1}s ago`
        }));
        
        // Add new point and remove oldest if more than 20 points
        return [newPoint, ...updatedData.slice(0, 19)];
      });
    });

    return () => unsubscribe();
  }, [isConnected]);

  const handlePositionChange = async (newPosition: number) => {
    setPosition(newPosition);
    if (!isMoving) {
      setIsMoving(true);
      try {
        await arduinoService.setPosition(newPosition);
      } catch (err) {
        setError('Failed to set position');
        console.error(err);
      }
      setIsMoving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <h2 className="text-xl font-bold mb-6 text-blue-400 border-b border-blue-500/20 pb-2">Gripper Analytics</h2>
      
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 mb-4">
          {error}
        </div>
      )}

      {/* Position Control */}
      <div className="mb-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-4 border border-blue-400/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-blue-400">Gripper Position</h3>
          <span className="text-sm text-blue-300">{position}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={(e) => handlePositionChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          disabled={!isConnected || isMoving}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Closed</span>
          <span>Open</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Magnetic Field X Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Magnetic Field X</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">mT</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Area type="monotone" dataKey="magneticX" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Magnetic Field Y Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Magnetic Field Y</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">mT</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Area type="monotone" dataKey="magneticY" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Magnetic Field Z Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Magnetic Field Z</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">mT</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="magneticZ" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ stroke: '#10b981', strokeWidth: 1, r: 2 }}
                  activeDot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Output Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">PID Output</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">V</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Bar dataKey="output" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Magnetic X</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? data.reduce((acc, point) => acc + point.magneticX, 0) / data.length : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Magnetic Y</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? data.reduce((acc, point) => acc + point.magneticY, 0) / data.length : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Magnetic Z</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? data.reduce((acc, point) => acc + point.magneticZ, 0) / data.length : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Current Output</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? data[0].output.toFixed(2) : 0}V
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
