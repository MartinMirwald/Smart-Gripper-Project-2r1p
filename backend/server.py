from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import serial
import asyncio
import json
from typing import List, Dict
import serial.tools.list_ports
import sys
import time

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active connections
active_connections: List[WebSocket] = []
arduino = None

class ArduinoConnection:
    def __init__(self):
        self.serial = None
        self.last_read_time = 0
        self.is_connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 3

    def connect(self, port: str) -> bool:
        try:
            if self.serial and self.serial.is_open:
                self.serial.close()
            
            self.serial = serial.Serial(
                port=port,
                baudrate=115200,
                timeout=1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            self.is_connected = True
            self.last_read_time = time.time()
            self.reconnect_attempts = 0
            return True
        except Exception as e:
            print(f"Failed to connect to Arduino: {e}")
            self.is_connected = False
            return False

    def disconnect(self):
        if self.serial and self.serial.is_open:
            try:
                self.serial.close()
            except Exception as e:
                print(f"Error closing serial connection: {e}")
        self.is_connected = False

    def read_data(self) -> str:
        if not self.is_connected:
            return None
            
        try:
            if not self.serial or not self.serial.is_open:
                self.is_connected = False
                return None
                
            # Check if there's data to read
            if not self.serial.in_waiting:
                return None
                
            # Read raw bytes first
            raw_data = self.serial.readline()
            if not raw_data:
                return None
                
            try:
                # Try UTF-8 first
                data = raw_data.decode('utf-8').strip()
            except UnicodeDecodeError:
                try:
                    # Fallback to latin-1 which can handle any byte value
                    data = raw_data.decode('latin-1').strip()
                except Exception as e:
                    print(f"Error decoding data: {e}")
                    return None
                    
            if data:
                self.last_read_time = time.time()
            return data
        except serial.SerialException as e:
            print(f"Serial error: {e}")
            self.is_connected = False
            return None
        except Exception as e:
            print(f"Error reading from Arduino: {e}")
            return None

    def write_command(self, command: str) -> bool:
        if not self.is_connected:
            return False
            
        try:
            if not self.serial or not self.serial.is_open:
                self.is_connected = False
                return False
                
            self.serial.write(f"{command}\n".encode())
            return True
        except Exception as e:
            print(f"Error writing to Arduino: {e}")
            self.is_connected = False
            return False

arduino_conn = ArduinoConnection()

def get_arduino_port():
    """Find the Arduino port automatically"""
    print("\nSearching for Arduino...")
    ports = serial.tools.list_ports.comports()
    
    if not ports:
        print("No serial ports found!")
        return None
        
    print("\nAvailable ports:")
    for port in ports:
        vid_pid = f"(VID:PID={port.vid:04x}:{port.pid:04x})" if port.vid and port.pid else ""
        print(f"- {port.device}: {port.description} {vid_pid}")
    
    # Try to find Arduino by common identifiers
    for port in ports:
        # Check both description and hardware ID
        port_info = f"{port.description} {port.hwid}".lower()
        if any(identifier in port_info for identifier in [
            "arduino",
            "usb serial",
            "usb-uart",
            "ch340",  # Common Arduino clone chip
            "cp210x",  # Common Arduino clone chip
            "ftdi",    # Common Arduino clone chip
            "acm",     # Linux Arduino identifier
            "ttyusb",  # Linux USB serial
            "ttyacm"   # Linux ACM serial
        ]):
            print(f"\nFound potential Arduino on {port.device}")
            print(f"Description: {port.description}")
            print(f"Hardware ID: {port.hwid}")
            return port.device
            
    # If no Arduino found by description, list all ports and ask user
    print("\nNo Arduino automatically detected.")
    print("Available ports:")
    for i, port in enumerate(ports, 1):
        vid_pid = f"(VID:PID={port.vid:04x}:{port.pid:04x})" if port.vid and port.pid else ""
        print(f"{i}. {port.device}: {port.description} {vid_pid}")
    
    try:
        choice = int(input("\nEnter the number of the port to use: "))
        if 1 <= choice <= len(ports):
            selected_port = ports[choice - 1].device
            print(f"Selected port: {selected_port}")
            return selected_port
    except (ValueError, IndexError):
        print("Invalid selection!")
    
    return None

@app.on_event("startup")
async def startup_event():
    """Initialize Arduino connection on startup"""
    port = get_arduino_port()
    if port:
        if arduino_conn.connect(port):
            print(f"Successfully connected to Arduino on {port}")
            print("Waiting for Arduino to initialize...")
            await asyncio.sleep(2)  # Give Arduino time to reset
            
            # Test connection
            print("Testing connection...")
            arduino_conn.write_command("PING")
            
            # Try to get PONG response, but also accept sensor data as valid
            for _ in range(5):  # Try up to 5 times
                response = arduino_conn.read_data()
                if response == "PONG":
                    print("Arduino connection verified!")
                    break
                elif response and ',' in response:  # If we get sensor data, that's also fine
                    print("Arduino connection verified (receiving sensor data)")
                    break
                await asyncio.sleep(0.5)  # Wait a bit before next try
            else:
                print("Warning: Could not verify Arduino response, but continuing anyway")
        else:
            print("\nFailed to connect to Arduino")
            print("\nPlease check:")
            print("1. Arduino is properly connected")
            print("2. No other program is using the port")
            print("3. Correct port is selected")
            print("4. Arduino code is uploaded")
            print("5. You have permission to access the port (try: sudo chmod 666 /dev/ttyUSB0)")
    else:
        print("\nNo Arduino found. Please connect an Arduino and restart the server.")

@app.on_event("shutdown")
async def shutdown_event():
    """Close Arduino connection on shutdown"""
    arduino_conn.disconnect()
    print("\nArduino connection closed")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    print("WebSocket connection opened")
    
    try:
        while True:
            if arduino_conn.is_connected:
                data = arduino_conn.read_data()
                if data:
                    try:
                        # Try to parse as sensor data (CSV format)
                        if ',' in data:
                            values = data.split(',')
                            if len(values) >= 5:  # Make sure we have all expected values
                                try:
                                    x = float(values[0])
                                    y = float(values[1])
                                    z = float(values[2])
                                    output = float(values[3])
                                    distance = float(values[4])
                                    
                                    response = {
                                        "type": "sensor_data",
                                        "data": {
                                            "magneticX": x,
                                            "magneticY": y,
                                            "magneticZ": z,
                                            "output": output,
                                            "distance": distance
                                        }
                                    }
                                    await websocket.send_json(response)
                                except (ValueError, IndexError) as e:
                                    print(f"Error parsing sensor values: {e}")
                                    continue
                        else:
                            # Handle command responses
                            response = {
                                "type": "command_response",
                                "data": data
                            }
                            await websocket.send_json(response)
                    except Exception as e:
                        print(f"Error processing data: {e}")
                        continue
            await asyncio.sleep(0.01)  # Small delay to prevent CPU overuse
    except WebSocketDisconnect:
        print("WebSocket connection closed")
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)
    finally:
        # Ensure the connection is removed from active connections
        if websocket in active_connections:
            active_connections.remove(websocket)
        print("WebSocket connection cleaned up")

@app.post("/command/{cmd}")
async def send_command(cmd: str):
    """Send a command to the Arduino"""
    if arduino_conn.is_connected:
        if arduino_conn.write_command(cmd):
            return {"status": "success", "message": f"Command {cmd} sent"}
        return {"status": "error", "message": "Failed to send command"}
    return {"status": "error", "message": "Arduino not connected"}

@app.post("/position/{position}")
async def set_position(position: int):
    """Set the gripper position (0-100)"""
    if not 0 <= position <= 100:
        return {"status": "error", "message": "Position must be between 0 and 100"}
    
    if arduino_conn.is_connected:
        voltage = (position / 100) * 6
        if arduino_conn.write_command(f"position {voltage}"):
            return {"status": "success", "message": f"Position set to {position}%"}
        return {"status": "error", "message": "Failed to set position"}
    return {"status": "error", "message": "Arduino not connected"}

@app.post("/voltage-limits")
async def set_voltage_limits(limits: Dict[str, float]):
    """Set the upper and lower voltage limits for the gripper"""
    if not arduino_conn.is_connected:
        return {"status": "error", "message": "Arduino not connected"}
    
    upper = limits.get("upper")
    lower = limits.get("lower")
    
    if upper is None or lower is None:
        return {"status": "error", "message": "Both upper and lower limits are required"}
    
    if not 0 <= lower <= upper <= 12:
        return {"status": "error", "message": "Invalid voltage limits. Must be between 0 and 12V, and lower limit must be less than upper limit"}
    
    # Send commands to Arduino
    if arduino_conn.write_command(f"upperlimit {upper}") and arduino_conn.write_command(f"lowerlimit {lower}"):
        return {"status": "success", "message": f"Voltage limits set to {lower}V - {upper}V"}
    return {"status": "error", "message": "Failed to set voltage limits"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 