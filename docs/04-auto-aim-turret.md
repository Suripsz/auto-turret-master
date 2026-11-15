	# 04 — Auto-Aim Turret: Setup Web Dashboard Next.js

> Komponen: `auto-aim-turret/`  
> Framework: Next.js 16, React 19, TypeScript, Tailwind CSS  
> Database & Auth: Supabase  
> MQTT: HiveMQ Cloud (koneksi langsung dari browser via WebSocket)  
> Port default: **3000**  
> Waktu setup: ~5–10 menit

---

## Gambaran Umum Dashboard

Dashboard web adalah antarmuka utama bagi operator:
- **Login** aman via Supabase Auth (email + password)
- **Live video stream** dari Vision Node (MJPEG embed)
- **Status koneksi MQTT** real-time
- **Control Panel**: pilih target kelas, mode (Auto/Manual), trigger tembak manual
- **Event Log Table**: riwayat 50 tembakan terakhir dari Supabase database
- **Toast notifikasi** setiap kali terjadi event tembak (via MQTT)

---

## 4.1 Navigasi ke Folder

```powershell
cd D:\applications\auto-turret-master\auto-aim-turret
```

---

## 4.2 Install Dependencies Node.js

```powershell
npm install
```

Proses ini mengunduh semua package yang terdaftar di `package.json` ke folder `node_modules/`. Membutuhkan koneksi internet dan waktu 2–5 menit.

Package utama yang diinstal:
| Package | Fungsi |
|---------|--------|
| `next@16.3.1` | Framework React SSR/SSG |
| `react@19` + `react-dom@19` | UI library |
| `mqtt@^5.15` | MQTT WebSocket client (browser) |
| `@supabase/supabase-js` | Supabase JavaScript SDK |
| `@supabase/ssr` | Supabase Auth helper untuk Next.js |
| `@prisma/client` | Prisma ORM client (saat ini tidak dipakai aktif) |
| `tailwindcss@^4` | Utility CSS framework |
| `lucide-react` | Icon library |

---

## 4.3 Konfigurasi Environment Variables

Buat file `.env.local` di dalam folder `auto-aim-turret/`:

```
auto-aim-turret/
└── .env.local    ← Buat file ini (jangan .env, gunakan .env.local untuk Next.js)
```

Isi file `.env.local`:

```env
# ============================================================
# Supabase — Database & Authentication
# ============================================================
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================
# HiveMQ Cloud MQTT (koneksi langsung dari browser)
# PERHATIAN: Variabel NEXT_PUBLIC_ akan tersedia di client-side JS
# ============================================================
NEXT_PUBLIC_MQTT_USERNAME=dash-auto-aim
NEXT_PUBLIC_MQTT_PASSWORD=PASSWORD_MQTT_ANDA

# ============================================================
# Database (untuk Prisma — opsional, tidak dipakai alur utama)
# ============================================================
DATABASE_URL=postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres
```

> **Cara mendapatkan nilai Supabase:**
> 1. Login ke https://supabase.com/dashboard
> 2. Pilih project Anda
> 3. Klik **Settings** → **API**
> 4. Salin **Project URL** dan **anon public** key

> **Cara mendapatkan nilai MQTT:**
> Login ke https://console.hivemq.cloud dan lihat credentials cluster Anda.

---

## 4.4 Setup Middleware Next.js (Penting!)

> ⚠️ **Bug yang perlu diperbaiki:** File middleware autentikasi saat ini bernama `proxy.ts` padahal Next.js hanya mengenali `middleware.ts`.

Buat file baru `middleware.ts` di root folder `auto-aim-turret/` (sejajar dengan folder `app/`):

```
auto-aim-turret/
├── app/
├── components/
├── middleware.ts    ← Buat file baru ini
└── proxy.ts        ← File lama (bisa dibiarkan atau dihapus)
```

Isi `middleware.ts`:

```typescript
import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

Langkah ini memastikan proteksi autentikasi server-side aktif. Tanpa ini, halaman dashboard bisa diakses tanpa login.

---

## 4.5 Verifikasi Supabase Database

Pastikan tabel `fire_events` sudah ada di Supabase. Buka **Supabase Dashboard → SQL Editor** dan jalankan:

```sql
-- Cek apakah tabel sudah ada
SELECT * FROM fire_events LIMIT 1;
```

Jika tabel belum ada, jalankan SQL berikut:

```sql
CREATE TABLE IF NOT EXISTS fire_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target      TEXT NOT NULL,
  distance_cm FLOAT NOT NULL,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE fire_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert" ON fire_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon select" ON fire_events
  FOR SELECT TO anon USING (true);
```

---

## 4.6 Menjalankan Dashboard (Development Mode)

```powershell
npm run dev
```

Output berhasil:
```
  ▲ Next.js 16.3.1
  - Local:        http://localhost:3000
  - Network:      http://192.168.1.xxx:3000

 ✓ Starting...
 ✓ Ready in 2.1s
```

Buka browser dan akses: **http://localhost:3000**

---

## 4.7 Alur Login Pertama Kali

### Membuat Akun Operator

1. Buka http://localhost:3000 — akan redirect ke `/login`
2. Klik **"Need an operator account? Sign Up"**
3. Masukkan email dan password
4. Klik **"Create Account"**
5. Jika email konfirmasi diperlukan: cek inbox email, klik link konfirmasi
6. Login dengan kredensial yang baru dibuat

> **Menonaktifkan email konfirmasi (untuk development):**
> Supabase Dashboard → Authentication → Providers → Email → matikan *"Confirm email"*

---

## 4.8 Menggunakan Dashboard

### Panel Kiri: Video Feed
- Menampilkan live stream dari Vision Node (`http://localhost:5000/video_feed`)
- Overlay HUD dengan status target dan mode
- Efek border merah menyala saat terjadi event tembak

### Panel Kanan: Control Panel

| Kontrol | Fungsi |
|---------|--------|
| **Target Class** | Pilih kelas objek yang dideteksi: Person, Cup, Bottle, Drone, Custom |
| **Mode: Auto** | Servo mengikuti target secara otomatis, tembak saat di-command |
| **Mode: Manual** | Servo dikendalikan manual |
| **Manual Snap & Fire** | Trigger tembak manual + ambil snapshot |

Saat memilih target atau mode, dashboard mengirim perintah via MQTT ke vision-node dan ESP32.

### Bagian Bawah: Event Log Table
- Menampilkan 50 riwayat tembakan terbaru dari Supabase
- Kolom: Event ID, Timestamp, Target Class, Distance (cm), Status
- Tombol **Refresh** untuk muat ulang data

### Toast Notifikasi
- Muncul di pojok kanan bawah setiap kali ada event tembak
- Menampilkan: target class dan jarak saat tembak
- Auto-dismiss setelah 4 detik

---

## 4.9 Build untuk Production

Untuk deployment ke server/Vercel:

```powershell
# Build production
npm run build

# Jalankan production server
npm run start
```

---

## 4.10 Troubleshooting Dashboard

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| Halaman tidak muncul setelah login | `middleware.ts` belum dibuat | Buat file `middleware.ts` sesuai langkah 4.4 |
| "Failed to fetch logs" | `NEXT_PUBLIC_SUPABASE_URL` salah | Periksa `.env.local` |
| Video feed tidak muncul | Vision Node belum berjalan | Jalankan `python main.py` di vision-node |
| MQTT status: "disconnected" | Credential MQTT salah | Periksa `NEXT_PUBLIC_MQTT_*` di `.env.local` |
| MQTT status: "error" | HiveMQ Cloud tidak bisa diakses | Cek koneksi internet, cek status HiveMQ |
| Tabel log kosong | Tabel Supabase belum dibuat | Jalankan SQL di langkah 4.5 |
| Login loop / selalu redirect | Supabase URL/key salah | Periksa `.env.local`, restart `npm run dev` |
| Port 3000 sudah dipakai | Proses lain | Jalankan `npm run dev -- -p 3001` |

---

## 4.11 Checklist Dashboard

```
[ ] npm install selesai tanpa error
[ ] File .env.local dibuat dengan nilai Supabase & MQTT yang benar
[ ] File middleware.ts dibuat di root auto-aim-turret/
[ ] Tabel fire_events ada di Supabase
[ ] npm run dev berjalan (http://localhost:3000)
[ ] Halaman login muncul
[ ] Bisa login / buat akun operator
[ ] Video feed tampil (atau placeholder jika vision-node belum jalan)
[ ] MQTT status: "connected" di header
[ ] Event log table dapat memuat data
```

---

➡️ Lanjut ke **[05 — Menjalankan Full System](./05-running-full-system.md)**

