import React from 'react';

interface GripperVisualizationProps {
  position: number; // 0-100 where 0 is fully closed and 100 is fully open
  force: number; // 0-100 percentage of maximum force
}

const GripperVisualization: React.FC<GripperVisualizationProps> = ({ position, force }) => {
  // Clamp position between 0 and 100
  const clampedPosition = Math.max(0, Math.min(100, position));
  
  // Calculate gripper position for visualization
  const openAmount = clampedPosition; // No inversion needed - Arduino sends 0=closed, 100=open
  // Move fingers slightly to the right by adjusting the base positions
  const leftFingerPosition = `calc(46.55% - ${25 + openAmount/3}px)`;
  const rightFingerPosition = `calc(46.3% + ${25 + openAmount/3}px)`;
  
  // Calculate color based on force
  const forceColor = force < 30 ? 'bg-blue-500' : 
                    force < 70 ? 'bg-yellow-500' : 
                    'bg-red-500';
  
  // Calculate distance between fingers
  const distanceMm = Math.max(5, Math.round(clampedPosition * 0.5));
  
  // Show warning if position is out of range
  const isOutOfRange = position < 0 || position > 100;
  
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg shadow-lg p-4 h-full border border-blue-500/30 shadow-blue-500/10">
      <h3 className="text-sm font-medium mb-2 text-blue-400 flex items-center">
        <span className="mr-2">Robotic Gripper</span>
        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/20">Real-time</span>
      </h3>
      
      <div className="relative bg-black/80 rounded-lg flex items-center justify-center overflow-hidden backdrop-blur-sm" style={{ height: 'calc(100% - 30px)' }}>
        {/* Visualization background with futuristic grid */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 gap-2 opacity-20">
          {Array.from({ length: 144 }).map((_, index) => (
            <div key={index} className="border-blue-500/30 border-b border-r"></div>
          ))}
        </div>
        
        {/* Tech readout circles and scanlines - decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-1/4 left-1/4 w-16 h-16 rounded-full border border-blue-300/60 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-12 h-12 rounded-full border border-blue-300/60"></div>
          <div className="h-full w-full flex flex-col justify-between">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-px bg-blue-400/20"></div>
            ))}
          </div>
        </div>
        
        {/* Base of the robotic arm with LED indicator */}
        <div className="absolute bottom-24 w-60 h-16 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-lg shadow-inner flex justify-center" style={{ left: 'calc(50% - 120px)' }}>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-slate-950 rounded-t-md flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${position > 80 ? 'bg-red-500' : 'bg-blue-500'} animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]`}></div>
          </div>
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-blue-300 bg-slate-900/80 px-2 py-1 rounded border border-blue-400/20">
          </div>
        </div>
        
        {/* Central pneumatic/hydraulic cylinder */}
        <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 w-10 h-32 bg-gradient-to-b from-slate-700 to-slate-800 rounded-t-md border-x border-t border-slate-600/50" style={{ left: '50%' }}>
          <div className="absolute inset-x-0 top-0 h-4 bg-slate-600 border-b border-slate-700"></div>
          <div className="absolute inset-x-0 top-10 h-2 bg-slate-600 border-y border-slate-700"></div>
          <div className="absolute inset-x-0 top-20 h-2 bg-slate-600 border-y border-slate-700"></div>
          
          {/* Pressure indicators on cylinder */}
          <div className="absolute top-5 left-1/2 transform -translate-x-1/2 flex space-x-3">
            <div className={`w-1.5 h-1.5 rounded-full ${forceColor} opacity-80 shadow-[0_0_5px_rgba(59,130,246,0.8)]`}></div>
          </div>
          
          {/* Hydraulic lines */}
          <div className="absolute -left-3 top-1/4 w-3 h-1 bg-slate-600"></div>
          <div className="absolute -right-3 top-1/4 w-3 h-1 bg-slate-600"></div>
          <div className="absolute -left-3 top-2/4 w-3 h-1 bg-slate-600"></div>
          <div className="absolute -right-3 top-2/4 w-3 h-1 bg-slate-600"></div>
        </div>
        
        {/* Central joint mechanism */}
        <div className="absolute bottom-72 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-slate-800 rounded-md border border-slate-700 flex justify-center items-center" style={{ left: '50%' }}>
          <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-600 flex justify-center items-center">
            <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600"></div>
          </div>
        </div>
        
        {/* Left gripper arm */}
        <div 
          className="absolute w-10 h-28 bg-gradient-to-b from-slate-600 to-slate-700 rounded-md shadow-lg overflow-hidden"
          style={{ 
            top: '120px',
            left: leftFingerPosition, 
            transition: 'left 0.5s ease',
            transform: `rotate(0deg)`,
            transformOrigin: 'bottom center'
          }}
        >
          {/* Mechanical details on finger */}
          <div className="absolute inset-x-0 top-0 h-3 bg-slate-500 border-b border-slate-800"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent"></div>
          
          {/* Metal ridges for grip */}
          <div className="absolute inset-x-0 top-3 h-18 flex flex-col justify-around px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-1.5 w-full bg-slate-500 rounded-sm border-b border-slate-800"></div>
            ))}
          </div>
          
          {/* Pressure sensor area */}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-800 border-t border-blue-500/30 flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${forceColor} opacity-80 shadow-[0_0_5px_rgba(59,130,246,0.8)]`}></div>
          </div>
        </div>
        
        {/* Right gripper arm */}
        <div 
          className="absolute w-10 h-28 bg-gradient-to-b from-slate-600 to-slate-700 rounded-md shadow-lg overflow-hidden"
          style={{ 
            top: '120px',
            left: rightFingerPosition, 
            transition: 'left 0.5s ease',
            transform: `rotate(0deg)`,
            transformOrigin: 'bottom center'
          }}
        >
          {/* Mechanical details on finger - mirror of left finger */}
          <div className="absolute inset-x-0 top-0 h-3 bg-slate-500 border-b border-slate-800"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/5 to-transparent"></div>
          
          {/* Metal ridges for grip */}
          <div className="absolute inset-x-0 top-3 h-18 flex flex-col justify-around px-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-1.5 w-full bg-slate-500 rounded-sm border-b border-slate-800"></div>
            ))}
          </div>
          
          {/* Pressure sensor area - mirror of left finger */}
          <div className="absolute inset-x-0 bottom-0 h-6 bg-slate-800 border-t border-blue-500/30 flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${forceColor} opacity-80 shadow-[0_0_5px_rgba(59,130,246,0.8)]`}></div>
          </div>
        </div>

        {/* Force indicator */}
        <div className="absolute top-3 left-3 bg-slate-900/90 p-2 rounded-md shadow-lg backdrop-blur-sm border border-blue-400/20 z-10">
          <div className="text-xs font-medium text-blue-400 flex items-center">
            <span className="mr-2">Force</span>
            <span className={`w-1.5 h-1.5 rounded-full ${forceColor}`}></span>
          </div>
          <div className="bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full ${forceColor} transition-all duration-300`}
              style={{ width: `${force}%` }}
            ></div>
          </div>
          <div className="text-xs text-right mt-1 font-medium text-blue-300">{force}%</div>
        </div>
        
        {/* Position and distance indicator */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 p-2 rounded-md shadow-lg backdrop-blur-sm border border-blue-400/20 z-10">
          <div className="text-xs font-medium text-blue-400">Position</div>
          <div className="text-right font-bold text-xs text-blue-300">
            {Math.round(clampedPosition)}%
            {isOutOfRange && (
              <span className="ml-1 text-yellow-500">(clamped)</span>
            )}
          </div>
          <div className="text-xs text-blue-400 mt-1">Distance: {distanceMm}mm</div>
          {isOutOfRange && (
            <div className="text-xs text-yellow-500 mt-1">
              Raw: {position.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GripperVisualization;
