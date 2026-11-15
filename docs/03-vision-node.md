# 03 — Vision Node: Setup Computer Vision & AI Server

> Komponen: `vision-node/`  
> Bahasa: Python 3.11+  
> Framework: FastAPI + YOLOv8 + OpenCV + paho-mqtt  
> Port default: **5000**  
> Waktu setup: ~10–20 menit (termasuk download model YOLOv8)

---

## Gambaran Umum Vision Node

Vision Node adalah "otak" deteksi AI sistem turret:
1. **Tangkap frame** dari webcam secara *threaded* (non-blocking)
2. **Inferensi YOLOv8** — deteksi objek target (default: `person`)
3. **Hitung error offset** `dx` = selisih posisi target dari pusat frame
4. **Publish `dx`** via MQTT ke ESP32 untuk koreksi servo pan
5. **Streaming MJPEG** via HTTP untuk tampilan live di dashboard
6. **Simpan snapshot** saat terjadi event tembak

---

## 3.1 Navigasi ke Folder vision-node

```powershell
cd D:\applications\auto-turret-master\vision-node
```

---

## 3.2 Buat Virtual Environment Python

Sangat direkomendasikan menggunakan virtual environment agar library tidak konflik dengan instalasi Python global.

```powershell
# Buat virtual environment (satu kali saja)
python -m venv .venv

# Aktifkan virtual environment
# PowerShell:
.\.venv\Scripts\Activate.ps1

# Command Prompt (jika PowerShell gagal):
.\.venv\Scripts\activate.bat
```

Setelah aktif, prompt PowerShell akan berubah menjadi:
```
(.venv) PS D:\applications\auto-turret-master\vision-node>
```

> ⚠️ Jika PowerShell menolak script execution policy:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```
> Lalu coba lagi `Activate.ps1`.

---

## 3.3 Install Dependencies

```powershell
# Pastikan virtual environment sudah aktif (lihat (.venv) di prompt)
pip install --upgrade pip
pip install -r requirements.txt
```

Library yang akan diinstal:
| Library | Versi | Fungsi |
|---------|-------|--------|
| `ultralytics` | ≥8.0.0 | YOLOv8 object detection |
| `opencv-python` | ≥4.8.0 | Webcam capture & frame processing |
| `paho-mqtt` | ≥1.6.1 | MQTT client TLS ke HiveMQ Cloud |
| `fastapi` | ≥0.100.0 | API server & MJPEG streaming |
| `uvicorn[standard]` | ≥0.22.0 | ASGI server untuk FastAPI |
| `python-dotenv` | ≥1.0.0 | Load variabel dari file `.env` |
| `numpy` | ≥1.24.0 | Array processing untuk frame |

> 📌 **YOLOv8 model** (`yolov8n.pt`) sudah tersedia di folder `vision-node/`. Jika tidak ada, akan didownload otomatis saat pertama kali dijalankan (~6 MB).

Proses instalasi membutuhkan koneksi internet dan bisa memakan waktu 5–15 menit tergantung kecepatan koneksi.

---

## 3.4 Konfigurasi Environment Variables

Buat file `.env` di dalam folder `vision-node/` berdasarkan template berikut:

```powershell
# Buat file .env (dari template, lalu edit)
copy .env.example .env
```

Atau buat manual dengan Notepad / VS Code:

```
vision-node/
└── .env    ← Buat file ini
```

Isi file `.env`:

```env
# ============================================================
# MQTT Broker — HiveMQ Cloud
# ============================================================
MQTT_BROKER=d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud
MQTT_PORT=8883
MQTT_USERNAME=dash-auto-aim
MQTT_PASSWORD=PASSWORD_MQTT_ANDA

# ============================================================
# Webcam Settings
# ============================================================
WEBCAM_INDEX=0          # 0 = webcam pertama, 1 = webcam kedua, dst.
FRAME_WIDTH=640
FRAME_HEIGHT=480

# ============================================================
# YOLOv8 Model
# ============================================================
YOLO_MODEL=yolov8n.pt
CONFIDENCE_THRESHOLD=0.5   # 0.0–1.0, naikkan untuk kurangi false positive

# ============================================================
# FastAPI Server
# ============================================================
FASTAPI_HOST=0.0.0.0
FASTAPI_PORT=5000
```

> ⚠️ Ganti `MQTT_PASSWORD` dengan password HiveMQ yang sebenarnya.  
> File `.env` sudah masuk `.gitignore` dan tidak akan ter-commit ke Git.

---

## 3.5 Menjalankan Vision Node

```powershell
# Pastikan virtual environment aktif
.\.venv\Scripts\Activate.ps1

# Jalankan server
python main.py
```

Output startup yang berhasil:

```
INFO:     Vision Node startup complete. Ready for streaming & tracking.
INFO:     Loading YOLO model from 'yolov8n.pt'...
INFO:     YOLOv8 model loaded successfully.
INFO:     Connecting to MQTT broker xxxx.hivemq.cloud:8883...
INFO:     Connected to HiveMQ Cloud MQTT Broker via TLS
INFO:     Subscribed to: conf/turret/control/config, conf/turret/control/mode, conf/turret/control/fire
INFO:     Webcam initialized successfully at index 0 (640x480).
INFO:     Uvicorn running on http://0.0.0.0:5000 (Press CTRL+C to quit)
```

### Jika Webcam Tidak Ditemukan

Vision Node akan masuk ke **Simulation Mode** secara otomatis — menampilkan animasi target bergerak simulasi. Ini berguna untuk testing dashboard tanpa hardware kamera.

```
WARNING: Unable to open physical webcam at index 0. Operating in fallback test mode.
```

Untuk mencoba index webcam berbeda, ubah `WEBCAM_INDEX=1` (atau 2, dst.) di file `.env`.

---

## 3.6 Verifikasi Vision Node Berjalan

### Test via Browser

Buka browser dan akses:

| URL | Deskripsi |
|-----|-----------|
| `http://localhost:5000/` | Root endpoint, info layanan |
| `http://localhost:5000/docs` | Swagger UI — semua endpoint terdokumentasi |
| `http://localhost:5000/video_feed` | **Live MJPEG stream** (buka di browser/tab baru) |
| `http://localhost:5000/health` | Status kamera & MQTT |
| `http://localhost:5000/status` | Telemetri detail (target, mode, FPS, dx) |

### Test via PowerShell

```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:5000/health | ConvertFrom-Json

# Contoh respons sukses:
# status           : healthy
# camera_connected : True
# mqtt_connected   : True
# active_target    : person
# current_mode     : auto
```

### Verifikasi MQTT Publishing

Di Serial Monitor ESP32, saat ada deteksi objek, Anda akan melihat:
```
[MQTT] Received [conf/turret/vision/error]: {"dx":-42}
```
Dan servo pan akan bergerak mengikuti arah objek.

---

## 3.7 Endpoints API Lengkap

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/` | Info layanan |
| GET | `/video_feed` | MJPEG live stream (dipakai dashboard) |
| GET | `/health` | Status kamera & MQTT |
| GET | `/status` | Telemetri: target, mode, FPS, dx |
| POST | `/config` | Update target atau mode via HTTP |
| POST | `/fire` | Trigger tembak manual via HTTP |
| GET | `/docs` | Swagger UI interaktif |

### Contoh: Ganti Target via API

```powershell
# Ganti target ke "bottle"
Invoke-WebRequest -Uri http://localhost:5000/config `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"target": "bottle"}'
```

### Contoh: Trigger Fire Manual via API

```powershell
Invoke-WebRequest -Uri http://localhost:5000/fire -Method POST
```

---

## 3.8 Memahami HUD pada Video Stream

Saat membuka `/video_feed`, frame video akan menampilkan overlay HUD:

```
┌─────────────────────────────────┐
│ TURRET MODE : AUTO              │
│ TARGET MODE : PERSON            │
│ STATUS      : LOCKED / SEARCHING│
│ FPS         : 28.5              │
│                                 │
│    [Cyan crosshair di center]   │
│                                 │
│    ┌─────────────────┐          │
│    │ LOCKED: PERSON  │          │
│    │ (0.87)          │          │
│    │       ●         │  dx: 42px│
│    └─────────────────┘          │
│    [Garis merah dari center     │
│     ke titik target]            │
└─────────────────────────────────┘
```

- **Crosshair cyan** = titik pusat frame (target aiming)
- **Kotak hijau** = bounding box objek yang terdeteksi
- **Titik merah** = pusat objek yang dikunci
- **Garis merah** = tracking vector
- **dx** = selisih horizontal yang dikirim ke ESP32

---

## 3.9 Troubleshooting Vision Node

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| `ModuleNotFoundError` | Virtual env tidak aktif / install gagal | Aktifkan venv, `pip install -r requirements.txt` lagi |
| `Error loading YOLO model` | File `yolov8n.pt` rusak atau tidak ada | Hapus & download ulang: `python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"` |
| Webcam index error | Webcam dipakai aplikasi lain | Tutup aplikasi video lain, coba index berbeda |
| MQTT tidak konek | Credential salah / network | Periksa `.env`, cek koneksi internet |
| FPS rendah (<10) | CPU overload | Kurangi resolusi, atau gunakan GPU (install `torch` CUDA) |
| Port 5000 sudah dipakai | Proses lain | Ubah `FASTAPI_PORT=5001` di `.env` |

---

## 3.10 Checklist Vision Node

```
[ ] Python 3.11/3.12 terinstal
[ ] Virtual environment dibuat dan aktif
[ ] pip install -r requirements.txt selesai tanpa error
[ ] File .env sudah dibuat dan terisi kredensial MQTT
[ ] python main.py berhasil dijalankan
[ ] Output: "YOLOv8 model loaded successfully"
[ ] Output: "Connected to HiveMQ Cloud via TLS"
[ ] http://localhost:5000/health mengembalikan status healthy
[ ] http://localhost:5000/video_feed menampilkan stream video
[ ] Deteksi person berfungsi (kotak hijau muncul saat ada orang)
```

---

➡️ Lanjut ke **[04 — Auto-Aim Turret Dashboard Setup](./04-auto-aim-turret.md)**

