#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// Auto-Aiming Turret - Hardware Node Configuration
// ============================================================================

// --- WiFi Credentials ---
#define WIFI_SSID         "DX HOME"
#define WIFI_PASSWORD     "dxh12345"

// --- HiveMQ Cloud MQTT Broker (TLS Port 8883) ---
#define MQTT_HOST         "d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud"
#define MQTT_PORT         8883
#define MQTT_USERNAME     "esp32.subscriber.publisher"
#define MQTT_PASSWORD     "DxESP32Rext"
#define MQTT_CLIENT_ID    "ESP32_TurretNode"

// --- GPIO Pin Definitions ---
// Servo Motors
#define PIN_SERVO_PAN         13   // Pan servo (X-axis / horizontal)
#define PIN_SERVO_PUSHER      12   // Ammo pusher servo (Pusher / Feed mechanism)

// HC-SR04 Ultrasonic Sensor
#define PIN_ULTRASONIC_TRIG  14
#define PIN_ULTRASONIC_ECHO  27

// Relay Module (1 channel used for DC motor launcher)
#define PIN_RELAY            26

// --- Servo Limits & MG996R 180° Calibration ---
#define SERVO_PAN_MIN         0    // Minimum mechanical angle (degrees)
#define SERVO_PAN_MAX       180    // Maximum mechanical angle (degrees)
#define SERVO_PAN_CENTER     90    // Center position (degrees)

#define SERVO_PAN_PULSE_MIN 500    // MG996R pulse width for 0° (us)
#define SERVO_PAN_PULSE_MAX 2500   // MG996R pulse width for 180° (us)

#define SERVO_PUSHER_REST     0    // Rest / Retracted position (degrees)
#define SERVO_PUSHER_PUSH    90    // Pushing / Extended position (degrees)

// --- Tracking Controller Tuning (MG996R Smooth Tracking) ---
#define TRACKING_DEADBAND_PX  25   // Deadband region: ignore error within +/- 25 pixels of center
#define MAX_SERVO_STEP_DEG   1.5f  // Slew rate limit: max 1.5° movement per 20ms tick (~75°/sec)
#define TRACKING_DIRECTION    -1   // Set to -1 or 1 to adjust physical pan direction

// --- Ultrasonic Sensor ---
#define MAX_DISTANCE_CM     400   // Maximum sensing distance in cm
#define TELEMETRY_INTERVAL  500   // Publish telemetry every N ms

// --- Launcher / Relay ---
#define FIRE_DURATION_MS    2000  // How long the DC motor relay stays ON (ms)

// --- MQTT Topics ---
// Subscribed (Inputs from Vision Node / Dashboard)
#define TOPIC_VISION_ERROR    "conf/turret/vision/error"
#define TOPIC_CONTROL_FIRE    "conf/turret/control/fire"

// Published (Outputs to Dashboard / Vision Node)
#define TOPIC_SENSOR_TELEMETRY  "conf/turret/sensor/telemetry"
#define TOPIC_EVENT_FIRE        "conf/turret/event/fire"

// --- FreeRTOS Task Settings ---
#define TASK_STACK_MQTT      8192
#define TASK_STACK_SERVO     4096
#define TASK_STACK_SENSOR    4096
#define TASK_PRIORITY_MQTT   2
#define TASK_PRIORITY_SERVO  3
#define TASK_PRIORITY_SENSOR 1

#endif // CONFIG_H