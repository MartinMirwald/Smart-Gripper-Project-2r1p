export interface SensorData {
  magneticX: number;
  magneticY: number;
  magneticZ: number;
  output: number;
}

export interface ArduinoMessage {
  type: 'sensor_data' | 'command_response' | 'raw_message';
  data: SensorData | string;
}

export class ArduinoService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private messageHandlers: ((data: ArduinoMessage) => void)[] = [];

  async connect() {
    try {
      this.ws = new WebSocket('ws://localhost:8000/ws');
      
      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('Connected to backend');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('Disconnected from backend');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
      };

      this.ws.onmessage = (event) => {
        const message: ArduinoMessage = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(message));
      };

      return true;
    } catch (error) {
      console.error('Error connecting to backend:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }

  async sendCommand(command: string) {
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }
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
    if (!this.isConnected) {
      throw new Error('Not connected to backend');
    }
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

  async hold() {
    return this.sendCommand('hold');
  }

  async open() {
    return this.sendCommand('open');
  }

  async close() {
    return this.sendCommand('close');
  }

  onData(handler: (data: ArduinoMessage) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  isDeviceConnected() {
    return this.isConnected;
  }
}

export const arduinoService = new ArduinoService(); 