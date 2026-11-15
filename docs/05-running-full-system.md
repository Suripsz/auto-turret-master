	# 05 — Menjalankan Full System (Startup Harian)

> Panduan ini untuk **setiap kali** ingin menjalankan sistem setelah setup awal selesai.
> Setup awal (install dependencies, flash firmware) hanya perlu dilakukan sekali.

---

## Urutan Startup yang Benar

> ⚠️ **Urutan ini penting.** Vision Node harus jalan sebelum Dashboard dibuka
> agar video stream tersedia sejak awal.

```
1. ESP32 (hardware-turret)   → Colokkan USB / nyalakan power
2. Vision Node (vision-node) → python main.py
3. Dashboard (auto-aim-turret) → npm run dev
4. Buka browser              → http://localhost:3000
```

---

## 5.1 Terminal Setup: 3 Jendela Terpisah

Buka **3 jendela PowerShell / Terminal** secara terpisah (atau gunakan Windows Terminal dengan tab).

---

## Terminal 1 — Vision Node

```powershell
# Navigasi ke folder vision-node
cd D:\applications\auto-turret-master\vision-node

# Aktifkan virtual environment
.\.venv\Scripts\Activate.ps1

# Jalankan server
python main.py
```

**Tunggu** hingga muncul:
```
INFO:  Connected to HiveMQ Cloud MQTT Broker via TLS
INFO:  Uvicorn running on http://0.0.0.0:5000
```

✅ Vision Node siap jika:
- `http://localhost:5000/health` mengembalikan `"status": "healthy"`
- `http://localhost:5000/video_feed` menampilkan stream video

---

## Terminal 2 — Web Dashboard

```powershell
# Navigasi ke folder auto-aim-turret
cd D:\applications\auto-turret-master\auto-aim-turret

# Jalankan development server
npm run dev
```

**Tunggu** hingga muncul:
```
✓ Ready in X.Xs
- Local: http://localhost:3000
```

✅ Dashboard siap jika:
- `http://localhost:3000` menampilkan halaman login atau dashboard

---

## Terminal 3 — Monitor ESP32 (Opsional tapi Berguna)

Jika ESP32 masih tersambung via USB:

```powershell
# Monitor serial (ganti COM3 dengan port ESP32 Anda)
# Metode 1: PlatformIO CLI
cd D:\applications\auto-turret-master\hardware-turret
pio device monitor --port COM3 --baud 115200

# Metode 2: Gunakan PlatformIO VS Code
# Klik ikon plug di toolbar bawah VS Code
```

---

## 5.2 Verifikasi Sistem Terintegrasi

Setelah semua komponen berjalan, lakukan pengecekan ini:

### A. Cek Koneksi MQTT

Di header dashboard, indikator **"Cloud WSS:"** harus menampilkan:
```
● Cloud WSS: connected
```

Jika masih `connecting` atau `error`, periksa:
- Koneksi internet aktif
- Credential MQTT di `.env.local` benar

### B. Cek Video Feed

Video feed di panel kiri dashboard harus menampilkan stream dari webcam.

Jika video tidak muncul:
1. Buka tab browser baru: `http://localhost:5000/video_feed`
2. Jika stream terlihat di URL langsung tapi tidak di dashboard → CORS issue (jarang)
3. Jika stream tidak terlihat sama sekali → Vision Node bermasalah

### C. Cek Deteksi AI

Berdiri di depan webcam. Di video feed, harus muncul:
```
Kotak hijau membungkus tubuh Anda
Label: "LOCKED: PERSON (0.87)"
Garis merah dari pusat ke posisi tubuh
```

Bersamaan, di ESP32 Serial Monitor:
```
[MQTT] Received [conf/turret/vision/error]: {"dx": -42}
```
Dan servo pan harus bergerak ke arah Anda.

### D. Test Manual Fire

Di Control Panel dashboard, klik **"Manual Snap & Fire"**.

Yang harus terjadi:
1. ✅ ESP32 Serial Monitor: `>>> FIRE COMMAND RECEIVED <<<`
2. ✅ Relay berbunyi klik (flywheel motor nyala)
3. ✅ Servo pusher bergerak (extend 90° → retract 0°)
4. ✅ Toast notifikasi muncul di pojok kanan bawah dashboard
5. ✅ Baris baru muncul di Event Log Table
6. ✅ Data tersimpan di Supabase (`fire_events` table)

---

## 5.3 Diagram Status Indikator

```
Dashboard Header:
┌─────────────────────────────────────────────────────────┐
│ 🛡️ AUTO-AIM TURRET SYSTEM  v2.0 AUTH                   │
│                                                         │
│  Nov 15, 2026 11:15:00 AM                               │
│  📡 Cloud WSS: [connected] ← Harus hijau/connected     │
│  👤 operator@email.com                                  │
│  [Logout]                                               │
└─────────────────────────────────────────────────────────┘

Vision Node Terminal:
INFO: STATUS: LOCKED (target terdeteksi)
      atau
INFO: STATUS: SEARCHING (tidak ada target)

ESP32 Serial:
[Task] MQTT Loop started.      ← Harus ada
[Task] Servo Tracking started. ← Harus ada
[Task] Sensor Telemetry started. ← Harus ada
```

---

## 5.4 Mode Operasi

### Mode AUTO (Default)

```
vision-node deteksi target
    → publish dx offset ke ESP32
        → ESP32 gerakkan servo pan
            → target di-lock (di pusat frame)
                → operator trigger fire manual ATAU
                  sistem bisa dikembangkan untuk auto-fire
```

Aktifkan via dashboard: **Control Panel → Mode → AUTO**

### Mode MANUAL

```
Servo tidak mengikuti target AI
Operator mengontrol sistem sepenuhnya via dashboard
Gunakan "Manual Snap & Fire" untuk trigger tembak
```

Aktifkan via dashboard: **Control Panel → Mode → MANUAL**

### Ganti Target Kelas

Sistem mendukung semua kelas objek yang ada di model YOLOv8 / COCO dataset:

| Pilihan UI | Nilai YOLO | Contoh Use Case |
|---|---|---|
| Person | `person` | Deteksi manusia |
| Cup | `cup` | Demo/testing |
| Bottle | `bottle` | Demo/testing |
| Drone | (tergantung model custom) | Aplikasi anti-drone |
| Custom | Input bebas | Kelas YOLO apapun |

Saat memilih target baru di dashboard:
1. Browser publish ke MQTT: `conf/turret/control/config` → `{"active_target": "bottle"}`
2. Vision-node menerima dan update `active_target`
3. YOLOv8 mulai filter hanya objek dengan class tersebut

---

## 5.5 Shutdown yang Benar

Urutan mematikan sistem:

```
1. Dashboard: Klik tombol [Logout]
2. Terminal 2 (Dashboard): Ctrl+C
3. Terminal 1 (Vision Node): Ctrl+C
4. ESP32: Cabut USB / matikan power
```

---

## 5.6 Troubleshooting Sistem Terintegrasi

### ESP32 Tidak Merespons Perintah Dashboard

**Cek:** Apakah ESP32 Serial Monitor menampilkan pesan MQTT masuk?

```
# Jika tidak ada pesan MQTT sama sekali di ESP32:
→ Periksa topik MQTT di config.h (harus cocok dengan useMqtt.ts)
→ Pastikan ESP32 dan Dashboard menggunakan MQTT broker yang sama
→ Restart ESP32 (tekan tombol EN/RST)
```

### Video Feed Lag / Delay Tinggi

```
# Di vision-node, kurangi resolusi:
# Edit .env:
FRAME_WIDTH=320
FRAME_HEIGHT=240

# Atau kurangi JPEG quality di main.py baris 169:
# [int(cv2.IMWRITE_JPEG_QUALITY), 60]  ← turunkan dari 80 ke 60
```

### Event Log Tidak Ter-update Setelah Tembak

```
1. Cek apakah POST /api/logs berhasil (buka DevTools Network tab di browser)
2. Cek apakah Supabase menerima insert (Supabase Dashboard → Table Editor → fire_events)
3. Jika POST gagal 400: pastikan format body JSON benar (target string, distance_cm number)
4. Klik tombol [Refresh] di Event Log Table secara manual
```

### Servo Pan Bergerak Terbalik

```cpp
// Di hardware-turret/include/config.h:
#define TRACKING_DIRECTION    -1   // Ganti ke 1
// Lalu re-upload firmware
```

### Servo Bergetar / Tidak Stabil

```cpp
// Naikkan deadband (abaikan error kecil):
#define TRACKING_DEADBAND_PX  40   // Default 25, naikkan ke 35-50

// Kurangi kecepatan gerak:
#define MAX_SERVO_STEP_DEG   1.0f  // Default 1.5, kurangi ke 0.8-1.0
```

---

## 5.7 Checklist Full System

```
STARTUP:
[ ] ESP32 menyala, Serial Monitor menampilkan "System ready"
[ ] WiFi Connected (IP address terlihat)
[ ] MQTT Connected (di Serial Monitor)
[ ] Vision Node: python main.py berjalan
[ ] Vision Node: MQTT Connected
[ ] Vision Node: Webcam initialized
[ ] Dashboard: npm run dev berjalan
[ ] Dashboard: Header menampilkan "Cloud WSS: connected"
[ ] Dashboard: Video feed menampilkan stream dari webcam

FUNGSIONAL:
[ ] Berdiri di depan kamera → servo pan mengikuti posisi tubuh
[ ] Pindah ke kiri/kanan → servo mengikuti
[ ] Klik "Manual Snap & Fire" → relay klik, motor nyala, servo pusher bergerak
[ ] Toast notifikasi muncul di dashboard
[ ] Baris baru muncul di Event Log Table
[ ] Data tersimpan di Supabase (cek di dashboard Supabase)
[ ] Ganti target ke "Cup" → sistem hanya melacak objek cup
[ ] Ganti mode ke "Manual" → servo berhenti mengikuti otomatis
```

---

## 5.8 Referensi Cepat Port & URL

| Layanan | URL / Port | Keterangan |
|---------|------------|------------|
| Web Dashboard | `http://localhost:3000` | Antarmuka utama operator |
| Vision Node API | `http://localhost:5000` | FastAPI server |
| Live Video Stream | `http://localhost:5000/video_feed` | MJPEG stream |
| Vision Health | `http://localhost:5000/health` | Cek status AI server |
| Vision Docs | `http://localhost:5000/docs` | Swagger UI |
| ESP32 Serial | `COMx @ 115200 baud` | Debug firmware |
| HiveMQ Cloud | WSS port 8884 | MQTT via browser |
| HiveMQ Cloud | TLS port 8883 | MQTT via Python & ESP32 |
| Supabase | `https://xxxx.supabase.co` | Database & Auth cloud |

---

## 5.9 Diagram Troubleshooting Cepat

```
Sistem tidak bekerja?
        │
        ▼
  ESP32 online?
  (Serial: "System ready")
   NO → Flash ulang firmware, cek WiFi/MQTT config.h
   YES ↓
        ▼
  Vision Node jalan?
  (localhost:5000/health = healthy)
   NO → Aktifkan venv, jalankan python main.py, cek .env
   YES ↓
        ▼
  Dashboard MQTT: connected?
  (Header: Cloud WSS: connected)
   NO → Periksa .env.local MQTT credentials, cek internet
   YES ↓
        ▼
  Video feed tampil?
   NO → Pastikan vision-node port 5000 bisa diakses
   YES ↓
        ▼
  Servo tidak bergerak saat ada orang?
   → Cek topik MQTT di config.h dan mqtt_client.py harus sama
   → Cek TRACKING_DIRECTION di config.h
        ↓
  🎉 Semua berjalan!
```

---

⬅️ Kembali ke **[README / Overview](./README.md)**

