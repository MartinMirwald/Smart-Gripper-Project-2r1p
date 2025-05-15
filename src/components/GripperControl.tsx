import React, { useState, useEffect } from 'react';
import { arduinoService } from '../services/ArduinoService';

// Add type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface GripperControlProps {
  onCommand: (command: string) => void;
}

const GripperControl: React.FC<GripperControlProps> = ({ onCommand }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [upperLimit, setUpperLimit] = useState('6.0');
  const [lowerLimit, setLowerLimit] = useState('0.0');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        console.log('Recognized command:', command);
        setLastCommand(command);
        
        if (command.includes('close')) {
          if (isTestMode) {
            console.log('Test Mode: Simulating close command');
          } else {
            onCommand('close');
          }
        } else if (command.includes('open')) {
          if (isTestMode) {
            console.log('Test Mode: Simulating open command');
          } else {
            onCommand('open');
          }
        } else if (command.includes('hold')) {
          if (isTestMode) {
            console.log('Test Mode: Simulating hold command');
          } else {
            onCommand('hold');
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setError('Voice recognition error: ' + event.error);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognition);
    } else {
      setError('Speech recognition is not supported in your browser');
    }

    const unsubscribe = arduinoService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        const limits = arduinoService.getVoltageLimits();
        setUpperLimit(limits.upper.toString());
        setLowerLimit(limits.lower.toString());
      }
    });
    return () => unsubscribe();
  }, [onCommand, isTestMode]);

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

  const toggleListening = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setError('Failed to start voice recognition');
      }
    }
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
        {/* Test Mode Toggle */}
        <div className="flex justify-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isTestMode}
              onChange={(e) => setIsTestMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            <span className="ml-3 text-sm font-medium text-blue-300">Test Mode</span>
          </label>
        </div>

        {/* Last Command Display */}
        {lastCommand && (
          <div className="text-center text-sm text-blue-300">
            Last recognized command: <span className="font-bold">{lastCommand}</span>
          </div>
        )}

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleCommand('open')}
            disabled={!isConnected && !isTestMode || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              (isConnected || isTestMode) && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => handleCommand('close')}
            disabled={!isConnected && !isTestMode || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              (isConnected || isTestMode) && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Close
          </button>
          <button
            onClick={() => handleCommand('hold')}
            disabled={!isConnected && !isTestMode || isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              (isConnected || isTestMode) && !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Hold
          </button>
        </div>

        {/* Voice Control Button */}
        <div className="flex justify-center">
          <button
            onClick={toggleListening}
            disabled={!recognition}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 flex items-center gap-2 ${
              recognition
                ? isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span className="relative flex h-3 w-3">
              {isListening && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isListening ? 'bg-red-500' : 'bg-white'}`}></span>
            </span>
            {isListening ? 'Listening...' : 'Voice Control'}
          </button>
        </div>

        {!isConnected && !isTestMode && (
          <div className="text-center text-sm text-red-400">
            Please connect to Arduino to use controls
          </div>
        )}

        {isTestMode && (
          <div className="text-center text-sm text-blue-400">
            Test Mode Active - Commands will be logged to console
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