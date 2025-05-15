import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  time: string;
  temperature: number;
  force: number;
  distance: number;
  voltage: number;
}

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  
  // Simulate real-time data updates
  useEffect(() => {
    const initialData: DataPoint[] = Array.from({ length: 20 }).map((_, i) => {
      const baseTemp = 42;
      const baseForce = 20;
      const baseDistance = 25;
      const baseVoltage = 12.6;
      
      return {
        time: `${i}s ago`,
        temperature: baseTemp + Math.random() * 5,
        force: baseForce + Math.sin(i / 3) * 15,
        distance: baseDistance + Math.cos(i / 2) * 10,
        voltage: baseVoltage + Math.sin(i / 2) * 1.2
      };
    });
    
    setData(initialData);
    
    const interval = setInterval(() => {
      setData(prevData => {
        const newPoint: DataPoint = {
          time: '0s ago',
          temperature: 42 + Math.random() * 5,
          force: 20 + Math.sin(Date.now() / 3000) * 15,
          distance: 25 + Math.cos(Date.now() / 2000) * 10,
          voltage: 12.6 + Math.sin(Date.now() / 3000) * 1.2
        };
        
        // Shift all times one second older
        const updatedData = prevData.map((point, i) => ({
          ...point,
          time: `${i + 1}s ago`
        }));
        
        // Add new point and remove oldest if more than 20 points
        return [newPoint, ...updatedData.slice(0, 19)];
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <h2 className="text-xl font-bold mb-6 text-blue-400 border-b border-blue-500/20 pb-2">Gripper Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Distance Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Gripper Distance</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">mm</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" domain={[0, 50]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Area type="monotone" dataKey="distance" stroke="#38bdf8" fill="#0ea5e9" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Force Chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Applied Force</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">%</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" domain={[0, 50]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#f59e0b' }}
                />
                <Bar dataKey="force" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Voltage Chart - Added after Force chart */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Voltage</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">V</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" domain={[10, 14]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#10b981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="voltage" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ stroke: '#10b981', strokeWidth: 1, r: 2 }}
                  activeDot={{ stroke: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Temperature Chart - Made shorter */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
            <span className="mr-2">Temperature</span>
            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">°C</span>
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed />
                <YAxis stroke="#94a3b8" domain={[35, 50]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#3b82f6', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#3b82f6' }}
                  itemStyle={{ color: '#ef4444' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  dot={{ stroke: '#ef4444', strokeWidth: 1, r: 2 }}
                  activeDot={{ stroke: '#ef4444', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Distance</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? Math.round(data.reduce((acc, point) => acc + point.distance, 0) / data.length) : 0} mm
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Force</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? Math.round(data.reduce((acc, point) => acc + point.force, 0) / data.length) : 0}%
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Voltage</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? (data.reduce((acc, point) => acc + point.voltage, 0) / data.length).toFixed(1) : 0}V
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Max. Temperature</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? Math.max(...data.map(point => point.temperature)).toFixed(1) : 0}°C
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
