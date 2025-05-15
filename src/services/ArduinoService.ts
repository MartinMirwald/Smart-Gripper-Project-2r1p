export interface SensorData {
  magneticX: number;
  magneticY: number;
  magneticZ: number;
  output: number;
  distance: number;
}

export interface ArduinoMessage {
  type: 'sensor_data' | 'command_response' | 'raw_message';
  data: SensorData | string;
}

export class ArduinoService {
  private ws: WebSocket | null = null;
  private isWebSocketConnected = false;
  private isArduinoConnected = false;
  private messageHandlers: ((data: any) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private upperVoltageLimit = 6.0;
  private lowerVoltageLimit = 0.0;

  async connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8000/ws');
      
      this.ws.onopen = () => {
        this.isWebSocketConnected = true;
        console.log('Connected to backend');
      };

      this.ws.onclose = () => {
        this.isWebSocketConnected = false;
        console.log('Disconnected from backend');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isWebSocketConnected = false;
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
      };

      return true;
    } catch (error) {
      console.error('Error connecting to backend:', error);
      this.isWebSocketConnected = false;
      return false;
    }
  }

  async sendCommand(command: string) {
    try {
      const response = await fetch(`http://localhost:8000/command/${command}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  }

  async setPosition(position: number) {
    try {
      const response = await fetch(`http://localhost:8000/position/${position}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error setting position:', error);
      throw error;
    }
  }

  async setVoltageLimits(upper: number, lower: number) {
    try {
      const response = await fetch('http://localhost:8000/voltage-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upper, lower }),
      });
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      this.upperVoltageLimit = upper;
      this.lowerVoltageLimit = lower;
    } catch (error) {
      console.error('Error setting voltage limits:', error);
      throw error;
    }
  }

  onMessage(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWebSocketConnected = false;
  }

  async sendSensorData(sensorData: SensorData) {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
    }
    try {
      const response = await fetch('http://localhost:8000/sensor-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sensorData),
      });
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Error sending sensor data:', error);
      throw error;
    }
  }

  async getSensorData(): Promise<SensorData> {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
    }
    try {
      const response = await fetch('http://localhost:8000/sensor-data');
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      return data as SensorData;
    } catch (error) {
      console.error('Error getting sensor data:', error);
      throw error;
    }
  }

  async getCommandResponse(): Promise<string> {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
    }
    try {
      const response = await fetch('http://localhost:8000/command-response');
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      return data as string;
    } catch (error) {
      console.error('Error getting command response:', error);
      throw error;
    }
  }

  async getRawMessage(): Promise<string> {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
    }
    try {
      const response = await fetch('http://localhost:8000/raw-message');
      const data = await response.json();
      if (data.status === 'error') {
        throw new Error(data.message);
      }
      return data as string;
    } catch (error) {
      console.error('Error getting raw message:', error);
      throw error;
    }
  }

  isDeviceConnected() {
    return this.isArduinoConnected;
  }

  getVoltageLimits() {
    return {
      upper: this.upperVoltageLimit,
      lower: this.lowerVoltageLimit,
    };
  }
}

export const arduinoService = new ArduinoService(); 