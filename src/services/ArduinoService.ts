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
        // Check Arduino connection
        this.checkArduinoConnection();
        console.log('Connected to backend');
      };

      this.ws.onclose = () => {
        this.isWebSocketConnected = false;
        this.isArduinoConnected = false;
        this.notifyConnectionChange(false);
        console.log('Disconnected from backend');
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isWebSocketConnected = false;
        this.isArduinoConnected = false;
        this.notifyConnectionChange(false);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // If we receive data, Arduino must be connected
        if (!this.isArduinoConnected) {
          this.isArduinoConnected = true;
          this.notifyConnectionChange(true);
        }
        this.messageHandlers.forEach(handler => handler(data));
      };

      return true;
    } catch (error) {
      console.error('Error connecting to backend:', error);
      this.isWebSocketConnected = false;
      this.isArduinoConnected = false;
      this.notifyConnectionChange(false);
      return false;
    }
  }

  private async checkArduinoConnection() {
    try {
      const response = await fetch('http://localhost:8000/command/PING', {
        method: 'POST',
      });
      const data = await response.json();
      this.isArduinoConnected = data.status === 'success';
      this.notifyConnectionChange(this.isArduinoConnected);
    } catch (error) {
      console.error('Error checking Arduino connection:', error);
      this.isArduinoConnected = false;
      this.notifyConnectionChange(false);
    }
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isWebSocketConnected = false;
    this.isArduinoConnected = false;
    this.notifyConnectionChange(false);
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler);
    // Immediately notify of current state
    handler(this.isArduinoConnected);
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler);
    };
  }

  private notifyConnectionChange(connected: boolean) {
    this.connectionHandlers.forEach(handler => handler(connected));
  }

  async sendCommand(command: string) {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
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
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
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

  onData(handler: (data: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  isDeviceConnected() {
    return this.isArduinoConnected;
  }

  async setVoltageLimits(upper: number, lower: number) {
    if (!this.isWebSocketConnected) {
      throw new Error('Not connected to backend');
    }
    if (!this.isArduinoConnected) {
      throw new Error('Arduino not connected');
    }
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

  getVoltageLimits() {
    return {
      upper: this.upperVoltageLimit,
      lower: this.lowerVoltageLimit,
    };
  }
}

export const arduinoService = new ArduinoService(); 