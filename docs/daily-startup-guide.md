# 🚀 Panduan Startup Harian (Daily Startup Guide)

> **Auto-Aiming Turret System**  
> Dokumen ini adalah panduan praktis langkah demi langkah untuk menyalakan dan menjalankan seluruh sistem dari awal setiap hari, lengkap dengan lokasi direktori, perintah terminal, output yang diharapkan (*expected output*), hingga pengujian akhir.

---

## 🧭 Diagram Urutan Startup

Ikuti urutan ini dengan disiplin. Jangan membuka Dashboard sebelum Vision Node siap!

```
[Langkah 0] Persiapan Fisik & Power Hardware (ESP32, PSU 5V, USB Camera)
     │
     ▼
[Langkah 1] Terminal 1: Nyalakan AI Vision Node (FastAPI + YOLOv8)
     │      (Tunggu hingga Uvicorn running & MQTT terhubung)
     ▼
[Langkah 2] Terminal 2: Nyalakan Web Dashboard (Next.js)
     │      (Tunggu hingga Ready in ... http://localhost:3000)
     ▼
[Langkah 3] Browser: Buka http://localhost:3000 & Login Operator
     │
     ▼
[Langkah 4] (Opsional) Terminal 3: Pantau Serial Monitor ESP32 (115200 baud)
     │
     ▼
[Langkah 5] Uji Coba Lapangan (Target Lock → Motor DC 0.5s → Servo SG90 Tembak)
```

---

## Langkah 0: Persiapan Hardware Fisik

Sebelum mengetik perintah apapun di komputer, pastikan kondisi fisik perangkat:

1. **Pastikan Aplikasi Kamera Windows / OBS / Zoom DITUTUP:**
   * Di Windows, USB camera hanya bisa diakses 1 aplikasi. Jika Camera Windows masih terbuka, Vision Node akan gagal membuka webcam.
2. **Kabel USB Camera:** Sudah tertancap kencang di port USB komputer.
3. **Power Supply Eksternal 5V (PSU):**
   * Nyalakan PSU 5V yang memberi daya ke Servo Pan MG996R, Servo Pusher SG90, dan Relay Motor DC.
   * Pastikan **Common Ground (GND PSU ke GND ESP32)** terhubung.
4. **Kabel USB ESP32:** Tancapkan ke port USB komputer (untuk daya MCU dan komunikasi serial).

---

## Langkah 1: Jalankan AI Vision Node (Terminal 1)

Vision Node bertindak sebagai sensor mata dan AI detector sistem.

### 📍 Di Mana Dijalankan:
Buka jendela **PowerShell** pertama.

### ⌨️ Perintah:
```powershell
# 1. Pindah ke direktori vision-node
cd d:\applications\auto-turret-master\vision-node

# 2. Aktifkan virtual environment Python
source .\.venv\Scripts\Activate.ps1

# 3. Jalankan server Vision
python main.py
```

### ✅ Apa yang Harus Diharapkan (Expected Output):
Tunggu beberapa detik sampai log berikut muncul di terminal:
```text
INFO: [VisionCore]: Loading YOLO model from 'yolov8n.pt'...
INFO: [VisionCore]: YOLOv8 model loaded successfully.
INFO: [MQTTClient]: Connected to HiveMQ Cloud MQTT Broker via TLS
INFO: [MQTTClient]: Subscribed to: conf/turret/control/config, conf/turret/control/mode, conf/turret/control/fire
INFO: [WebcamStream]: Webcam initialized successfully at index 0 (640x480).
INFO: Uvicorn running on http://0.0.0.0:5000 (Press CTRL+C to quit)
```

> **Verifikasi Cepat:**
> Buka tab browser baru ke: `http://localhost:5000/video_feed`
> * **Harus muncul:** Tampilan live webcam dengan crosshair cyan di tengah dan panel HUD di pojok kiri atas.
> * Biarkan tab terminal ini tetap berjalan (jangan ditutup).

---

## Langkah 2: Jalankan Web Dashboard (Terminal 2)

Web Dashboard adalah Command Center untuk operator memantau video stream, memilih target, dan melihat riwayat tembakan.

### 📍 Di Mana Dijalankan:
Buka jendela **PowerShell** kedua.

### ⌨️ Perintah:
```powershell
# 1. Pindah ke direktori dashboard
cd d:\applications\auto-turret-master\auto-aim-turret

# 2. Jalankan server Next.js development
bun dev
```

### ✅ Apa yang Harus Diharapkan (Expected Output):
Tunggu sampai muncul status siap:
```text
  ▲ Next.js 16.3.1
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Starting...
 ✓ Ready in 1.8s
```

> Biarkan tab terminal ini tetap berjalan.

---

## Langkah 3: Buka Browser & Masuk ke Command Center

1. Buka browser (Google Chrome / Edge) dan navigasikan ke:
   👉 **`http://localhost:3000`**
2. Jika diminta login, masukkan akun operator Anda:
   * Masukkan **Email & Password**.
   * Klik tombol **"Authenticate & Enter"**.
3. **Periksa Indikator Dashboard:**
   * Di bar navigasi atas: badge **`CLOUD WSS: CONNECTED`** harus berwarna hijau / menyala.
   * Di panel kiri: **Live Video Feed** langsung menampilkan gambar webcam dari Vision Node.
   * Di panel kanan: **Control Panel** menampilkan status target aktif (`PERSON`) dan mode (`AUTO`).
   * Di bagian bawah: **Firing Event History Table** menampilkan riwayat log Supabase.

---

## Langkah 4: Monitor Serial ESP32 (Terminal 3 / VS Code - Opsional)

Untuk memastikan ESP32 terhubung ke Wi-Fi dan menerima data MQTT secara langsung.

### 📍 Di Mana Dijalankan:
Buka **VS Code** pada folder `hardware-turret` ATAU buka PowerShell ketiga:

### ⌨️ Perintah (Jika menggunakan PlatformIO CLI):
```powershell
cd d:\applications\auto-turret-master\hardware-turret
pio device monitor -b 115200
```
*(Atau di VS Code: cukup klik ikon **Serial Monitor** (gambar steker/plug) di taskbar bawah).*

### ✅ Apa yang Harus Diharapkan (Expected Output):
```text
[CALIBRATION] Memulai kalibrasi titik tengah Servo Pan...
[CALIBRATION] Sapuan homing: bergerak ke kiri (60°)...
[CALIBRATION] Sapuan homing: bergerak ke kanan (120°)...
[CALIBRATION] Kembali dan mengunci di TITIK TENGAH (90°)...
[CALIBRATION] Kalibrasi selesai! Servo Pan terkunci di titik tengah (90°).
[WiFi] Connecting to DX HOME..........
[WiFi] Connected! IP: 192.168.1.xxx
[MQTT] Connecting to d847cd151fbe4985a1bc32cbd787651d.s1.eu.hivemq.cloud:8883 ...
[MQTT] Connected to HiveMQ Cloud!
[MQTT] Subscribed to: conf/turret/vision/error, conf/turret/control/fire
[Setup] All FreeRTOS tasks launched. System ready.
```

---

## Langkah 5: Pengujian Operasional Lengkap (Live Test)

Setelah semua komponen siap, lakukan tes operasional berikut:

### A. Uji Pelacakan Target (Target Tracking)
1. Berdirilah di depan USB camera.
2. Di layar dashboard web:
   * Kotak hijau **`LOCKED: PERSON (0.85)`** membungkus tubuh Anda.
   * Garis merah tracking vector menghubungkan titik pusat kamera ke tubuh Anda.
3. Di Serial Monitor ESP32 akan masuk data:
   ```text
   [MQTT] Received [conf/turret/vision/error]: {"dx": 42, "found": true, "locked": false}
   ```
4. Servo Pan MG996R akan memutar dudukan kamera secara proporsional mengarahkan bidikan ke Anda.

### B. Uji Tembakan Otomatis (Auto-Fire on Lock)
1. Diamlah tepat di tengah bidikan (crosshair cyan):
   * Nilai $|dx| \le 25\text{ px}$.
   * Di Vision Node dan ESP32, target terdeteksi **LOCKED**.
2. **Sekuens Tembakan Berjalan Otomatis:**
   1. Relay berbunyi *klik* $\rightarrow$ **kedua Motor DC Flywheel menyala dan berputar kencang**.
   2. **Jeda 0,5 detik** berjalan untuk spin-up flywheel.
   3. **Servo SG90 maju ke $90^\circ$** mendorong peluru masuk ke putaran motor DC.
   4. **Peluru terlontar keluar**.
   5. **Servo SG90 mundur kembali ke $0^\circ$**.
   6. Relay *klik* $\rightarrow$ **kedua Motor DC mati**.
3. **Di Layar Web Dashboard:**
   * Border video menyala merah (lock pulse).
   * Notifikasi Toast muncul di pojok kanan bawah: **`TARGET FIRED: Locked on person`**.
   * Baris baru otomatis masuk ke tabel **Firing Event History**.

### C. Uji Tembakan Manual (Manual Snap & Fire)
1. Di Control Panel kanan dashboard, klik tombol merah **"Manual Snap & Fire"**.
2. Sekuens motor DC (0,5s) + dorongan servo SG90 akan dieksekusi secara instan.

---

## 🛑 Prosedur Mematikan Sistem (Clean Shutdown)

Jika sesi pengujian selesai, matikan dengan urutan yang rapi:

1. **Dashboard:** Klik tombol **Logout** di pojok kanan atas, lalu di Terminal 2 tekan `Ctrl + C`.
2. **Vision Node:** Di Terminal 1 tekan `Ctrl + C` (tunggu sampai log `Webcam stream stopped` muncul).
3. **Hardware:** Cabut kabel USB ESP32 dan matikan saklar Power Supply 5V eksternal.

---

## ⚡ Tabel Troubleshooting Cepat (1-Minute Fix)

| Gejala                                                     | Penyebab Umum                                        | Solusi Cepat                                                                      |
| ---------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Layar video di web hitam pekat**                         | Windows Camera app masih terbuka, atau backend salah | Tutup semua aplikasi kamera lain. Pastikan `main.py` menggunakan `cv2.CAP_MSMF`.  |
| **Pesan `Subscription error client disconnecting` di web** | Efek double-mount React StrictMode                   | Muat ulang (*refresh*) halaman `localhost:3000` satu kali. Guard sudah terpasang. |
| **`dx` bernilai 0 terus menerus**                          | Tidak ada orang di depan kamera atau webcam terputus | Pastikan Anda berdiri di jangkauan kamera dan model melabeli `LOCKED: PERSON`.    |
| **ESP32 tidak merespons gerakan**                          | Common Ground (GND) PSU belum tersambung ke ESP32    | Sambungkan kabel minus (GND) dari adaptor 5V ke salah satu pin GND di ESP32.      |
| **Relay / Motor DC tidak menyala**                         | Tegangan PSU drop saat motor menyala                 | Gunakan PSU minimal 5V 2A-3A tersendiri untuk motor DC & servo.                   |
| **Dashboard tidak bisa login**                             | Koneksi internet terputus (Supabase butuh internet)  | Pastikan PC terhubung ke internet untuk validasi token Supabase.                  |
