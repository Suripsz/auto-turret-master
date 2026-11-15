import os
import cv2
import time
import json
import logging
import threading
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, HTTPException, Body
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from vision_core import VisionTracker
from mqtt_client import TurretMQTTClient

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("VisionMain")

# Configuration settings
WEBCAM_INDEX = int(os.getenv("WEBCAM_INDEX", "0"))
FRAME_WIDTH = int(os.getenv("FRAME_WIDTH", "640"))
FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", "480"))
FASTAPI_HOST = os.getenv("FASTAPI_HOST", "0.0.0.0")
FASTAPI_PORT = int(os.getenv("FASTAPI_PORT", "5000"))

class WebcamStream:
    """
    Threaded OpenCV VideoCapture stream to prevent frame buffer lag and blocking.
    Falls back gracefully to a synthetic test pattern frame if camera device is unavailable.
    """
    def __init__(self, src: int = 0, width: int = 640, height: int = 480):
        self.src = src
        self.width = width
        self.height = height
        self.cap = cv2.VideoCapture(self.src, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)

        self.stopped = False
        self.frame = None
        self.is_camera_open = self.cap.isOpened()

        if self.is_camera_open:
            ret, self.frame = self.cap.read()
            if not ret or self.frame is None:
                self.is_camera_open = False
                logger.warning(f"Webcam at index {self.src} opened but failed to read frame.")
            else:
                logger.info(f"Webcam initialized successfully at index {self.src} ({self.width}x{self.height}).")
        else:
            logger.warning(f"Unable to open physical webcam at index {self.src}. Operating in fallback test mode.")

        self.lock = threading.Lock()
        self.thread = threading.Thread(target=self._update, daemon=True)

    def start(self):
        self.stopped = False
        self.thread.start()
        return self

    def _update(self):
        while not self.stopped:
            if self.is_camera_open:
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self.lock:
                        self.frame = frame
                else:
                    time.sleep(0.01)
            else:
                # Generate synthetic test pattern if camera isn't attached
                blank_frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
                t = time.time()
                cx = int(self.width / 2 + 150 * np.sin(t))
                cy = int(self.height / 2 + 100 * np.cos(t))
                # Draw simulated moving target
                cv2.circle(blank_frame, (cx, cy), 35, (0, 0, 255), -1)
                cv2.putText(blank_frame, "SIMULATION / TEST MODE", (20, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                cv2.putText(blank_frame, f"Time: {time.strftime('%H:%M:%S')}", (20, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (250, 250, 250), 1)
                with self.lock:
                    self.frame = blank_frame
                time.sleep(0.033)

    def read(self) -> np.ndarray:
        with self.lock:
            return self.frame.copy() if self.frame is not None else None

    def stop(self):
        self.stopped = True
        if self.thread.is_alive():
            self.thread.join(timeout=1.0)
        if self.cap.isOpened():
            self.cap.release()
        logger.info("Webcam stream stopped.")

# Global references
vision_tracker: VisionTracker = None
mqtt_client: TurretMQTTClient = None
webcam_stream: WebcamStream = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global vision_tracker, mqtt_client, webcam_stream

    logger.info("Initializing Vision Node service components...")
    
    # 1. Initialize Vision Tracker Core
    vision_tracker = VisionTracker(model_path="yolov8n.pt", confidence=0.5)

    # 2. Initialize MQTT Client
    mqtt_client = TurretMQTTClient(vision_tracker=vision_tracker)
    mqtt_client.start()

    # 3. Initialize Webcam Stream
    webcam_stream = WebcamStream(src=WEBCAM_INDEX, width=FRAME_WIDTH, height=FRAME_HEIGHT).start()

    logger.info("Vision Node startup complete. Ready for streaming & tracking.")
    yield

    # Shutdown sequence
    logger.info("Shutting down Vision Node service...")
    if webcam_stream:
        webcam_stream.stop()
    if mqtt_client:
        mqtt_client.stop()
    logger.info("Vision Node shutdown finished.")

app = FastAPI(
    title="Auto-Aiming Turret Vision Node API",
    description="Real-time YOLOv8 Target Tracking & MJPEG Video Streamer",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js Frontend Integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_mjpeg_frames():
    """Generator function yielding multipart MJPEG frames for streaming endpoint."""
    while True:
        if webcam_stream is None or vision_tracker is None:
            time.sleep(0.1)
            continue

        raw_frame = webcam_stream.read()
        if raw_frame is None:
            time.sleep(0.01)
            continue

        # Process frame with YOLOv8 & publish error offsets over MQTT
        annotated_frame = vision_tracker.process_frame(raw_frame, mqtt_client=mqtt_client)

        if annotated_frame is None:
            continue

        # Encode frame as JPEG
        ret, jpeg_bytes = cv2.imencode('.jpg', annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ret:
            continue

        # Yield frame in multipart format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + jpeg_bytes.tobytes() + b'\r\n')
        
        # Cap FPS to ~30 to optimize CPU load
        time.sleep(0.015)

@app.get("/")
def read_root():
    return {
        "service": "Auto-Aiming Turret Vision Node",
        "status": "online",
        "endpoints": {
            "video_feed": "/video_feed",
            "health": "/health",
            "status": "/status",
            "docs": "/docs"
        }
    }

@app.get("/video_feed")
def video_feed():
    """Endpoint serving real-time MJPEG video stream."""
    return StreamingResponse(
        generate_mjpeg_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/health")
def health_check():
    """Health check endpoint."""
    camera_active = webcam_stream.is_camera_open if webcam_stream else False
    mqtt_active = mqtt_client.connected if mqtt_client else False
    return {
        "status": "healthy" if (camera_active or True) else "degraded",
        "camera_connected": camera_active,
        "mqtt_connected": mqtt_active,
        "active_target": vision_tracker.get_target() if vision_tracker else None,
        "current_mode": vision_tracker.get_mode() if vision_tracker else None
    }

@app.get("/status")
def status_info():
    """Detailed telemetry and tracking status endpoint."""
    if not vision_tracker:
        raise HTTPException(status_code=503, detail="Vision tracker not initialized")

    return {
        "target": vision_tracker.get_target(),
        "mode": vision_tracker.get_mode(),
        "fps": round(vision_tracker.fps, 1),
        "target_detected": vision_tracker.target_detected,
        "error_offset": {
            "dx": vision_tracker.last_dx
        },
        "mqtt_status": "connected" if mqtt_client and mqtt_client.connected else "disconnected"
    }

@app.post("/config")
def update_config(payload: dict = Body(...)):
    """API endpoint to update active tracking target or mode via HTTP."""
    if not vision_tracker:
        raise HTTPException(status_code=503, detail="Vision tracker not initialized")

    updated = {}
    if "target" in payload:
        vision_tracker.set_target(payload["target"])
        updated["target"] = vision_tracker.get_target()

    if "mode" in payload:
        vision_tracker.set_mode(payload["mode"])
        updated["mode"] = vision_tracker.get_mode()

    return {"status": "success", "updated": updated}

@app.post("/fire")
def trigger_fire():
    """API endpoint to manually trigger snapshot and fire command."""
    if not vision_tracker:
        raise HTTPException(status_code=503, detail="Vision tracker not initialized")

    raw_frame = webcam_stream.read() if webcam_stream else None
    snapshot_path = vision_tracker.trigger_fire_event(frame=raw_frame, mqtt_client=mqtt_client)

    return {
        "status": "success",
        "message": "Fire command issued to hardware",
        "snapshot": snapshot_path
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=FASTAPI_HOST, port=FASTAPI_PORT, reload=False)
