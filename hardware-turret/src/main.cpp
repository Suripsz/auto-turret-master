// ============================================================================
// Auto-Aiming Turret - ESP32 Hardware Node Firmware
// FreeRTOS-based servo tracking, ultrasonic telemetry, and relay fire control
// ============================================================================

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <NewPing.h>
#include <ArduinoJson.h>
#include "config.h"

// ============================================================================
// ISRG Root X1 CA Certificate (for HiveMQ Cloud TLS on port 8883)
// ============================================================================
static const char *root_ca PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

// ============================================================================
// Global Objects
// ============================================================================
WiFiClientSecure espSecureClient;
PubSubClient     mqttClient(espSecureClient);
Servo            servoPan;
Servo            servoPusher;
NewPing           sonar(PIN_ULTRASONIC_TRIG, PIN_ULTRASONIC_ECHO, MAX_DISTANCE_CM);

// ============================================================================
// Shared State (protected by mutex)
// ============================================================================
SemaphoreHandle_t xStateMutex;

volatile float targetDx  = 0.0f;   // Latest error from Vision Node (X-axis only)
volatile float panAngle  = SERVO_PAN_CENTER;
volatile bool  fireRequested = false;
volatile bool  targetLocked  = false;
volatile bool  targetFound   = false;
volatile float lastDistanceCm = 0.0f;

// ============================================================================
// WiFi Connection
// ============================================================================

void connectWiFi() {
    Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    } else {
        Serial.println("\n[WiFi] Connection FAILED. Will retry in MQTT task...");
    }
}

// ============================================================================
// MQTT Callback - Message Dispatcher
// ============================================================================
void mqttCallback(char *topic, byte *payload, unsigned int length) {
    // Parse payload into a null-terminated string
    char message[length + 1];
    memcpy(message, payload, length);
    message[length] = '\0';

    Serial.printf("[MQTT] Received [%s]: %s\n", topic, message);

    // --- Vision Error Offset ---
    if (strcmp(topic, TOPIC_VISION_ERROR) == 0) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, message);
        if (err) {
            Serial.printf("[MQTT] JSON parse error on vision/error: %s\n", err.c_str());
            return;
        }
        float dx = doc["dx"] | 0.0f;
        bool locked = doc["locked"] | (abs(dx) <= TRACKING_DEADBAND_PX && dx != 0.0f);
        bool found = doc["found"] | (dx != 0.0f);

        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            targetDx = dx;
            targetLocked = locked;
            targetFound = found;
            xSemaphoreGive(xStateMutex);
        }
    }
    // --- Fire Command ---
    else if (strcmp(topic, TOPIC_CONTROL_FIRE) == 0) {
        Serial.println("[MQTT] >>> FIRE COMMAND RECEIVED <<<");
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            fireRequested = true;
            xSemaphoreGive(xStateMutex);
        }
    }
}

// ============================================================================
// MQTT Connect / Reconnect
// ============================================================================
bool connectMQTT() {
    if (mqttClient.connected()) return true;

    Serial.printf("[MQTT] Connecting to %s:%d ...\n", MQTT_HOST, MQTT_PORT);

    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
        Serial.println("[MQTT] Connected to HiveMQ Cloud!");

        // Subscribe to topics
        mqttClient.subscribe(TOPIC_VISION_ERROR);
        mqttClient.subscribe(TOPIC_CONTROL_FIRE);
        Serial.printf("[MQTT] Subscribed to: %s, %s\n", TOPIC_VISION_ERROR, TOPIC_CONTROL_FIRE);
        return true;
    } else {
        Serial.printf("[MQTT] Connection failed, state=%d. Retrying in 5s...\n", mqttClient.state());
        return false;
    }
}

// ============================================================================
// Publish Helpers
// ============================================================================
void publishTelemetry(float distance_cm) {
    if (!mqttClient.connected()) return;

    JsonDocument doc;
    doc["distance_cm"] = round(distance_cm * 10.0f) / 10.0f;
    doc["pan_angle"]   = (int)panAngle;

    char buffer[128];
    serializeJson(doc, buffer, sizeof(buffer));
    mqttClient.publish(TOPIC_SENSOR_TELEMETRY, buffer);
}

void publishFireEvent(float distance_cm) {
    if (!mqttClient.connected()) return;

    JsonDocument doc;
    doc["event"]       = "fire";
    doc["distance_cm"] = round(distance_cm * 10.0f) / 10.0f;
    doc["pan_angle"]   = (int)panAngle;

    char buffer[128];
    serializeJson(doc, buffer, sizeof(buffer));
    mqttClient.publish(TOPIC_EVENT_FIRE, buffer);
    Serial.printf("[FIRE] Event published: %s\n", buffer);
}

// ============================================================================
// Fire Sequence - Activate Launcher Relay & Ammo Pusher Servo
// ============================================================================
void executeFireSequence() {
    float dist;
    if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
        dist = lastDistanceCm;
        xSemaphoreGive(xStateMutex);
    } else {
        dist = 0;
    }

    Serial.printf("[FIRE] Initiating fire sequence (distance: %.1f cm)\n", dist);

    // 1. Activate BOTH DC Motors via Relay (Flywheel Spin-up)
    digitalWrite(PIN_RELAY, HIGH);
    Serial.println("[FIRE] DC Launcher Motors ON - Spinning up flywheel (0.5s delay)...");
    vTaskDelay(pdMS_TO_TICKS(500));  // Tepat 0.5 detik (500ms) spin-up delay

    // 2. Extend Ammo Pusher Servo SG90 (Feed dart/ammo into flywheel launcher)
    Serial.println("[FIRE] Pusher Servo SG90 EXTENDING (feeding ammo)...");
    servoPusher.write(SERVO_PUSHER_PUSH);
    vTaskDelay(pdMS_TO_TICKS(400));  // 400ms stroke delay

    // 3. Retract Ammo Pusher Servo SG90 (Return to rest position)
    Serial.println("[FIRE] Pusher Servo SG90 RETRACTING (rest position)...");
    servoPusher.write(SERVO_PUSHER_REST);
    vTaskDelay(pdMS_TO_TICKS(300));  // 300ms retraction delay

    // 4. Deactivate BOTH DC Motors
    digitalWrite(PIN_RELAY, LOW);
    Serial.println("[FIRE] DC Launcher Motors OFF");

    publishFireEvent(dist);
    Serial.println("[FIRE] Fire sequence completed successfully.");
}

// ============================================================================
// FreeRTOS Task: MQTT Loop (handles WiFi reconnect + MQTT keep-alive)
// ============================================================================
void taskMQTTLoop(void *pvParameters) {
    Serial.println("[Task] MQTT Loop started.");
    unsigned long lastReconnectAttempt = 0;

    for (;;) {
        // Ensure WiFi is connected
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[WiFi] Lost connection. Reconnecting...");
            WiFi.disconnect();
            WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

            int attempts = 0;
            while (WiFi.status() != WL_CONNECTED && attempts < 20) {
                vTaskDelay(pdMS_TO_TICKS(500));
                attempts++;
            }
            if (WiFi.status() == WL_CONNECTED) {
                Serial.printf("[WiFi] Reconnected. IP: %s\n", WiFi.localIP().toString().c_str());
            }
        }

        // Ensure MQTT is connected
        if (!mqttClient.connected()) {
            unsigned long now = millis();
            if (now - lastReconnectAttempt > 5000) {
                lastReconnectAttempt = now;
                connectMQTT();
            }
        } else {
            mqttClient.loop();  // Process incoming messages & keep-alive
        }

        vTaskDelay(pdMS_TO_TICKS(10));  // Yield to other tasks
    }
}

// ============================================================================
// FreeRTOS Task: Servo Tracking
// Reads latest (dx, dy) error and applies proportional correction to servos.
// ============================================================================
void taskServoTracking(void *pvParameters) {
    Serial.println("[Task] Servo Tracking started.");

    int lockCounter = 0;                          // Menghitung berapa lama target stabil di tengah
    unsigned long lastAutoFireTime = 0;           // Timer cooldown antar tembakan
    const int LOCK_REQUIRED_TICKS = 15;           // Target harus stabil di tengah selama ~300ms (15 x 20ms)
    const unsigned long FIRE_COOLDOWN_MS = 3000;  // Jeda 3 detik setelah menembak agar tidak spamming

    for (;;) {
        float dx = 0;
        bool isFound = false;
        bool isLocked = false;
        bool shouldFire = false;

        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            dx = targetDx;
            isFound = targetFound;
            isLocked = targetLocked;
            shouldFire = fireRequested;
            if (shouldFire) fireRequested = false;  // Consume manual fire flag
            xSemaphoreGive(xStateMutex);
        }

        // --- Deteksi Auto-Fire saat Target Terkunci (Locked di Tengah Crosshair) ---
        if (isFound && (isLocked || (abs(dx) <= TRACKING_DEADBAND_PX && dx != 0.0f))) {
            lockCounter++;
            if (lockCounter >= LOCK_REQUIRED_TICKS && (millis() - lastAutoFireTime > FIRE_COOLDOWN_MS)) {
                shouldFire = true;
                lockCounter = 0;
                lastAutoFireTime = millis();
                Serial.println("[AUTO-FIRE] Target LOCKED di crosshair! Menjalankan tembakan otomatis...");
            }
        } else {
            lockCounter = 0;
        }

        // --- Apply MG996R Smooth Proportional Tracking ---
        // 1. Deadband filter: ignore small jitter within +/- TRACKING_DEADBAND_PX of center
        float trackDx = dx;
        if (abs(trackDx) <= TRACKING_DEADBAND_PX) {
            trackDx = 0.0f;
        }

        if (trackDx != 0.0f) {
            // 2. Normalize error relative to 640px frame half-width (320px) -> [-1.0, 1.0]
            float normDx = trackDx / 320.0f;
            normDx = constrain(normDx, -1.0f, 1.0f);

            // 3. Calculate step size per 20ms tick with slew rate limiting (MAX_SERVO_STEP_DEG)
            float angleStep = normDx * MAX_SERVO_STEP_DEG * TRACKING_DIRECTION;

            // 4. Update and clamp pan angle strictly within 180° bounds (0° - 180°)
            panAngle += angleStep;
            panAngle = constrain(panAngle, (float)SERVO_PAN_MIN, (float)SERVO_PAN_MAX);

            servoPan.write((int)panAngle);
        }

        // --- Fire Logic (Auto Lock atau Manual via Web) ---
        if (shouldFire) {
            executeFireSequence();
        }

        vTaskDelay(pdMS_TO_TICKS(20));  // ~50Hz servo update rate
    }
}

// ============================================================================
// FreeRTOS Task: Ultrasonic Sensor Telemetry
// Periodically reads HC-SR04 and publishes distance to MQTT.
// ============================================================================
void taskSensorTelemetry(void *pvParameters) {
    Serial.println("[Task] Sensor Telemetry started.");

    for (;;) {
        // NewPing ping_cm() returns 0 on out-of-range or timeout
        unsigned int distance = sonar.ping_cm();
        float dist_cm = (distance == 0) ? (float)MAX_DISTANCE_CM : (float)distance;

        // Store for fire event reporting
        if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
            lastDistanceCm = dist_cm;
            xSemaphoreGive(xStateMutex);
        }

        publishTelemetry(dist_cm);

        vTaskDelay(pdMS_TO_TICKS(TELEMETRY_INTERVAL));
    }
}

// ============================================================================
// Kalibrasi Awal Servo Pan (Startup Homing & Centering Routine)
// ============================================================================
void calibratePanServo() {
    Serial.println("\n----------------------------------------------");
    Serial.println("[CALIBRATION] Memulai kalibrasi titik tengah Servo Pan...");
    Serial.println("----------------------------------------------");

    // 1. Pastikan servo pusher dalam posisi aman (0 derajat / REST)
    servoPusher.write(SERVO_PUSHER_REST);
    delay(150);

    // 2. Sapuan halus ke kiri aman (60 derajat)
    Serial.println("[CALIBRATION] Sapuan homing: bergerak ke kiri (60°)...");
    for (int angle = SERVO_PAN_CENTER; angle >= 60; angle -= 2) {
        servoPan.write(angle);
        delay(15);
    }
    delay(200);

    // 3. Sapuan halus ke kanan aman (120 derajat)
    Serial.println("[CALIBRATION] Sapuan homing: bergerak ke kanan (120°)...");
    for (int angle = 60; angle <= 120; angle += 2) {
        servoPan.write(angle);
        delay(15);
    }
    delay(200);

    // 4. Kembali secara halus ke titik tengah (SERVO_PAN_CENTER = 90 derajat)
    Serial.printf("[CALIBRATION] Kembali dan mengunci di TITIK TENGAH (%d°)...\n", SERVO_PAN_CENTER);
    for (int angle = 120; angle >= SERVO_PAN_CENTER; angle -= 2) {
        servoPan.write(angle);
        delay(15);
    }
    servoPan.write(SERVO_PAN_CENTER);
    delay(300);

    // 5. Inisialisasi state variable tracking
    if (xSemaphoreTake(xStateMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        panAngle = (float)SERVO_PAN_CENTER;
        targetDx = 0.0f;
        targetLocked = false;
        targetFound = false;
        xSemaphoreGive(xStateMutex);
    }

    Serial.printf("[CALIBRATION] Kalibrasi selesai! Servo Pan terkunci di titik tengah (%d°).\n\n", SERVO_PAN_CENTER);
}

// ============================================================================
// Arduino setup() - Initialization
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(500);
    Serial.println("\n==============================================");
    Serial.println("  Auto-Aiming Turret - ESP32 Hardware Node");
    Serial.println("==============================================\n");

    // --- GPIO Setup ---
    pinMode(PIN_RELAY, OUTPUT);
    digitalWrite(PIN_RELAY, LOW);  // Ensure relay starts OFF

    // --- Servo Initialization (MG996R Pan & Ammo Pusher) ---
    ESP32PWM::allocateTimer(0);
    ESP32PWM::allocateTimer(1);
    servoPan.setPeriodHertz(50);
    servoPusher.setPeriodHertz(50);
    // MG996R 180° pulse width range: 500us (0°) to 2500us (180°)
    servoPan.attach(PIN_SERVO_PAN, SERVO_PAN_PULSE_MIN, SERVO_PAN_PULSE_MAX);
    servoPusher.attach(PIN_SERVO_PUSHER, 500, 2400);

    // --- Create Mutex ---
    xStateMutex = xSemaphoreCreateMutex();

    // --- Kalibrasi Awal Titik Tengah Servo Pan ---
    calibratePanServo();

    // --- WiFi Connection ---
    connectWiFi();

    // --- Secure MQTT Setup ---
    espSecureClient.setCACert(root_ca);
    mqttClient.setServer(MQTT_HOST, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(512);  // Increase for larger JSON payloads
    connectMQTT();

    // --- Launch FreeRTOS Tasks ---
    xTaskCreatePinnedToCore(
        taskMQTTLoop,        // Task function
        "MQTTLoop",          // Name
        TASK_STACK_MQTT,     // Stack size
        NULL,                // Parameters
        TASK_PRIORITY_MQTT,  // Priority
        NULL,                // Task handle
        0                    // Core 0 (protocol core)
    );

    xTaskCreatePinnedToCore(
        taskServoTracking,
        "ServoTrack",
        TASK_STACK_SERVO,
        NULL,
        TASK_PRIORITY_SERVO,
        NULL,
        1                    // Core 1 (real-time core)
    );

    xTaskCreatePinnedToCore(
        taskSensorTelemetry,
        "SensorTelem",
        TASK_STACK_SENSOR,
        NULL,
        TASK_PRIORITY_SENSOR,
        NULL,
        0                    // Core 0
    );

    Serial.println("[Setup] All FreeRTOS tasks launched. System ready.\n");
}

// ============================================================================
// Arduino loop() - Idle (all work handled by FreeRTOS tasks)
// ============================================================================
void loop() {
    vTaskDelay(pdMS_TO_TICKS(1000));  // Yield to FreeRTOS scheduler
}