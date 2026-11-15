# Auto-Aiming Turret - Vision Node

The **Vision Node** is the core computer vision and tracking service for the Auto-Aiming Turret thesis project. Built with Python, OpenCV, YOLOv8 Nano (`yolov8n.pt`), FastAPI, and `paho-mqtt` over secure TLS.

---

## 🛠 Features

1. **Real-time Video Capture:** Captures live webcam feed using OpenCV (with graceful fallback simulation mode if physical camera is unplugged).
2. **YOLOv8 Target Detection:** Performs lightweight target detection (`yolov8n.pt`) with real-time error coordinate calculation `(dx, dy)` relative to frame center.
3. **Secure MQTT Connectivity:** Connects to HiveMQ Cloud over TLS (Port 8883) to send tracking error streams to the ESP32 hardware node and receive target configuration / mode changes from the Next.js dashboard.
4. **MJPEG Video Streaming:** Serves high-performance MJPEG video feed over FastAPI for real-time browser preview.
5. **Snapshot & Fire System:** Captures timestamped frame snapshots (`snapshots/snapshot_YYYYMMDD_HHMMSS.jpg`) on manual or automated fire commands.

---

## 📁 Directory Structure

```text
vision-node/
├── .env                  # Live environment configuration
├── .env.example          # Template environment variables
├── .gitignore            # Git ignore rules
├── requirements.txt      # Python dependencies
├── mqtt_client.py        # HiveMQ TLS MQTT client & topic manager
├── vision_core.py        # YOLOv8 tracking engine & HUD renderer
├── main.py               # FastAPI server & MJPEG streaming endpoint
└── snapshots/            # Directory for saved target snapshots
```

---

## 🚀 Quickstart Guide

### 1. Environment Setup

From the root project directory (`D:\applications\auto-aim-turret`):

```bash
cd vision-node
```

Create and activate a Python virtual environment:

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
python -m venv venv
.\venv\Scripts\activate.bat
```

### 2. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Environment Variables Configuration

Copy `.env.example` to `.env` (already pre-configured for your HiveMQ Cloud broker):

```env
MQTT_BROKER=d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=dash-auto-aim
MQTT_PASSWORD=dash1234

WEBCAM_INDEX=0
FRAME_WIDTH=640
FRAME_HEIGHT=480
YOLO_MODEL=yolov8n.pt
CONFIDENCE_THRESHOLD=0.5

FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=8000
```

### 4. Run the Vision Node Server

```bash
python main.py
```
*Or using uvicorn directly:*
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📡 API & Streaming Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `http://localhost:8000/video_feed` | `GET` | **MJPEG Live Video Stream** (Used by Next.js `<img src="..." />`) |
| `http://localhost:8000/health` | `GET` | Health check (Camera, MQTT connection status) |
| `http://localhost:8000/status` | `GET` | Live telemetry JSON (`target`, `mode`, `fps`, `dx`, `dy`) |
| `http://localhost:8000/config` | `POST` | Update target object or turret mode via HTTP |
| `http://localhost:8000/fire` | `POST` | Manually trigger snapshot & fire command |
| `http://localhost:8000/docs` | `GET` | Interactive Swagger API Documentation |

---

## 📡 MQTT Topic Architecture

### Subscribed Topics (Inputs)
- `dimaspe/turret/control/config`: Sets active target (e.g. `{"target": "person"}`)
- `dimaspe/turret/control/mode`: Toggles turret mode (`{"mode": "auto"}` or `{"mode": "manual"}`)
- `dimaspe/turret/control/fire`: Triggers snapshot capture and fire command

### Published Topics (Outputs)
- `dimaspe/turret/vision/error`: Servo tracking offsets for ESP32 (`{"dx": -42, "dy": 15}`)
- `dimaspe/turret/hardware/fire`: Firing trigger sent to ESP32 (`{"cmd": "FIRE", "timestamp": "2026-08-16 15:20:00"}`)
