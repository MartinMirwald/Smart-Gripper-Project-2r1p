import React, { useState, useEffect, useCallback } from 'react';
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
  const [lowerLimit, setLowerLimit] = useState('-6.0');
  const [tempUpperLimit, setTempUpperLimit] = useState('6.0');
  const [tempLowerLimit, setTempLowerLimit] = useState('-6.0');
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const MIN_CONFIDENCE = 0.6; // Lowered threshold for better recognition
  const VALID_COMMANDS = {
    'open': ['open', 'opening', 'open up', 'open gripper'],
    'close': ['close', 'closing', 'close up', 'close gripper'],
    'hold': ['hold', 'holding', 'stop', 'halt', 'freeze'],
    'measure': ['measure', 'measuring', 'get measurement', 'take measurement']
  };

  const initializeRecognition = useCallback(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 5; // Increased alternatives for better matching

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0];
        const transcript = result[0].transcript.toLowerCase().trim();
        const currentConfidence = result[0].confidence;
        
        setConfidence(currentConfidence);
        console.log('Recognized:', transcript, 'Confidence:', currentConfidence);

        // Only process final results
        if (result.isFinal) {
          // Try to find the best matching command
          let bestMatch = null;
          let bestConfidence = 0;

          // Check each command and its variations
          Object.entries(VALID_COMMANDS).forEach(([command, variations]) => {
            variations.forEach(variation => {
              // Check for exact match
              if (transcript === variation) {
                if (currentConfidence > bestConfidence) {
                  bestMatch = command;
                  bestConfidence = currentConfidence;
                }
              }
              // Check for partial match
              else if (transcript.includes(variation)) {
                const matchConfidence = currentConfidence * 0.8; // Penalize partial matches
                if (matchConfidence > bestConfidence) {
                  bestMatch = command;
                  bestConfidence = matchConfidence;
                }
              }
            });
          });

          if (bestMatch && bestConfidence >= MIN_CONFIDENCE) {
            setLastCommand(bestMatch);
            setRecognitionError(null);
            setIsProcessing(true);
            
            if (isTestMode) {
              console.log(`Test Mode: Simulating ${bestMatch} command`);
            } else {
              onCommand(bestMatch);
            }
            
            setIsProcessing(false);
          } else {
            // Provide more helpful feedback
            const suggestions = Object.values(VALID_COMMANDS).flat().join(', ');
            setRecognitionError(`Please say one of: ${suggestions}`);
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'Voice recognition error: ';
        
        switch (event.error) {
          case 'network':
            errorMessage += 'Network error. Please check your internet connection.';
            break;
          case 'not-allowed':
            errorMessage += 'Microphone access denied. Please allow microphone access.';
            break;
          case 'audio-capture':
            errorMessage += 'No microphone detected. Please connect a microphone.';
            break;
          case 'no-speech':
            errorMessage += 'No speech detected. Please try again.';
            break;
          default:
            errorMessage += event.error;
        }
        
        setRecognitionError(errorMessage);
        setIsProcessing(false);
        
        // Auto-restart on network errors
        if (event.error === 'network') {
          setTimeout(() => {
            if (isListening) {
              try {
                recognition.start();
              } catch (e) {
                console.error('Failed to restart recognition:', e);
              }
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setRecognitionError(null);
        setConfidence(0);
        setIsProcessing(false);
      };

      setRecognition(recognition);
      return recognition;
    } else {
      setError('Speech recognition is not supported in your browser');
      return null;
    }
  }, [isTestMode, onCommand]);

  useEffect(() => {
    const recognition = initializeRecognition();
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          console.error('Error stopping recognition:', e);
        }
      }
    };
  }, [initializeRecognition]);

  const handleMouseDown = () => {
    if (!recognition) return;
    
    try {
      recognition.start();
      setIsListening(true);
      setRecognitionError(null);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setRecognitionError('Failed to start voice recognition');
    }
  };

  const handleMouseUp = () => {
    if (!recognition) return;
    
    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };

  const handleCommand = async (command: string) => {
    try {
      if (isTestMode) {
        console.log(`Test Mode: Simulating ${command} command`);
        return;
      }
      await arduinoService.sendCommand(command);
      setLastCommand(command);
    } catch (error) {
      console.error('Error sending command:', error);
      setError('Failed to send command');
    }
  };

  const handleVoltageLimitChange = (type: 'upper' | 'lower', value: string) => {
    if (type === 'upper') {
      setTempUpperLimit(value);
      setTempLowerLimit((-parseFloat(value)).toFixed(1));
    } else {
      setTempLowerLimit(value);
      setTempUpperLimit((-parseFloat(value)).toFixed(1));
    }

    // Check if values have changed from the current limits
    const hasUpperChanged = value !== (type === 'upper' ? upperLimit : tempUpperLimit);
    const hasLowerChanged = value !== (type === 'lower' ? lowerLimit : tempLowerLimit);
    setHasChanges(hasUpperChanged || hasLowerChanged);
  };

  const validateLimits = (upper: string, lower: string): boolean => {
    const upperNum = parseFloat(upper);
    const lowerNum = parseFloat(lower);

    if (isNaN(upperNum) || isNaN(lowerNum)) {
      setError('Please enter valid numbers');
      return false;
    }

    if (upperNum <= 0 || lowerNum >= 0) {
      setError('Upper limit must be positive and lower limit must be negative');
      return false;
    }

    if (upperNum > 12 || lowerNum < -12) {
      setError('Limits must be between -12V and 12V');
      return false;
    }

    if (Math.abs(upperNum) !== Math.abs(lowerNum)) {
      setError('Upper and lower limits must be symmetrical');
      return false;
    }

    return true;
  };

  const saveVoltageLimits = async () => {
    if (!validateLimits(tempUpperLimit, tempLowerLimit)) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isTestMode) {
        console.log('Test Mode: Simulating voltage limit update', {
          upper: tempUpperLimit,
          lower: tempLowerLimit
        });
      } else {
        await arduinoService.setVoltageLimits(
          parseFloat(tempUpperLimit),
          parseFloat(tempLowerLimit)
        );
      }
      
      // Update the actual limits after successful save
      setUpperLimit(tempUpperLimit);
      setLowerLimit(tempLowerLimit);
      setHasChanges(false);
    } catch (error) {
      setError('Failed to update voltage limits');
      console.error('Error updating voltage limits:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetLimits = () => {
    setTempUpperLimit(upperLimit);
    setTempLowerLimit(lowerLimit);
    setHasChanges(false);
    setError(null);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg shadow-lg p-4 h-full border border-blue-500/30 shadow-blue-500/10">
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
            <div className="text-xs mt-1">
              Confidence: {Math.round(confidence * 100)}%
            </div>
          </div>
        )}

        <div className="flex justify-center gap-6">
          <button
            onClick={() => handleCommand('open')}
            disabled={isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Open
          </button>
          <button
            onClick={() => handleCommand('close')}
            disabled={isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Close
          </button>
          <button
            onClick={() => handleCommand('hold')}
            disabled={isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Hold
          </button>
          <button
            onClick={() => handleCommand('measure')}
            disabled={isLocked}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 ${
              !isLocked
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            Measure
          </button>
        </div>

        {/* Voice Control Button */}
        <div className="flex justify-center">
          <button
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={!recognition || isProcessing}
            className={`px-8 py-3 rounded-lg font-medium text-lg transition-all duration-200 flex items-center gap-2 ${
              recognition && !isProcessing
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
            {isProcessing ? 'Processing...' : isListening ? 'Listening...' : 'Hold to Record'}
          </button>
        </div>

        {/* Confidence Indicator */}
        {isListening && (
          <div className="w-full max-w-xs mx-auto">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-200 ${
                  confidence >= MIN_CONFIDENCE ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(confidence * 100, 100)}%` }}
              />
            </div>
            <div className="text-xs text-center mt-1 text-slate-400">
              {confidence >= MIN_CONFIDENCE ? 'Good recognition' : 'Speak clearly'}
            </div>
          </div>
        )}

        {isTestMode && (
          <div className="text-center text-sm text-blue-400">
            Test Mode Active - Commands will be logged to console
          </div>
        )}

        {recognitionError && (
          <div className="text-center text-sm text-red-400">
            {recognitionError}
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
                value={tempUpperLimit}
                onChange={(e) => handleVoltageLimitChange('upper', e.target.value)}
                className={`bg-slate-700 border border-blue-500/30 rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                step="0.1"
                min="0"
                max="12"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  onClick={() => handleVoltageLimitChange('upper', (parseFloat(tempUpperLimit) + 0.1).toFixed(1))}
                  disabled={parseFloat(tempUpperLimit) >= 12}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    parseFloat(tempUpperLimit) >= 12 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVoltageLimitChange('upper', (parseFloat(tempUpperLimit) - 0.1).toFixed(1))}
                  disabled={parseFloat(tempUpperLimit) <= 0}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    parseFloat(tempUpperLimit) <= 0 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
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
                value={tempLowerLimit}
                onChange={(e) => handleVoltageLimitChange('lower', e.target.value)}
                className={`bg-slate-700 border border-blue-500/30 rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-blue-500 w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                step="0.1"
                min="-12"
                max="0"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  onClick={() => handleVoltageLimitChange('lower', (parseFloat(tempLowerLimit) + 0.1).toFixed(1))}
                  disabled={parseFloat(tempLowerLimit) >= 0}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    parseFloat(tempLowerLimit) >= 0 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVoltageLimitChange('lower', (parseFloat(tempLowerLimit) - 0.1).toFixed(1))}
                  disabled={parseFloat(tempLowerLimit) <= -12}
                  className={`text-blue-400 hover:text-blue-300 transition-colors ${
                    parseFloat(tempLowerLimit) <= -12 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                >
                  ▼
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save and Reset Buttons */}
        {hasChanges && (
          <div className="flex justify-center gap-4 mt-2">
            <button
              onClick={saveVoltageLimits}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                isSaving
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Limits'}
            </button>
            <button
              onClick={resetLimits}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                isSaving
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-600 hover:bg-slate-500 text-white'
              }`}
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GripperControl; 