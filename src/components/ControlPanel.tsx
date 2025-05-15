import React, { useState } from 'react';
import { Sliders, Grip, RotateCw } from 'lucide-react';

interface ControlPanelProps {
  onPositionChange: (position: number) => void;
  onForceChange: (force: number) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onPositionChange, onForceChange }) => {
  const [position, setPosition] = useState(50);
  const [force, setForce] = useState(0);

  const handlePositionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = parseInt(e.target.value);
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  const handleForceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newForce = parseInt(e.target.value);
    setForce(newForce);
    onForceChange(newForce);
  };

  const resetControls = () => {
    setPosition(0);
    setForce(0);
    onPositionChange(0);
    onForceChange(0);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-lg p-6 h-full border border-blue-400/30 hover:shadow-blue-400/20 hover:shadow-xl transition-all duration-300">
      <h3 className="text-lg font-medium mb-6 text-blue-400 flex items-center">
        <Sliders size={18} className="mr-2" />
        <span>Gripper Controls</span>
      </h3>
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-blue-300 flex items-center">
            <Grip size={16} className="mr-2" />
            Gripper Position
          </label>
          <span className="text-blue-400 font-bold text-lg">{position}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={position}
          onChange={handlePositionChange}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Open</span>
          <span>Closed</span>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-blue-300 flex items-center">
            <span className="inline-block w-4 h-4 bg-blue-500 rounded-full mr-2 flex items-center justify-center">
              <span className="w-2 h-2 bg-blue-200 rounded-full"></span>
            </span>
            Force
          </label>
          <span className="text-blue-400 font-bold text-lg">{force}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={force}
          onChange={handleForceChange}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>Min</span>
          <span>Max</span>
        </div>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={resetControls} 
          className="flex items-center px-4 py-2 bg-blue-900/50 hover:bg-blue-800 transition-colors text-blue-300 rounded-md font-medium border border-blue-500/30"
        >
          <RotateCw size={16} className="mr-2" />
          Reset Controls
        </button>
      </div>
      
      {/* System readouts */}
      <div className="mt-8 border-t border-blue-500/20 pt-4">
        <h4 className="text-sm font-medium text-blue-400 mb-2">System Readouts</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-300">
          <div className="bg-slate-800 p-2 rounded border border-blue-500/20">
            <div className="text-slate-400">Power Draw</div>
            <div className="font-mono">1.2 kW</div>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-blue-500/20">
            <div className="text-slate-400">CPU Load</div>
            <div className="font-mono">27%</div>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-blue-500/20">
            <div className="text-slate-400">Memory</div>
            <div className="font-mono">314MB</div>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-blue-500/20">
            <div className="text-slate-400">Uptime</div>
            <div className="font-mono">3h 24m</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;