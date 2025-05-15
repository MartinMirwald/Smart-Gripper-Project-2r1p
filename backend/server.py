from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import serial
import asyncio
import json
from typing import List, Dict
import serial.tools.list_ports

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

def get_arduino_port():
    """Find the Arduino port automatically"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "Arduino" in port.description or "USB Serial" in port.description:
            return port.device
    return None

@app.on_event("startup")
async def startup_event():
    """Initialize Arduino connection on startup"""
    global arduino
    port = get_arduino_port()
    if port:
        try:
            arduino = serial.Serial(port, 115200, timeout=1)
            print(f"Connected to Arduino on {port}")
        except Exception as e:
            print(f"Failed to connect to Arduino: {e}")
    else:
        print("No Arduino found")

@app.on_event("shutdown")
async def shutdown_event():
    """Close Arduino connection on shutdown"""
    if arduino and arduino.is_open:
        arduino.close()

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
                except Exception as e:
                    print(f"Error reading from Arduino: {e}")
            await asyncio.sleep(0.1)  # 100ms delay
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