# 🎯 Auto-Aiming Turret — Dokumentasi Lengkap

> Sistem turret otomatis berbasis AI yang terdiri dari tiga komponen utama yang saling berkomunikasi melalui MQTT.

---

## 📁 Struktur Proyek

```
auto-turret-master/
├── auto-aim-turret/      # Web Dashboard (Next.js)
├── hardware-turret/      # Firmware ESP32 (PlatformIO/Arduino)
├── vision-node/          # Computer Vision AI (Python/FastAPI)
└── docs/                 # Dokumentasi (folder ini)
    ├── README.md                    ← Halaman ini (ikhtisar & arsitektur)
    ├── daily-startup-guide.md       ← ⭐ PANDUAN STARTUP HARIAN (BACA INI DULU)
    ├── system-flowchart.md          ← 📊 DIAGRAM ALUR LENGKAP (MERMAID)
    ├── 01-prerequisites.md          ← Semua yang perlu diinstal
    ├── 02-hardware-turret.md        ← Setup & flash firmware ESP32
    ├── 03-vision-node.md            ← Setup Python & AI vision server
    ├── 04-auto-aim-turret.md        ← Setup web dashboard Next.js
    └── 05-running-full-system.md    ← Referensi komprehensif full system
```

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                     HiveMQ Cloud (MQTT Broker)                  │
│                   wss://*.hivemq.cloud:8883/8884                │
└──────────────────┬──────────────────────┬───────────────────────┘
                   │                      │
        Subscribe/Publish           Subscribe/Publish
                   │                      │
   ┌───────────────▼──────┐    ┌──────────▼─────────────────────┐
   │  vision-node         │    │  hardware-turret (ESP32)        │
   │  Python + YOLOv8     │    │  FreeRTOS + Servo + HC-SR04     │
   │  FastAPI MJPEG       │    │  Relay Motor + MQTT TLS         │
   │  Port: 5000          │    │                                 │
   └───────────────┬──────┘    └──────────┬──────────────────────┘
                   │                      │
     Publish: vision/error      Publish: event/fire
     (dx offset tracking)       (distance_cm)
                   │                      │
   ┌───────────────▼──────────────────────▼──────────────────────┐
   │              auto-aim-turret (Next.js Dashboard)            │
   │              Browser ← MQTT WSS → HiveMQ Cloud              │
   │              Supabase Auth + Database                        │
   │              Port: 3000                                      │
   └─────────────────────────────────────────────────────────────┘
```

## 🔄 Alur Data Lengkap

```
[Webcam] → vision-node (YOLOv8 deteksi "person")
         → kalkulasi dx (error offset dari pusat frame)
         → MQTT publish: conf/turret/vision/error {"dx": 42}

[ESP32]  ← MQTT subscribe: conf/turret/vision/error
         → servo pan bergerak proporsional terhadap dx
         → HC-SR04 ukur jarak → MQTT publish: sensor/telemetry

[ESP32]  → saat tembak: MQTT publish: conf/turret/event/fire
           {"event":"fire","distance_cm":35.0,"pan_angle":90}

[Dashboard] ← MQTT subscribe: conf/turret/event/fire
            → tampilkan toast notifikasi
            → POST /api/logs → simpan ke Supabase
            → refresh tabel riwayat tembak
```

---

## 📡 Topik MQTT

| Topik | Arah | Publisher | Subscriber | Payload |
|-------|------|-----------|------------|---------|
| `conf/turret/vision/error` | Vision→ESP32 | vision-node | ESP32 | `{"dx": int}` |
| `conf/turret/event/fire` | ESP32→Dashboard | ESP32 | Dashboard (browser) | `{"event":"fire","distance_cm":float,"pan_angle":int}` |
| `conf/turret/control/config` | Dashboard→Vision | Dashboard | vision-node | `{"active_target":"person"}` |
| `conf/turret/control/mode` | Dashboard→Vision | Dashboard | vision-node | `{"mode":"auto"}` |
| `conf/turret/control/fire` | Dashboard→ESP32 | Dashboard | ESP32 + vision-node | `{"action":"manual_fire_and_capture"}` |
| `conf/turret/sensor/telemetry` | ESP32→All | ESP32 | Dashboard | `{"distance_cm":float,"pan_angle":int}` |

---

## ⚡ Quick Start (Urutan Wajib)

1. Selesaikan **[Prerequisites](./01-prerequisites.md)** — satu kali saja
2. **[Flash ESP32](./02-hardware-turret.md)** — satu kali per perangkat
3. Jalankan **[Vision Node](./03-vision-node.md)** — `python main.py`
4. Jalankan **[Web Dashboard](./04-auto-aim-turret.md)** — `npm run dev`
5. Panduan **[Full System](./05-running-full-system.md)** — startup harian

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi | Versi |
|----------|-----------|-------|
| Dashboard | Next.js, React, TypeScript, Tailwind CSS | Next.js 16.3 |
| Auth & DB | Supabase (PostgreSQL) | - |
| MQTT Client | mqtt.js (browser WSS) | ^5.15 |
| Vision AI | Python, YOLOv8 Nano, OpenCV | ultralytics≥8.0 |
| Vision API | FastAPI + Uvicorn | fastapi≥0.100 |
| MQTT Client | paho-mqtt (Python TLS) | ≥1.6.1 |
| Firmware | C++, Arduino Framework, FreeRTOS | - |
| MCU | ESP32 DOIT DevKit V1 | - |
| Servo | MG996R (Pan) + Servo Pusher | - |
| Sensor | HC-SR04 Ultrasonik | - |
| MQTT Broker | HiveMQ Cloud (TLS 8883 / WSS 8884) | - |
| Build Tool | PlatformIO | - |

