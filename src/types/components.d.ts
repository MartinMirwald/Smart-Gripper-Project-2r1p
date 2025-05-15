
// Component type definitions
export interface StatusDisplayProps {
  torque: number;
  temperature: number;
  voltage: number;
  connected: boolean;
}

export interface ControlPanelProps {
  onPositionChange: (position: number) => void;
  onForceChange: (force: number) => void;
}

export interface GripperVisualizationProps {
  position: number;
  force: number;
}
