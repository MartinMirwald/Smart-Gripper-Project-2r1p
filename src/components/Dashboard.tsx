import React, { useState } from 'react';
import GripperVisualization from './GripperVisualization';
import ControlPanel from './ControlPanel';
import StatusDisplay from './StatusDisplay';

const Dashboard: React.FC = () => {
  const [position, setPosition] = useState(50);
  const [force, setForce] = useState(0);
  
  // This would normally come from an API or websocket
  const statusData = {
    torque: 2.4,
    temperature: 42,
    voltage: 12.6,
    connected: true,
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen">
      <h2 className="text-xl font-bold mb-6 text-blue-400 border-b border-blue-500/20 pb-2">Gripper Control Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="w-full h-auto min-h-[400px] max-h-[600px]">
          <GripperVisualization position={position} force={force} />
        </div>
        <div className="w-full">
          <ControlPanel 
            onPositionChange={setPosition} 
            onForceChange={setForce} 
          />
        </div>
      </div>
      
      <div className="mb-6">
        <StatusDisplay {...statusData} />
      </div>
    </div>
  );
};

export default Dashboard;