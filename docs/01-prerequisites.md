# 01 — Prerequisites & Persiapan Awal

> Semua software yang perlu diinstal sebelum menjalankan komponen apapun.
> Lakukan bagian ini **satu kali** di mesin development.

---

## 1.1 Sistem Operasi & Persyaratan Umum

| Komponen | Minimum | Rekomendasi |
|----------|---------|-------------|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| RAM | 8 GB | 16 GB |
| Storage | 10 GB kosong | 20 GB (untuk model AI + node_modules) |
| CPU | Intel i5 Gen 8 / Ryzen 5 3600 | Intel i7 Gen 10+ / Ryzen 7 |
| GPU | Tidak wajib | NVIDIA (mempercepat YOLOv8 inference) |
| USB | 1 port tersedia | 1 port untuk ESP32 |
| Webcam | 720p | 1080p |

---

## 1.2 Node.js & Package Manager

Diperlukan oleh: **auto-aim-turret (web dashboard)**

### Instalasi Node.js

1. Buka https://nodejs.org dan download versi **LTS (v20 atau lebih baru)**
2. Jalankan installer, centang opsi *"Add to PATH"*
3. Verifikasi instalasi:

```powershell
node --version    # harus v20.x.x atau lebih baru
npm --version     # harus v10.x.x atau lebih baru
```

### Instalasi pnpm (opsional, direkomendasikan)

```powershell
npm install -g pnpm
pnpm --version
```

---

## 1.3 Python

Diperlukan oleh: **vision-node**

### Instalasi Python

1. Buka https://www.python.org/downloads/ dan download **Python 3.11** atau **3.12**

   > ⚠️ Jangan menggunakan Python 3.13+ karena beberapa library CV belum stabil di versi tersebut.

2. Jalankan installer. **WAJIB centang**: ✅ *"Add Python to PATH"*

3. Verifikasi:

```powershell
python --version    # harus 3.11.x atau 3.12.x
pip --version
```

---

## 1.4 PlatformIO

Diperlukan oleh: **hardware-turret (flash firmware ke ESP32)**

PlatformIO tersedia dalam dua cara — gunakan salah satu:

### Opsi A: PlatformIO IDE (Extension VS Code) — Direkomendasikan

1. Install **Visual Studio Code** dari https://code.visualstudio.com
2. Buka VS Code → tekan `Ctrl+Shift+X` (Extensions)
3. Cari **"PlatformIO IDE"** → klik Install
4. Restart VS Code setelah instalasi
5. Verifikasi: ikon PlatformIO (semut) akan muncul di sidebar kiri

### Opsi B: PlatformIO Core (CLI)

```powershell
pip install platformio
pio --version    # verifikasi
```

---

## 1.5 Driver USB untuk ESP32

ESP32 DOIT DevKit V1 menggunakan chip USB-to-Serial **CP2102** (Silicon Labs).

1. Download driver dari: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
2. Pilih **"CP210x Windows Drivers"** → Extract & jalankan `CP210xVCPInstaller_x64.exe`
3. Restart komputer setelah instalasi
4. Colokkan ESP32 via kabel USB, buka Device Manager:
   - Harus muncul: **Ports (COM & LPT) → Silicon Labs CP210x USB to UART Bridge (COMx)**
   - Catat nomor COMx (contoh: `COM3`) — akan dipakai saat upload firmware

---

## 1.6 Git (Opsional tapi Direkomendasikan)

```powershell
# Verifikasi apakah sudah ada
git --version

# Jika belum, download dari: https://git-scm.com/download/win
```

---

## 1.7 Akun & Layanan Cloud

Dua layanan cloud yang digunakan proyek ini — keduanya gratis untuk skala kecil:

### HiveMQ Cloud (MQTT Broker)

Proyek ini **sudah dikonfigurasi** menggunakan broker HiveMQ Cloud yang ada. Jika ingin membuat broker sendiri:

1. Daftar gratis di https://www.hivemq.com/mqtt-cloud-broker/
2. Buat cluster baru (Serverless — Free tier)
3. Catat: **Host URL**, **Username**, **Password**
4. Aktifkan port **8883** (MQTT TLS) dan **8884** (WebSocket TLS)
5. Buat dua credential berbeda:
   - Satu untuk **Dashboard + Vision Node** (subscribe/publish)
   - Satu untuk **ESP32** (subscribe/publish)

### Supabase (Database & Auth)

Proyek ini **sudah dikonfigurasi** menggunakan project Supabase yang ada. Jika ingin membuat project baru:

1. Daftar gratis di https://supabase.com
2. Buat project baru, pilih region terdekat
3. Setelah project siap, buka **SQL Editor** dan jalankan:

```sql
-- Buat tabel riwayat tembakan
CREATE TABLE fire_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target      TEXT NOT NULL,
  distance_cm FLOAT NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- Izinkan akses publik baca-tulis (untuk anon key)
ALTER TABLE fire_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert" ON fire_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon select" ON fire_events
  FOR SELECT TO anon USING (true);
```

4. Catat dari **Settings → API**:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon public key**: kunci panjang yang dimulai dengan `eyJ...`

---

## 1.8 Checklist Akhir Prerequisites

Sebelum lanjut, pastikan semua item ini terpenuhi:

```
[ ] Node.js v20+ terinstal (node --version)
[ ] Python 3.11 atau 3.12 terinstal (python --version)
[ ] PlatformIO terinstal (VS Code extension ATAU pio CLI)
[ ] Driver CP2102 terinstal
[ ] ESP32 terdeteksi di Device Manager sebagai COMx
[ ] Akses ke HiveMQ Cloud credentials (host, user, password)
[ ] Akses ke Supabase credentials (URL + anon key)
[ ] Webcam tersambung (internal atau USB)
```

---

➡️ Lanjut ke **[02 — Hardware Turret Setup](./02-hardware-turret.md)**
 