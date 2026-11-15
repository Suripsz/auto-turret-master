# 02 — Hardware Turret: Setup & Flash Firmware ESP32

> Komponen: `hardware-turret/`  
> Perangkat: ESP32 DOIT DevKit V1  
> Build tool: PlatformIO  
> Waktu: ~15–30 menit (pertama kali)

---

## Gambaran Umum Hardware

```
┌─────────────────────────────────────────┐
│          ESP32 DOIT DevKit V1           │
│                                         │
│  GPIO 13 ──→ Servo Pan (MG996R)         │
│  GPIO 12 ──→ Servo Pusher (Ammo Feed)   │
│  GPIO 14 ──→ HC-SR04 TRIG              │
│  GPIO 27 ──→ HC-SR04 ECHO              │
│  GPIO 26 ──→ Relay (Motor DC Flywheel)  │
│                                         │
│  WiFi ──→ HiveMQ Cloud (TLS 8883)       │
└─────────────────────────────────────────┘
```

---

## 2.1 Skema Wiring Hardware

### Servo Pan (MG996R — Horizontal Tracking)

| Pin MG996R | Warna Kabel | Sambungkan ke |
|---|---|---|
| Signal | Oranye/Kuning | GPIO **13** |
| VCC | Merah | **5V External PSU** (bukan dari ESP32!) |
| GND | Coklat/Hitam | GND (bersama ESP32) |

### Servo Pusher (Ammo Feeder)

| Pin Servo | Warna Kabel | Sambungkan ke |
|---|---|---|
| Signal | Oranye/Kuning | GPIO **12** |
| VCC | Merah | **5V External PSU** |
| GND | Coklat/Hitam | GND (bersama ESP32) |

### HC-SR04 (Sensor Ultrasonik Jarak)

| Pin HC-SR04 | Sambungkan ke |
|---|---|
| VCC | 5V |
| TRIG | GPIO **14** |
| ECHO | GPIO **27** (via voltage divider 1kΩ/2kΩ) |
| GND | GND |

> ⚠️ **Penting:** GPIO ESP32 hanya toleran 3.3V. Pin ECHO HC-SR04 mengeluarkan 5V. Pasang voltage divider (resistor 1kΩ serial + 2kΩ ke GND) di jalur ECHO sebelum masuk GPIO 27.

### Relay 1-Channel (Motor DC Launcher)

| Pin Relay | Sambungkan ke |
|---|---|
| IN / Signal | GPIO **26** |
| VCC | 5V |
| GND | GND |
| NO (Normally Open) | Kabel positif motor DC |
| COM (Common) | Positif baterai/PSU motor |

> ⚠️ **Penting:** Motor DC flywheel memerlukan daya terpisah (baterai Li-Po atau PSU 7.4V–12V tergantung motor). Jangan sambungkan langsung ke ESP32.

### Power Supply Rekomendasi

```
[ Baterai Li-Po 7.4V / PSU 12V ]
        │
        ├──→ [ Relay NO/COM ] → Motor DC Flywheel
        │
        └──→ [ DC Buck Converter → 5V ] → Servo x2 + HC-SR04
                                        → ESP32 (via VIN atau USB)
```

---

## 2.2 Konfigurasi Firmware

Sebelum flash, ubah file konfigurasi sesuai jaringan dan broker Anda.

### Edit `hardware-turret/include/config.h`

```
hardware-turret/
└── include/
    └── config.h    ← Edit file ini
```

Buka file dan sesuaikan nilai berikut:

```cpp
// --- WiFi Credentials ---
#define WIFI_SSID         "NAMA_WIFI_ANDA"       // Ganti dengan SSID WiFi
#define WIFI_PASSWORD     "PASSWORD_WIFI_ANDA"    // Ganti dengan password WiFi

// --- HiveMQ Cloud MQTT Broker ---
#define MQTT_HOST         "xxxx.hivemq.cloud"     // Host HiveMQ Anda
#define MQTT_PORT         8883                    // Port TLS (jangan diubah)
#define MQTT_USERNAME     "username_mqtt_anda"    // Username HiveMQ
#define MQTT_PASSWORD     "password_mqtt_anda"    // Password HiveMQ
#define MQTT_CLIENT_ID    "ESP32_TurretNode"      // Bisa diubah sesuka hati
```

> 📌 Nilai lain di `config.h` (GPIO pin, servo limits, tracking parameters) sudah dikalibrasi dan tidak perlu diubah kecuali Anda merakit wiring berbeda.

---

## 2.3 Build & Upload via PlatformIO VS Code

### Langkah 1: Buka Project

```
File → Open Folder → Pilih: D:\applications\auto-turret-master\hardware-turret
```

PlatformIO akan otomatis mendeteksi `platformio.ini` dan mengunduh library dependencies.

### Langkah 2: Verifikasi Library Dependencies

Library berikut akan diunduh otomatis saat pertama kali build:
- `knolleary/PubSubClient@^2.8` — MQTT client
- `madhephaestus/ESP32Servo@^3.0.5` — servo driver ESP32
- `teckel12/NewPing@^1.9.7` — HC-SR04 ultrasonic
- `bblanchon/ArduinoJson@^7.0.0` — JSON parser

### Langkah 3: Pilih Port Serial

Di VS Code, klik ikon PlatformIO di sidebar kiri → **Devices**  
Atau di status bar bawah, klik `Auto` di sebelah port dan pilih `COMx` yang sesuai.

### Langkah 4: Build Firmware

Klik tombol **✓ Build** (tanda centang) di toolbar PlatformIO, atau:

```
PlatformIO sidebar → esp32doit-devkit-v1 → Build
```

Output sukses akan menampilkan:
```
Linking .pio/build/esp32doit-devkit-v1/firmware.elf
Building .pio/build/esp32doit-devkit-v1/firmware.bin
RAM:   [=         ]  10.4% ...
Flash: [==        ]  22.1% ...
========================= [SUCCESS] =========================
```

### Langkah 5: Upload ke ESP32

1. Tekan tombol **BOOT** di ESP32 (dan tahan) — beberapa board memerlukannya
2. Klik tombol **→ Upload** di toolbar PlatformIO
3. Lepas tombol BOOT saat upload mulai

Output sukses:
```
Writing at 0x00001000... (100 %)
Wrote XXXXX bytes (XXXXX compressed) at 0x00001000
Hash of data verified.
Leaving...
Hard resetting via RTS pin...
========================= [SUCCESS] =========================
```

---

## 2.4 Build & Upload via PlatformIO CLI

Jika menggunakan PlatformIO CLI (tanpa VS Code):

```powershell
# Masuk ke folder hardware-turret
cd D:\applications\auto-turret-master\hardware-turret

# Build firmware
pio run

# Upload ke ESP32 (ganti COM3 dengan port Anda)
pio run --target upload --upload-port COM3

# Monitor serial output (opsional)
pio device monitor --port COM3 --baud 115200
```

---

## 2.5 Verifikasi via Serial Monitor

Buka Serial Monitor setelah upload berhasil. Anda harus melihat output seperti:

```
==============================================
  Auto-Aiming Turret - ESP32 Hardware Node
==============================================

[WiFi] Connecting to DX HOME..........
[WiFi] Connected! IP: 192.168.1.xxx

[MQTT] Connecting to xxxx.hivemq.cloud:8883 ...
[MQTT] Connected to HiveMQ Cloud!
[MQTT] Subscribed to: conf/turret/vision/error, conf/turret/control/fire

[Servo] MG996R Pan=90° (centered, 500-2500us) | Pusher=0° (rest)
[Setup] All FreeRTOS tasks launched. System ready.

[Task] MQTT Loop started.
[Task] Servo Tracking started.
[Task] Sensor Telemetry started.
```

### Jika WiFi Gagal Konek:
- Periksa SSID dan password di `config.h`
- Pastikan ESP32 dalam jangkauan WiFi
- Router harus menggunakan 2.4 GHz (ESP32 tidak support 5 GHz)

### Jika MQTT Gagal Konek:
- Periksa host, username, password di `config.h`
- Pastikan port 8883 tidak diblokir firewall/router
- Periksa apakah credential HiveMQ masih aktif

---

## 2.6 Kalibrasi Servo (Opsional)

Jika servo pan tidak bergerak ke arah yang benar:

```cpp
// Di config.h — ubah TRACKING_DIRECTION
#define TRACKING_DIRECTION    -1   // Ganti ke 1 jika arah terbalik
```

Jika servo pan melewati batas:
```cpp
#define SERVO_PAN_MIN         0    // Batas minimum (derajat)
#define SERVO_PAN_MAX       180    // Batas maksimum (derajat)
#define SERVO_PAN_CENTER     90    // Posisi center
```

Jika tracking terlalu sensitif / bergetar:
```cpp
#define TRACKING_DEADBAND_PX  25   // Naikkan angka jika terlalu sensitif
#define MAX_SERVO_STEP_DEG   1.5f  // Kurangi untuk gerakan lebih halus
```

---

## 2.7 Checklist Hardware Turret

```
[ ] config.h sudah diisi dengan kredensial WiFi & MQTT yang benar
[ ] Semua wiring terhubung sesuai tabel pin di atas
[ ] Voltage divider terpasang di jalur ECHO HC-SR04
[ ] Power supply eksternal tersedia untuk servo & motor
[ ] Firmware berhasil di-build tanpa error
[ ] Upload berhasil ke ESP32
[ ] Serial monitor menampilkan "System ready"
[ ] WiFi Connected
[ ] MQTT Connected
[ ] Semua FreeRTOS task launched
```

---

➡️ Lanjut ke **[03 — Vision Node Setup](./03-vision-node.md)**

