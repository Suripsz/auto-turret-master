import json
import logging
import os
import ssl
import paho.mqtt.client as mqtt
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MQTTClient")

class TurretMQTTClient:
    """
    MQTT Manager for HiveMQ Cloud over TLS (Port 8883).
    Handles subscribing to control topics and publishing vision error offsets and hardware commands.
    """
    def __init__(self, vision_tracker=None):
        load_dotenv()
        self.broker = os.getenv("MQTT_BROKER", "d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud")
        self.port = int(os.getenv("MQTT_PORT", "8883"))
        self.username = os.getenv("MQTT_USERNAME", "dash-auto-aim")
        self.password = os.getenv("MQTT_PASSWORD", "dash1234")
        self.vision_tracker = vision_tracker
        self.connected = False

        # MQTT Topic Definition
        self.TOPIC_CONFIG = "conf/turret/control/config"
        self.TOPIC_MODE = "conf/turret/control/mode"
        self.TOPIC_FIRE = "conf/turret/control/fire"
        self.TOPIC_ERROR = "conf/turret/vision/error"
        self.TOPIC_HARDWARE_FIRE = "conf/turret/hardware/fire"
        self.TOPIC_STATUS = "conf/turret/vision/status"

        # Initialize paho MQTT client dynamically handling v1/v2 API versions
        try:
            self.client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, client_id="VisionNodeClient")
        except AttributeError:
            self.client = mqtt.Client(client_id="VisionNodeClient")

        self._configure_tls()

    def _configure_tls(self):
        """Configure TLS context for HiveMQ Cloud over Port 8883."""
        context = ssl.create_default_context()
        context.check_hostname = True
        context.verify_mode = ssl.CERT_REQUIRED

        self.client.tls_set_context(context)
        if self.username and self.password:
            self.client.username_pw_set(self.username, self.password)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        rc_code = rc if isinstance(rc, int) else getattr(rc, "value", rc)
        if rc_code == 0:
            self.connected = True
            logger.info(f"Connected to HiveMQ Cloud MQTT Broker ({self.broker}:{self.port}) via TLS")
            # Subscribe to control topics
            client.subscribe([(self.TOPIC_CONFIG, 0), (self.TOPIC_MODE, 0), (self.TOPIC_FIRE, 0)])
            logger.info(f"Subscribed to: {self.TOPIC_CONFIG}, {self.TOPIC_MODE}, {self.TOPIC_FIRE}")
        else:
            logger.error(f"Failed to connect to MQTT broker, return code: {rc_code}")

    def _on_disconnect(self, client, userdata, rc, properties=None):
        self.connected = False
        logger.warning(f"Disconnected from MQTT broker (rc: {rc}). Reconnecting automatically...")

    def _on_message(self, client, userdata, msg):
        try:
            topic = msg.topic
            payload_str = msg.payload.decode("utf-8")
            logger.info(f"MQTT Received [{topic}]: {payload_str}")

            try:
                data = json.loads(payload_str)
            except json.JSONDecodeError:
                data = {"raw": payload_str}

            if topic == self.TOPIC_CONFIG:
                target = data.get("target") or data.get("active_target") or payload_str
                if self.vision_tracker and target:
                    self.vision_tracker.set_target(str(target).strip())
                    logger.info(f"Target set to: '{target}'")

            elif topic == self.TOPIC_MODE:
                mode = data.get("mode") or data.get("current_mode") or payload_str
                if self.vision_tracker and mode:
                    self.vision_tracker.set_mode(str(mode).strip())
                    logger.info(f"Turret mode set to: '{mode}'")

            elif topic == self.TOPIC_FIRE:
                logger.info("Fire trigger command received!")
                if self.vision_tracker:
                    self.vision_tracker.trigger_fire_event(mqtt_client=self)

        except Exception as e:
            logger.error(f"Error processing MQTT message on {msg.topic}: {e}", exc_info=True)

    def publish_error(self, dx: int, found: bool = True, locked: bool = False):
        """Publish coordinate error payload {"dx": dx, "found": bool, "locked": bool} to ESP32 tracking topic."""
        if not self.connected:
            return
        payload = json.dumps({
            "dx": int(dx),
            "found": bool(found),
            "locked": bool(locked)
        })
        self.client.publish(self.TOPIC_ERROR, payload, qos=0)

    def publish_fire_cmd(self, timestamp_str: str = None):
        """Publish fire trigger payload to ESP32 hardware node."""
        if not self.connected:
            return
        payload = json.dumps({
            "cmd": "FIRE",
            "source": "vision_node",
            "timestamp": timestamp_str
        })
        self.client.publish(self.TOPIC_FIRE, payload, qos=1)
        logger.info(f"Published FIRE command to ESP32 hardware topic: {self.TOPIC_FIRE}")

    def start(self):
        try:
            logger.info(f"Connecting to MQTT broker {self.broker}:{self.port}...")
            self.client.connect_async(self.broker, self.port, keepalive=60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to start MQTT client: {e}")

    def stop(self):
        logger.info("Stopping MQTT client loop...")
        self.client.loop_stop()
        self.client.disconnect()
