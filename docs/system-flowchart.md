# 📊 Diagram Alur Sistem (System Flowchart) — Auto-Aiming Turret

> Dokumen ini berisi diagram alur sistem Auto-Aiming Turret yang telah distandardisasi mengikuti **Standar Notasi Flowchart Internasional (ANSI / ISO 5807)**.

---

## 📌 Standar Simbol Flowchart yang Digunakan (ANSI / ISO 5807)

| Simbol Mermaid | Bentuk Geometri | Makna Standar ANSI/ISO | Contoh Penggunaan di Proyek |
|---|---|---|---|
| `([ Teks ])` | **Oval / Kapsul (Terminator)** | Titik Awal (*Start*) atau Titik Akhir (*End*) sistem | `([Mulai])`, `([Selesai])` |
| `[ Teks ]` | **Persegi Panjang (Process)** | Operasi komputasi, kalkulasi, atau aksi aktuator mekanik | `[Hitung Galat dx]`, `[Relay ON]` |
| `{ Teks }` | **Belah Ketupat (Decision)** | Percabangan logika kondisi keputusan (*Ya / Tidak*) | `{Target Terkunci?}`, `{Objek Ditemukan?}` |
| `[/ Teks /]` | **Jajar Genjang (Input/Output)** | Masukan data sensor/kamera atau transmisi data I/O MQTT | `[/Input Frame Kamera/]`, `[/Publish MQTT/]` |
| `[( Teks )]` | **Silinder (Data Storage)** | Penyimpanan data persisten / basis data (*Database*) | `[(Tabel fire_events Supabase)]` |

---

## ⚡ 0. Flowchart Ringkas Alur Keseluruhan Sistem (Standar ANSI/ISO)

Diagram di bawah ini merangkum seluruh siklus kerja sistem secara padat, dari input kamera fisik hingga penyimpanan log di database, dengan simbol standar:

```mermaid
flowchart TD
    START(["Mulai"]) --> IN_CAM[/"Input Frame dari USB Camera"/]
    IN_CAM --> PROC_AI["Inferensi Objek dengan YOLOv8 Nano"]
    PROC_AI --> DEC_DETECT{"Target Terdeteksi?<br/>(class == 'person')"}

    DEC_DETECT -->|"Tidak"| OUT_ZERO[/"Publish MQTT: {dx: 0, found: false}"/]
    OUT_ZERO --> WAIT_NEXT["Tunggu Siklus Frame Berikutnya"]
    WAIT_NEXT --> IN_CAM

    DEC_DETECT -->|"Ya"| PROC_CALC["Hitung Galat Posisi:<br/>dx = target_cx - frame_center_x"]
    PROC_CALC --> OUT_MQTT[/"Publish MQTT: conf/turret/vision/error"/]
    OUT_MQTT --> IN_ESP[/"ESP32 Menerima Data dx via MQTT"/]

    IN_ESP --> DEC_LOCKED{"Target Berada di Tengah?<br/>(|dx| <= 25 px)"}

    DEC_LOCKED -->|"Tidak (Membidik)"| PROC_PAN["Servo Pan MG996R Bergerak<br/>Mengarahkan Kamera ke Sasaran"]
    PROC_PAN --> IN_CAM

    DEC_LOCKED -->|"Ya (Terkunci)"| PROC_RELAY["Relay Aktif: 2x Motor DC Flywheel Berputar<br/>(Jeda Spin-Up 0.5 Detik)"]
    PROC_RELAY --> PROC_PUSHER["Servo SG90 Maju ke 90°<br/>Mendorong Peluru ke Flywheel"]
    
    PROC_PUSHER --> IN_SONAR[/"Sensor HC-SR04 Mengukur Jarak Target (distance_cm)"/]
    IN_SONAR --> PROC_RESET["Servo SG90 Mundur ke 0° &<br/>Relay Mati (Motor DC OFF)"]

    PROC_RESET --> OUT_FIRE[/"Publish MQTT: conf/turret/event/fire"/]
    OUT_FIRE --> IN_WEB[/"Web Dashboard Menerima Event Tembakan"/]
    
    IN_WEB --> OUT_TOAST[/"Tampilkan Toast Notifikasi 'TARGET FIRED' di Layar"/]
    IN_WEB --> DB_SAVE[("Simpan Record ke Tabel fire_events Supabase")]

    DB_SAVE --> END_CYCLE(["Selesai / Masuk Cooldown 3 Detik"])
    END_CYCLE --> IN_CAM
```

---

## 🏗️ 1. Flowchart Arsitektur Menyeluruh & Alur Data (End-to-End)

Diagram detail yang memperlihatkan arsitektur berlapis (*layered architecture*) antar 6 subsistem:

```mermaid
flowchart TD
    subgraph SENSOR_INPUT["1. Masukan Fisik (Sensors & Camera)"]
        CAM[/"USB Webcam (Input Video)"/]
        SONAR[/"Sensor Ultrasonik HC-SR04 (Input Jarak)"/]
    end

    subgraph VISION["2. Vision Node (Python / OpenCV / YOLOv8)"]
        V_CAP[/"WebcamStream: Tangkap Frame (CAP_MSMF)"/]
        YOLO["YOLOv8 Nano: Deteksi Objek"]
        V_FILTER{"Class Target Sesuai?<br/>(default: 'person')"}
        CALC_DX["Hitung Galat Koordinat:<br/>dx = target_cx - frame_center_x"]
        V_MJPEG[/"MJPEG Video Streamer (:5000/video_feed)"/]
        V_MQTT_PUB[/"paho-mqtt: Publish conf/turret/vision/error"/]
    end

    subgraph BROKER["3. Cloud MQTT Broker (HiveMQ Cloud)"]
        MQ_ERR[/"Topic: conf/turret/vision/error"/]
        MQ_CTRL[/"Topic: conf/turret/control/fire & config"/]
        MQ_EVT[/"Topic: conf/turret/event/fire"/]
    end

    subgraph HARDWARE["4. Hardware Node (ESP32 DOIT DevKit V1)"]
        HW_MQTT[/"PubSubClient: Terima Pesan MQTT"/]
        HW_MUTEX["xStateMutex (Proteksi Memori Bersama)"]
        HW_TRACK["Task Servo Tracking (FreeRTOS Core 1)"]
        HW_TELEM["Task Sensor Telemetry (FreeRTOS Core 0)"]
        
        PAN_SERVO["Servo Pan MG996R (Tracking Horizontal)"]
        RELAY["Relay Motor DC (Pin 26: Flywheel)"]
        SG90["Servo Pusher SG90 (Pin 12: Dorong Peluru)"]
    end

    subgraph DASHBOARD["5. Web Dashboard (Next.js 16 / React 19)"]
        UI_AUTH{"Autentikasi Sesi Operator?"}
        UI_FEED[/"Tampilan Live Video Stream"/]
        UI_CTRL[/"Panel Kontrol Target & Mode"/]
        UI_HOOK[/"useMqtt Hook (WebSocket WSS)"/]
        UI_TOAST[/"Toast Notifikasi 'TARGET FIRED'"/]
        UI_API["API Route: POST /api/logs"]
        UI_TABLE[/"Tabel Riwayat Firing Event History"/]
    end

    subgraph CLOUD_DB["6. Cloud Storage (Supabase PostgreSQL)"]
        DB_TABLE[("Tabel: fire_events<br/>id, target, distance_cm, timestamp")]
    end

    %% Relasi Alur
    CAM --> V_CAP
    V_CAP --> YOLO
    V_CAP --> V_MJPEG
    V_MJPEG -.->|"HTTP Stream :5000"| UI_FEED

    YOLO --> V_FILTER
    V_FILTER -->|"Ya"| CALC_DX
    V_FILTER -->|"Tidak"| V_MQTT_PUB
    CALC_DX --> V_MQTT_PUB

    V_MQTT_PUB -->|"TLS 8883"| MQ_ERR
    MQ_ERR -->|"Subscribe"| HW_MQTT

    HW_MQTT --> HW_MUTEX
    HW_MUTEX --> HW_TRACK

    HW_TRACK -->|"PWM GPIO 13"| PAN_SERVO
    HW_TRACK -->|"Relay Aktif 0.5s"| RELAY
    HW_TRACK -->|"Dorong Amunisi"| SG90

    SONAR --> HW_TELEM
    HW_TELEM --> HW_MUTEX
    HW_TRACK -->|"publishFireEvent"| HW_MQTT
    HW_MQTT -->|"TLS 8883"| MQ_EVT

    MQ_EVT -->|"WSS 8884"| UI_HOOK
    UI_HOOK --> UI_TOAST
    UI_HOOK --> UI_API
    UI_API -->|"SQL Insert"| DB_TABLE
    DB_TABLE -.->|"Select Logs"| UI_TABLE

    UI_CTRL -->|"Publish Manual"| UI_HOOK
    UI_HOOK -->|"WSS 8884"| MQ_CTRL
    MQ_CTRL -->|"Subscribe"| HW_MQTT
```

---

## 🎯 2. Flowchart Alur Pelacakan AI & Kalibrasi Servo

Diagram logika pendeteksian target dan kendali putaran servo pan:

```mermaid
flowchart TD
    START(["ESP32 Boot / Reset"]) --> CALIB["Jalankan calibratePanServo()"]
    CALIB --> CALIB_L["Gerak Halus ke Kiri (60°)"]
    CALIB_L --> CALIB_R["Gerak Halus ke Kanan (120°)"]
    CALIB_R --> CALIB_C["Kunci Posisi Titik Tengah CENTER (90°)"]
    CALIB_C --> WAIT_AI["Standby Menunggu Masukan Koordinat AI"]

    IN_FRAME[/"Webcam Menangkap Frame (640x480)"/] --> YOLO_RUN["Inferensi YOLOv8"]
    YOLO_RUN --> DEC_OBJ{"Objek Terdeteksi?"}

    DEC_OBJ -->|"Tidak"| OUT_NONE[/"Publish MQTT: {dx: 0, found: false}"/]
    OUT_NONE --> SERVO_HOLD["Servo Pan Menahan Posisi Terakhir"]

    DEC_OBJ -->|"Ya"| DEC_CLASS{"Class Objek Sesuai Target?<br/>(misal: 'person')"}
    DEC_CLASS -->|"Tidak"| OUT_NONE
    DEC_CLASS -->|"Ya"| PROC_BBOX["Kalkulasi Pusat Bounding Box (target_cx, target_cy)"]

    PROC_BBOX --> PROC_ERR["Hitung Galat: dx = target_cx - 320"]
    PROC_ERR --> DEC_IN_LOCK{"Apakah |dx| <= 25 px?<br/>(Di dalam Deadband)"}

    DEC_IN_LOCK -->|"Ya (Terkunci)"| OUT_LOCKED[/"Publish MQTT: {dx, found: true, locked: true}"/]
    DEC_IN_LOCK -->|"Tidak (Mencari)"| OUT_TRACK[/"Publish MQTT: {dx, found: true, locked: false}"/]

    OUT_TRACK --> IN_ESP_DATA[/"ESP32 Menerima Data dx"/]
    OUT_LOCKED --> IN_ESP_DATA

    IN_ESP_DATA --> DEC_MOVE{"Apakah |dx| > 25 px?"}
    DEC_MOVE -->|"Ya"| PROC_STEP["Hitung Langkah Sudut Servo:<br/>normDx = constrain(dx/320, -1, 1)<br/>angleStep = normDx * 1.5 * (-1)"]
    PROC_STEP --> PROC_WRITE["panAngle += angleStep<br/>servoPan.write(panAngle)"]
    DEC_MOVE -->|"Tidak"| AIM_LOCKED["Target Presisi di Garis Tengah Crosshair"]
```

---

## ⏱️ 3. Flowchart Sekuens Penembakan (Timing Diagram)

Diagram waktu presisi relay motor DC dan servo peluru SG90:

```mermaid
flowchart TD
    TRIGGER{"Kondisi Pemicu Tembakan?"}
    TRIGGER -->|"Mode AUTO"| COND_AUTO["Target Terkunci (|dx| <= 25px)<br/>Stabil Selama 15 Ticks (~300ms)<br/>Cooldown > 3 Detik Terpenuhi"]
    TRIGGER -->|"Mode MANUAL"| COND_MAN[/"Pesan Diterima via conf/turret/control/fire<br/>(Tombol Web Ditekan Operator)"/]

    COND_AUTO --> SEQ_START["Mulai Prosedur executeFireSequence()"]
    COND_MAN --> SEQ_START

    SEQ_START --> IN_DIST[/"Baca Nilai Jarak dari HC-SR04 (distance_cm)"/]
    IN_DIST --> PROC_MOTOR_ON["1. digitalWrite(PIN_RELAY, HIGH)<br/>Kedua Motor DC Flywheel Mulai Berputar"]

    PROC_MOTOR_ON --> DELAY_500["2. JEDA SPIN-UP TEPAT 0.5 DETIK (500 ms)<br/>Menunggu putaran flywheel mencapai kecepatan penuh"]

    DELAY_500 --> PROC_PUSH["3. servoPusher.write(90°)<br/>Servo SG90 Maju Mendorong Peluru ke Flywheel"]

    PROC_PUSH --> DELAY_400["Jeda Waktu Dorong Peluru (400 ms)"]

    DELAY_400 --> PROC_REST["4. servoPusher.write(0°)<br/>Servo SG90 Mundur ke Posisi Standby"]

    PROC_REST --> DELAY_300["Jeda Stabilisasi Mekanik (300 ms)"]

    DELAY_300 --> PROC_MOTOR_OFF["5. digitalWrite(PIN_RELAY, LOW)<br/>Kedua Motor DC Flywheel Dimatikan"]

    PROC_MOTOR_OFF --> OUT_LOG[/"6. publishFireEvent(distance_cm)<br/>Kirim Payload ke conf/turret/event/fire"/]

    OUT_LOG --> COOLDOWN["Mulai Timer Cooldown 3 Detik"]
    COOLDOWN --> READY(["Turret Siap Membidik Target Berikutnya"])
```

---

## 🔄 4. Sequence Diagram Interaksi Antar-Komponen

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Operator (Browser)
    participant Web as Web Dashboard (Next.js)
    participant Vision as Vision Node (Python AI)
    participant MQTT as HiveMQ Cloud (Broker)
    participant ESP as ESP32 (Hardware Turret)
    participant Supabase as Supabase (Cloud DB)

    Note over ESP: Inisialisasi & Kalibrasi Booting
    ESP->>ESP: calibratePanServo() (Homing: 60° -> 120° -> 90°)
    ESP->>MQTT: Connect TLS & Subscribe (error, fire)
    Vision->>MQTT: Connect TLS & Subscribe (config, mode, fire)
    Web->>MQTT: Connect WSS & Subscribe (event/fire)

    Note over Vision,ESP: Siklus Pelacakan Real-Time
    Vision->>Vision: Deteksi Target (YOLOv8) & Hitung dx
    Vision->>MQTT: Publish conf/turret/vision/error {dx, found: true}
    MQTT->>ESP: Forward galat dx
    ESP->>ESP: Koreksi posisi Servo Pan MG996R

    Note over Vision,ESP: Target Terkunci & Tembak Otomatis
    Vision->>MQTT: Publish {dx, locked: true}
    MQTT->>ESP: Forward {locked: true}
    ESP->>ESP: Target stabil di tengah!
    ESP->>ESP: Relay ON (Kedua Motor DC berputar)
    Note over ESP: Jeda spin-up tepat 0.5 detik
    ESP->>ESP: Servo SG90 maju dorong peluru (90°)
    ESP->>ESP: Servo SG90 mundur standby (0°)
    ESP->>ESP: Relay OFF (Motor DC mati)

    Note over ESP,Supabase: Pencatatan Log Riwayat
    ESP->>MQTT: Publish conf/turret/event/fire {distance_cm: 42.5}
    MQTT->>Web: Forward event/fire
    Web->>Web: Tampilkan Toast "TARGET FIRED" & Pulse Layar
    Web->>Supabase: POST /api/logs {target: 'person', distance_cm: 42.5}
    Supabase-->>Web: 201 Created (Data Tersimpan)
    Web->>Operator: Tabel "Firing Event History" otomatis ter-refresh!
```
