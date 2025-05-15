import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { arduinoService, SensorData } from '../services/ArduinoService';
import GripperVisualization from './GripperVisualization';
import StatusDisplay from './StatusDisplay';
import GripperControl from './GripperControl';

interface DataPoint {
  time: string;
  magneticX: number;
  magneticY: number;
  magneticZ: number;
  output: number;
  distance: number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [currentDistance, setCurrentDistance] = useState(50);
  const [statusData, setStatusData] = useState({
    torque: 0,
    temperature: 0,
    voltage: 0,
    connected: false
  });
  
  // Subscribe to connection changes
  useEffect(() => {
    const unsubscribe = arduinoService.onConnectionChange((connected) => {
      setIsConnected(connected);
      setStatusData(prev => ({
        ...prev,
        connected
      }));
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to data updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = arduinoService.onData((message) => {
      if (message.type === 'sensor_data' && typeof message.data !== 'string') {
        const sensorData = message.data as SensorData;
        setData(prevData => {
          const newPoint: DataPoint = {
            time: '0s ago',
            magneticX: sensorData.magneticX,
            magneticY: sensorData.magneticY,
            magneticZ: sensorData.magneticZ,
            output: sensorData.output,
            distance: sensorData.distance
          };
          
          // Update current distance
          setCurrentDistance(sensorData.distance);
          
          // Update status data with latest readings
          setStatusData(prev => ({
            ...prev,
            torque: Math.abs(sensorData.magneticX + sensorData.magneticY + sensorData.magneticZ),
            temperature: 25 + (Math.abs(sensorData.magneticX) * 0.5),
            voltage: sensorData.output,
            connected: true
          }));
          
          // Shift all times one second older
          const updatedData = prevData.map((point, i) => ({
            ...point,
            time: `${i + 1}s ago`
          }));
          
          // Add new point and remove oldest if more than 20 points
          return [newPoint, ...updatedData.slice(0, 19)];
        });
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  const handleCommand = async (command: string) => {
    try {
      await arduinoService.sendCommand(command);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send command');
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="w-full h-auto min-h-[600px] max-h-[800px]">
          <GripperVisualization position={currentDistance} force={Math.abs(statusData.torque)} />
        </div>
        <div className="w-full space-y-6">
          <GripperControl onCommand={handleCommand} />
        </div>
      </div>
      
      <div className="mb-6">
        <StatusDisplay {...statusData} />
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
            {data.length > 0 ? (data.reduce((acc, point) => acc + point.magneticX, 0) / data.length).toFixed(5) : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Magnetic Y</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? (data.reduce((acc, point) => acc + point.magneticY, 0) / data.length).toFixed(5) : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Avg. Magnetic Z</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 ? (data.reduce((acc, point) => acc + point.magneticZ, 0) / data.length).toFixed(5) : 0} mT
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-3 border border-blue-400/20">
          <h4 className="text-xs text-blue-300 mb-1">Current Output</h4>
          <div className="text-lg font-bold text-white">
            {data.length > 0 && data[0].output !== undefined ? data[0].output.toFixed(2) : 0}V
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;