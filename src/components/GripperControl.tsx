import { useState, useEffect } from 'react';
import { arduinoService } from '../services/ArduinoService';

interface SensorData {
  x: number;
  y: number;
  z: number;
  output: number;
}

export default function GripperControl() {
  const [isConnected, setIsConnected] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const readData = async () => {
      if (!isConnected) return;
      
      try {
        const data = await arduinoService.readData();
        const [x, y, z, output] = data.split(',').map(Number);
        setSensorData({ x, y, z, output });
      } catch (err) {
        console.error('Error reading data:', err);
      }
    };

    const interval = setInterval(readData, 100);
    return () => clearInterval(interval);
  }, [isConnected]);

  const handleConnect = async () => {
    try {
      const connected = await arduinoService.connect();
      setIsConnected(connected);
      setError(null);
    } catch (err) {
      setError('Failed to connect to Arduino');
      console.error(err);
    }
  };

  const handleDisconnect = async () => {
    await arduinoService.disconnect();
    setIsConnected(false);
  };

  const handleCommand = async (command: string) => {
    try {
      await arduinoService.sendCommand(command);
      setError(null);
    } catch (err) {
      setError('Failed to send command');
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-400">Gripper Control</h2>
        <div className="flex items-center gap-4">
          {!isConnected ? (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handleCommand('open')}
          disabled={!isConnected}
          className="p-4 bg-green-500/20 border border-green-500 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
        >
          Open Gripper
        </button>
        <button
          onClick={() => handleCommand('close')}
          disabled={!isConnected}
          className="p-4 bg-red-500/20 border border-red-500 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          Close Gripper
        </button>
        <button
          onClick={() => handleCommand('hold')}
          disabled={!isConnected}
          className="p-4 bg-blue-500/20 border border-blue-500 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
        >
          Hold Position
        </button>
      </div>

      {sensorData && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Magnetic Field</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>X:</span>
                <span>{sensorData.x.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Y:</span>
                <span>{sensorData.y.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Z:</span>
                <span>{sensorData.z.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">Output</h3>
            <div className="text-2xl font-bold">{sensorData.output.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  );
} 