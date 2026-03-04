# 💰 Westfield RP - Sistem Kas & Iuran

Sistem manajemen kas dan iuran mingguan untuk staff server GTA SAMP **Westfield Roleplay**.

## ✨ Fitur

- 📊 **Dashboard** - Grafik pemasukan & pengeluaran, ringkasan kas
- 💳 **Bayar Iuran via QRIS** - Integrasi Midtrans, bayar pake e-wallet / m-banking
- 📋 **Riwayat Transaksi** - Log semua iuran masuk, transparan untuk semua staff
- 💸 **Tracking Pengeluaran** - Catat pengeluaran server (hosting, domain, dll)
- 👥 **Kelola Staff** - Tambah/nonaktifkan staff (admin only)
- 📄 **Export Laporan** - Download laporan kas dalam format PDF & Excel
- 🔐 **Role-based Access** - Admin & Staff dengan akses berbeda

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Credentials)
- **Payment**: Midtrans (QRIS)
- **Charts**: Chart.js + react-chartjs-2
- **Export**: jsPDF + xlsx

## 🚀 Cara Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

Pastikan PostgreSQL sudah running. Buat database baru:

```sql
CREATE DATABASE iuran_westfield;
```

### 3. Konfigurasi Environment

Copy `.env.example` ke `.env` dan isi dengan konfigurasi yang sesuai:

```bash
cp .env.example .env
```

Edit file `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/iuran_westfield"

# NextAuth (generate secret: openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random-secret-kamu"

# Midtrans - Daftar di https://midtrans.com
MIDTRANS_SERVER_KEY="SB-Mid-server-xxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxx"
MIDTRANS_IS_PRODUCTION="false"
```

### 4. Migrasi Database

```bash
npx prisma migrate dev --name init
```

### 5. Seed Data Awal

```bash
npm run db:seed
```

### 6. Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📌 Default Accounts

| Role  | Email                 | Password  |
|-------|-----------------------|-----------|
| Admin | admin@westfield.com   | admin123  |
| Staff | john@westfield.com    | staff123  |
| Staff | jane@westfield.com    | staff123  |
| Staff | alex@westfield.com    | staff123  |
| Staff | mike@westfield.com    | staff123  |
| Staff | sarah@westfield.com   | staff123  |

> ⚠️ Ganti password setelah deploy ke production!

## 🔧 Midtrans Setup

1. Daftar akun di [midtrans.com](https://midtrans.com)
2. Masuk ke [dashboard sandbox](https://dashboard.sandbox.midtrans.com) untuk testing
3. Ambil **Server Key** & **Client Key** di menu Settings > Access Keys
4. Set notification URL di Settings > Configuration: `https://domain-kamu.com/api/payment/callback`
5. Untuk production, gunakan key dari [dashboard production](https://dashboard.midtrans.com) dan set `MIDTRANS_IS_PRODUCTION="true"`

### Notification URL

Midtrans akan mengirim notifikasi ke URL ini setiap kali ada perubahan status transaksi. Pastikan URL bisa diakses dari internet (untuk development, gunakan [ngrok](https://ngrok.com)).

```bash
ngrok http 3000
```

Lalu set notification URL di Midtrans Dashboard > Settings > Configuration ke URL ngrok kamu.

## 📁 Struktur Project

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth handler
│   │   ├── dashboard/            # Dashboard stats API
│   │   ├── expenses/             # CRUD pengeluaran
│   │   ├── payment/
│   │   │   ├── create/           # Buat pembayaran QRIS
│   │   │   └── callback/         # Midtrans webhook
│   │   ├── transactions/         # Riwayat iuran
│   │   └── users/                # Kelola staff
│   ├── dashboard/
│   │   ├── page.tsx              # Dashboard utama
│   │   ├── payment/              # Bayar iuran
│   │   ├── transactions/         # Riwayat transaksi
│   │   ├── expenses/             # Pengeluaran
│   │   ├── members/              # Kelola staff (admin)
│   │   └── reports/              # Export laporan
│   └── login/                    # Halaman login
├── components/                    # Reusable components
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── prisma.ts                 # Prisma client
│   ├── midtrans.ts               # Midtrans integration
│   └── utils.ts                  # Helper functions
└── types/                         # TypeScript types
```

## 🌐 Deploy ke Production

### Vercel (Recommended)

1. Push ke GitHub
2. Import project di [vercel.com](https://vercel.com)
3. Set environment variables
4. Deploy!

### VPS

```bash
npm run build
npm start
```

Gunakan PM2 untuk process manager:

```bash
pm2 start npm --name "iuran-westfield" -- start
```

## 📝 Alur Pembayaran

```
Staff pilih nominal (5k-10k)
        ↓
Sistem buat transaksi QRIS di Midtrans
        ↓
QR Code QRIS ditampilkan
        ↓
Staff scan & bayar via e-wallet/m-banking
        ↓
Midtrans kirim notification ke server
        ↓
Sistem verifikasi signature SHA512
        ↓
Status iuran diupdate jadi LUNAS
        ↓
Saldo kas bertambah otomatis
```

## 📜 License

MIT - Dibuat untuk komunitas Westfield Roleplay
