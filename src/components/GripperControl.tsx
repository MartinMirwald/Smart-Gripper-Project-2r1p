import React, { useState, useEffect } from 'react';
import { arduinoService } from '../services/ArduinoService';

interface GripperControlProps {
  onCommand: (command: string) => void;
}

const GripperControl: React.FC<GripperControlProps> = ({ onCommand }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [upperLimit, setUpperLimit] = useState('6.0');
  const [lowerLimit, setLowerLimit] = useState('0.0');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = arduinoService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        const limits = arduinoService.getVoltageLimits();
        setUpperLimit(limits.upper.toString());
        setLowerLimit(limits.lower.toString());
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCommand = async (command: string) => {
    if (!isConnected) {
      return;
    }
    setIsLocked(true);
    try {
      await arduinoService.sendCommand(command);
      onCommand(command);
    } catch (error) {
      console.error('Error sending command:', error);
    }
    setIsLocked(false);
  };

  const handleVoltageLimitChange = async (type: 'upper' | 'lower', value: string) => {
    if (!isConnected) return;
    
    // Update the display value immediately
    if (type === 'upper') {
      setUpperLimit(value);
    } else {
      setLowerLimit(value);
    }

    // Try to parse the values
    const upperNum = parseFloat(type === 'upper' ? value : upperLimit);
    const lowerNum = parseFloat(type === 'lower' ? value : lowerLimit);

    // Only update Arduino if both values are valid numbers
    if (!isNaN(upperNum) && !isNaN(lowerNum)) {
      try {
        if (upperNum <= lowerNum) {
          setError('Upper limit must be greater than lower limit');
          return;
        }
        
        await arduinoService.setVoltageLimits(upperNum, lowerNum);
        setError(null);
      } catch (error) {
        setError('Failed to update voltage limits');
        console.error('Error updating voltage limits:', error);
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-6 border border-blue-400/20">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleCommand('open')}
            disabled={!isConnected || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              isConnected && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => handleCommand('close')}
            disabled={!isConnected || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              isConnected && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Close
          </button>
          <button
            onClick={() => handleCommand('hold')}
            disabled={!isConnected || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              isConnected && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Hold
          </button>
        </div>

        {!isConnected && (
          <div className="text-center text-sm text-red-400">
            Please connect to Arduino to use controls
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-blue-300">Upper Voltage Limit (V)</label>
            <div className="relative">
              <input
                type="number"
                value={upperLimit}
                onChange={(e) => handleVoltageLimitChange('upper', e.target.value)}
                className={`bg-slate-700 border border-blue-500/30 rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  !isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isConnected}
                step="0.1"
                min="0"
                max="12"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  onClick={() => handleVoltageLimitChange('upper', (parseFloat(upperLimit) + 0.1).toFixed(1))}
                  disabled={!isConnected || parseFloat(upperLimit) >= 12}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    !isConnected ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'
                  } ${parseFloat(upperLimit) >= 12 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVoltageLimitChange('upper', (parseFloat(upperLimit) - 0.1).toFixed(1))}
                  disabled={!isConnected || parseFloat(upperLimit) <= 0}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    !isConnected ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'
                  } ${parseFloat(upperLimit) <= 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-blue-300">Lower Voltage Limit (V)</label>
            <div className="relative">
              <input
                type="number"
                value={lowerLimit}
                onChange={(e) => handleVoltageLimitChange('lower', e.target.value)}
                className={`bg-slate-700 border border-blue-500/30 rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  !isConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={!isConnected}
                step="0.1"
                min="0"
                max="12"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  onClick={() => handleVoltageLimitChange('lower', (parseFloat(lowerLimit) + 0.1).toFixed(1))}
                  disabled={!isConnected || parseFloat(lowerLimit) >= 12}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    !isConnected ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'
                  } ${parseFloat(lowerLimit) >= 12 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVoltageLimitChange('lower', (parseFloat(lowerLimit) - 0.1).toFixed(1))}
                  disabled={!isConnected || parseFloat(lowerLimit) <= 0}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    !isConnected ? 'opacity-30 cursor-not-allowed' : 'hover:text-blue-300'
                  } ${parseFloat(lowerLimit) <= 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GripperControl; 