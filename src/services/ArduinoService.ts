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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 10000; // Max 10 seconds
  private connectionChangeCallbacks: ((connected: boolean) => void)[] = [];
  private dataCallbacks: ((data: any) => void)[] = [];
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private upperVoltageLimit = 6.0;
  private lowerVoltageLimit = 0.0;

  constructor() {
    this.connect();
  }

  private connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    console.log('Connecting to backend...');

    try {
      this.ws = new WebSocket('ws://localhost:8000/ws');

      this.ws.onopen = () => {
        console.log('Connected to backend');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionChange(true);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from backend');
        this.isConnecting = false;
        this.notifyConnectionChange(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.dataCallbacks.forEach(callback => callback(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionChangeCallbacks.forEach(callback => callback(connected));
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionChangeCallbacks.push(callback);
    // Immediately notify of current state
    callback(this.ws?.readyState === WebSocket.OPEN);
    return () => {
      this.connectionChangeCallbacks = this.connectionChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  onData(callback: (data: any) => void) {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
    }

    try {
      const response = await fetch(`http://localhost:8000/command/${command}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send command: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending command:', error);
      throw error;
    }
  }

  async setPosition(position: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
    }

    try {
      const response = await fetch(`http://localhost:8000/position/${position}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to set position: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error setting position:', error);
      throw error;
    }
  }

  async setVoltageLimits(upper: number, lower: number): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
    }

    try {
      const response = await fetch('http://localhost:8000/voltage-limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ upper, lower })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to set voltage limits: ${response.statusText}`);
      }
      this.upperVoltageLimit = upper;
      this.lowerVoltageLimit = lower;
    } catch (error) {
      console.error('Error setting voltage limits:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async sendSensorData(sensorData: SensorData) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected to backend');
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
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getVoltageLimits() {
    return {
      upper: this.upperVoltageLimit,
      lower: this.lowerVoltageLimit,
    };
  }
}

export const arduinoService = new ArduinoService(); 