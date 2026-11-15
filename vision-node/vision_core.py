import os
import time
import cv2
import json
import logging
import threading
import numpy as np
from datetime import datetime
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("VisionCore")

class VisionTracker:
    """
    Core Computer Vision engine for Auto-Aiming Turret.
    Handles YOLOv8 object detection, target state management, error calculation, and snapshot triggers.
    """
    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.5):
        self.lock = threading.Lock()
        self.active_target = "person"
        self.current_mode = "auto"
        self.confidence = confidence

        # Ensure snapshots directory exists
        self.snapshot_dir = os.path.join(os.path.dirname(__file__), "snapshots")
        os.makedirs(self.snapshot_dir, exist_ok=True)

        logger.info(f"Loading YOLO model from '{model_path}'...")
        try:
            self.model = YOLO(model_path)
            logger.info("YOLOv8 model loaded successfully.")
        except Exception as e:
            logger.error(f"Error loading YOLO model: {e}")
            raise e

        # Performance & telemetry metrics
        self.fps = 0.0
        self.last_frame_time = time.time()
        self.last_dx = 0
        self.target_detected = False

    def set_target(self, target_name: str):
        """Thread-safe update of the active tracking target (e.g. 'person', 'cell phone', 'bottle')."""
        with self.lock:
            self.active_target = target_name.lower().strip()
            logger.info(f"[State] Active target updated to: '{self.active_target}'")

    def get_target(self) -> str:
        """Thread-safe getter for the active tracking target."""
        with self.lock:
            return self.active_target

    def set_mode(self, mode_name: str):
        """Thread-safe update of turret operation mode ('auto' or 'manual')."""
        with self.lock:
            self.current_mode = mode_name.lower().strip()
            logger.info(f"[State] Turret mode updated to: '{self.current_mode}'")

    def get_mode(self) -> str:
        """Thread-safe getter for current turret mode."""
        with self.lock:
            return self.current_mode

    def process_frame(self, frame: np.ndarray, mqtt_client=None) -> np.ndarray:
        """
        Process a single video frame:
        1. Run YOLOv8 object detection.
        2. Filter detections matching active_target.
        3. Calculate target center and horizontal error relative to frame center (dx).
        4. Publish error coordinate via MQTT.
        5. Draw visual HUD annotations (crosshairs, bounding boxes, status overlay).
        """
        if frame is None:
            return None

        height, width, _ = frame.shape
        frame_center_x = width // 2
        frame_center_y = height // 2

        # Calculate FPS
        current_time = time.time()
        delta = current_time - self.last_frame_time
        if delta > 0:
            self.fps = 0.9 * self.fps + 0.1 * (1.0 / delta)
        self.last_frame_time = current_time

        active_target = self.get_target()
        current_mode = self.get_mode()

        # Run YOLO inference
        results = self.model(frame, verbose=False, conf=self.confidence)
        
        target_found = False
        target_cx, target_cy = 0, 0
        best_box = None
        best_conf = 0.0

        if len(results) > 0 and results[0].boxes is not None:
            boxes = results[0].boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                class_name = self.model.names.get(cls_id, "").lower()
                conf = float(box.conf[0].item())

                # Check for match with active_target
                if class_name == active_target or active_target == "all":
                    if conf > best_conf:
                        best_conf = conf
                        best_box = box

        annotated_frame = frame.copy()

        # Draw HUD Crosshair at frame center (Cyan)
        cv2.drawMarker(
            annotated_frame,
            (frame_center_x, frame_center_y),
            (255, 255, 0),
            markerType=cv2.MARKER_CROSS,
            markerSize=30,
            thickness=2
        )

        if best_box is not None:
            target_found = True
            xyxy = best_box.xyxy[0].cpu().numpy()
            xmin, ymin, xmax, ymax = map(int, xyxy)

            # Target Center Coordinates
            target_cx = (xmin + xmax) // 2
            target_cy = (ymin + ymax) // 2

            # Calculate Tracking Error from Frame Center (horizontal only)
            dx = target_cx - frame_center_x

            self.last_dx = dx
            self.target_detected = True

            # Publish error coordinate to ESP32 via MQTT (pan axis only)
            if mqtt_client:
                mqtt_client.publish_error(dx, found=True, locked=(abs(dx) <= 25))

            # Draw bounding box (Green for locked target)
            cv2.rectangle(annotated_frame, (xmin, ymin), (xmax, ymax), (0, 255, 0), 2)

            # Draw Label
            label = f"LOCKED: {active_target.upper()} ({best_conf:.2f})"
            cv2.putText(annotated_frame, label, (xmin, max(20, ymin - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

            # Draw Target Center Dot (Red)
            cv2.circle(annotated_frame, (target_cx, target_cy), 6, (0, 0, 255), -1)

            # Draw Tracking Vector Line from Center to Target
            cv2.line(annotated_frame, (frame_center_x, frame_center_y), (target_cx, target_cy), (0, 0, 255), 2)

            # Display Error Text
            error_text = f"dx: {dx}px"
            cv2.putText(annotated_frame, error_text, (target_cx + 10, target_cy + 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 2)
        else:
            self.target_detected = False
            # When target is lost, error is 0
            self.last_dx = 0
            if mqtt_client:
                mqtt_client.publish_error(0, found=False, locked=False)

        # Draw Telemetry HUD Panel (Top Left)
        cv2.rectangle(annotated_frame, (10, 10), (280, 115), (0, 0, 0), -1)
        cv2.rectangle(annotated_frame, (10, 10), (280, 115), (0, 255, 255), 1)

        mode_color = (0, 255, 0) if current_mode == "auto" else (0, 165, 255)
        cv2.putText(annotated_frame, f"TURRET MODE : {current_mode.upper()}", (20, 35),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, mode_color, 2)
        cv2.putText(annotated_frame, f"TARGET MODE : {active_target.upper()}", (20, 58),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(annotated_frame, f"STATUS      : {'LOCKED' if target_found else 'SEARCHING'}", (20, 81),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0) if target_found else (0, 0, 255), 1)
        cv2.putText(annotated_frame, f"FPS         : {self.fps:.1f}", (20, 104),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)

        return annotated_frame

    def save_snapshot(self, frame: np.ndarray) -> str:
        """Save current frame snapshot to local snapshots directory."""
        if frame is None:
            return None
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{timestamp}.jpg"
        filepath = os.path.join(self.snapshot_dir, filename)

        cv2.imwrite(filepath, frame)
        logger.info(f"Snapshot saved successfully: {filepath}")
        return filepath

    def trigger_fire_event(self, frame: np.ndarray = None, mqtt_client=None):
        """
        Handle manual/auto fire event:
        1. Save frame snapshot.
        2. Publish fire command to ESP32 via MQTT.
        """
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(f"FIRE EVENT TRIGGERED at {timestamp} [Mode: {self.get_mode()}]")

        snapshot_path = None
        if frame is not None:
            snapshot_path = self.save_snapshot(frame)

        if mqtt_client:
            mqtt_client.publish_fire_cmd(timestamp_str=timestamp)

        return snapshot_path
