export class ArduinoService {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private messageHandlers: ((data: any) => void)[] = [];

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
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(handler => handler(data));
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

  onData(handler: (data: any) => void) {
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