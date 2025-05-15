export class ArduinoService {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader | null = null;
  private writer: WritableStreamDefaultWriter | null = null;
  private isConnected = false;

  async connect() {
    try {
      // Request port and open it
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      
      // Set up reading
      const textDecoder = new TextDecoderStream();
      this.port.readable.pipeTo(textDecoder.writable);
      const readableStreamClosed = this.port.readableClosed;
      const reader = textDecoder.readable.getReader();
      this.reader = reader;

      // Set up writing
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }
    if (this.writer) {
      await this.writer.close();
      this.writer = null;
    }
    if (this.port) {
      await this.port.close();
      this.port = null;
    }
    this.isConnected = false;
  }

  async sendCommand(command: string) {
    if (!this.writer || !this.isConnected) {
      throw new Error('Not connected to Arduino');
    }
    await this.writer.write(command + '\n');
  }

  async readData(): Promise<string> {
    if (!this.reader || !this.isConnected) {
      throw new Error('Not connected to Arduino');
    }
    const { value, done } = await this.reader.read();
    if (done) {
      throw new Error('Stream closed');
    }
    return value;
  }

  isDeviceConnected() {
    return this.isConnected;
  }
}

export const arduinoService = new ArduinoService(); 