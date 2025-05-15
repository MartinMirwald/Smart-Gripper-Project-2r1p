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
last_arduino_read_time = 0
ARDUINO_TIMEOUT = 5  # seconds

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

async def reconnect_arduino():
    """Attempt to reconnect to Arduino"""
    global arduino
    if arduino and arduino.is_open:
        arduino.close()
    
    port = get_arduino_port()
    if port:
        try:
            arduino = serial.Serial(
                port=port,
                baudrate=115200,
                timeout=1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            print(f"Reconnected to Arduino on {port}")
            return True
        except Exception as e:
            print(f"Failed to reconnect to Arduino: {e}")
    return False

@app.on_event("startup")
async def startup_event():
    """Initialize Arduino connection on startup"""
    global arduino
    port = get_arduino_port()
    if port:
        try:
            print(f"\nAttempting to connect to {port}...")
            arduino = serial.Serial(
                port=port,
                baudrate=115200,
                timeout=1,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE
            )
            print(f"Successfully connected to Arduino on {port}")
            print("Waiting for Arduino to initialize...")
            await asyncio.sleep(2)  # Give Arduino time to reset
            
            # Test connection
            print("Testing connection...")
            arduino.write(b"PING\n")
            response = arduino.readline().decode().strip()
            if response == "PONG":
                print("Arduino connection verified!")
            else:
                print(f"Warning: Arduino response not as expected. Got: {response}")
                
        except Exception as e:
            print(f"\nFailed to connect to Arduino: {e}")
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
    if arduino and arduino.is_open:
        arduino.close()
        print("\nArduino connection closed")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            if arduino and arduino.is_open:
                try:
                    # Read data from Arduino
                    data = arduino.readline().decode().strip()
                    if data:
                        try:
                            # Parse the CSV data
                            x, y, z, output = map(float, data.split(','))
                            # Create JSON response
                            response = {
                                "magneticX": x,
                                "magneticY": y,
                                "magneticZ": z,
                                "output": output
                            }
                            # Send to all connected clients
                            await websocket.send_json(response)
                        except ValueError:
                            print(f"Invalid data format: {data}")
                            continue
                except Exception as e:
                    print(f"Error reading from Arduino: {e}")
                    # Try to reconnect if we haven't received data for a while
                    if time.time() - last_arduino_read_time > ARDUINO_TIMEOUT:
                        print("Attempting to reconnect to Arduino...")
                        if await reconnect_arduino():
                            last_arduino_read_time = time.time()
            await asyncio.sleep(0.1)  # 100ms delay
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        active_connections.remove(websocket)

@app.post("/command/{cmd}")
async def send_command(cmd: str):
    """Send a command to the Arduino"""
    if arduino and arduino.is_open:
        try:
            arduino.write(f"{cmd}\n".encode())
            return {"status": "success", "message": f"Command {cmd} sent"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "error", "message": "Arduino not connected"}

@app.post("/position/{position}")
async def set_position(position: int):
    """Set the gripper position (0-100)"""
    if not 0 <= position <= 100:
        return {"status": "error", "message": "Position must be between 0 and 100"}
    
    if arduino and arduino.is_open:
        try:
            # Convert position to voltage (0-100 to 0-6V)
            voltage = (position / 100) * 6
            arduino.write(f"position {voltage}\n".encode())
            return {"status": "success", "message": f"Position set to {position}%"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {"status": "error", "message": "Arduino not connected"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 