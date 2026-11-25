# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# NEXUS LOCK SCREEN

**Versi:** 1.0  
**Status:** Draft – Ready for Development Planning  
**Platform:** Android  
**Target:** Smartphone Android  
**Development Environment:** Linux Terminal + GitHub  
**Framework:** React Native + TypeScript + Kotlin

---

## 1. Product Overview

### 1.1 Nama Produk
Nexus Lock Screen

### 1.2 Deskripsi Produk

Nexus Lock Screen adalah aplikasi Android yang menghadirkan pengalaman layar kunci alternatif dengan orientasi landscape.

Aplikasi ini mengusung desain Material You dengan sentuhan anime wallpaper, tampilan informasi perangkat, widget jam, status baterai, dan interaksi swipe-up untuk membuka layar aplikasi.

Pengguna dapat memilih wallpaper sendiri melalui galeri perangkat dengan sistem Smart Crop agar gambar menyesuaikan ukuran layar landscape.

### 1.3 Product Vision

Mengubah pengalaman layar kunci smartphone Android menjadi tampilan horizontal yang elegan, personal, dan memiliki nuansa gaming console.

### 1.4 Target Pengguna

- Pengguna smartphone Android.
- Penggemar tampilan landscape.
- Pengguna yang menyukai wallpaper anime.
- Pengguna yang ingin mempersonalisasi tampilan layar kunci.
- Pengguna yang menggunakan smartphone sebagai perangkat gaming.

---

## 2. Product Goals

Tujuan utama pengembangan:

1. Membuat alternatif tampilan layar kunci Android.
2. Mempertahankan orientasi landscape.
3. Menghadirkan tampilan Material You yang modern.
4. Memungkinkan pengguna memilih wallpaper sendiri.
5. Mengimplementasikan gesture swipe-up.
6. Menampilkan informasi perangkat secara real-time.
7. Menghasilkan APK yang dapat diinstal tanpa Android Studio.

### Success Criteria

- Aplikasi dapat dijalankan pada perangkat Android yang didukung.
- Antarmuka tampil dalam orientasi landscape.
- Wallpaper dapat dipilih dari galeri.
- Smart Crop berfungsi dengan baik.
- Jam dan tanggal diperbarui otomatis.
- Informasi baterai sesuai dengan perangkat.
- Gesture swipe-up terdeteksi dengan benar.
- APK berhasil dibuat dan diinstal.

---

## 3. UI/UX Design Requirements

### 3.1 Design Direction

Konsep desain mengacu pada file HTML desain yang diberikan pengguna.

Gaya desain:
- Material You.
- Dark Theme.
- Anime Background.
- Glassmorphism ringan.
- Rounded Components.
- Minimalist Landscape Interface.

### 3.2 Color Palette

| Element | Color |
|---|---|
| Background | #121316 |
| Surface | #1F1F22 |
| Elevated Surface | #292A2D |
| Primary | #B0C7F7 |
| Tertiary | #E6C279 |
| Secondary Text | #C4C6CF |

### 3.3 Typography

- Plus Jakarta Sans: jam dan display.
- Rubik: informasi dan teks.
- Material Symbols: ikon.

### 3.4 Layout Structure

**A. Top Section**
- Cellular signal.
- Wi-Fi indicator.
- Network type.
- Battery percentage.

**B. Left Section**
- Date and weather chip.
- Large digital clock.
- Timezone information.

**C. Right Section**
- Battery information card.
- Charging status.
- Battery percentage.
- Battery progress bar.

**D. Bottom Section**
- Flashlight shortcut.
- Swipe-up instruction.
- Lock indicator.
- Camera shortcut.

### 3.5 Wallpaper System

Pengguna dapat memilih wallpaper melalui galeri.

Persyaratan:
- Mendukung JPEG, PNG, dan format gambar yang kompatibel.
- Menggunakan fullscreen image rendering.
- Menggunakan Smart Crop.
- Mempertahankan rasio layar.
- Mengatur focal point gambar.
- Menyimpan pilihan wallpaper agar tetap digunakan setelah aplikasi ditutup.

---

## 4. Functional Requirements

### FR-01: Landscape Orientation

Aplikasi harus menggunakan orientasi landscape.

Acceptance Criteria:
- Activity utama menggunakan orientasi landscape.
- Layout menyesuaikan ukuran layar.
- UI tidak mengalami overflow.
- Perubahan konfigurasi layar ditangani dengan benar.

### FR-02: Wallpaper Customization

Pengguna dapat memilih wallpaper sendiri.

Acceptance Criteria:
- Galeri dapat dibuka.
- Pengguna dapat memilih gambar.
- Gambar ditampilkan menggunakan Smart Crop.
- Wallpaper tetap tersimpan setelah aplikasi ditutup.

### FR-03: Smart Crop Engine

Sistem menyesuaikan wallpaper dengan ukuran layar.

Acceptance Criteria:
- Gambar memenuhi area layar.
- Tidak ada distorsi rasio.
- Focal point dapat diatur.
- Pengguna dapat menggeser posisi crop.

### FR-04: Clock Widget

Menampilkan jam digital secara real-time.

Acceptance Criteria:
- Format jam 24 jam.
- Jam diperbarui setiap menit.
- Mengikuti waktu perangkat.
- Mendukung zona waktu lokal.

### FR-05: Date Widget

Menampilkan hari dan tanggal.

Acceptance Criteria:
- Bahasa Indonesia.
- Tanggal diperbarui otomatis.
- Mengikuti tanggal sistem.

### FR-06: Battery Widget

Menampilkan:
- Persentase baterai.
- Status pengisian.
- Indikator baterai.
- Informasi estimasi pengisian apabila tersedia dari sistem.

Data yang tidak tersedia tidak boleh dibuat-buat.

### FR-07: Swipe-Up Unlock

Pengguna menggeser layar dari bawah ke atas untuk menjalankan aksi unlock.

Acceptance Criteria:
- Gesture dapat dikenali.
- Animasi mengikuti pergerakan jari.
- Terdapat indikator swipe.
- Gesture memiliki batas minimum agar tidak aktif karena sentuhan tidak sengaja.
- Setelah gesture berhasil, aplikasi menjalankan alur keluar dari layar alternatif.

Catatan: Gesture ini tidak menghapus atau melewati autentikasi keamanan Android.

### FR-08: Flashlight Shortcut

Menyediakan tombol senter.

Acceptance Criteria:
- Tombol dapat mengaktifkan dan menonaktifkan senter.
- Meminta izin yang diperlukan.
- Menangani perangkat tanpa flash.

### FR-09: Camera Shortcut

Menyediakan tombol untuk membuka kamera perangkat.

Acceptance Criteria:
- Dapat menjalankan aplikasi kamera yang tersedia.
- Menangani kondisi aplikasi kamera tidak tersedia.

### FR-10: Status Information

Menampilkan informasi:
- Koneksi seluler.
- Wi-Fi.
- Jenis jaringan.
- Status baterai.

Informasi harus berasal dari sistem Android dan mengikuti izin serta pembatasan OS.

---

## 5. Technical Architecture

### 5.1 Technology Stack

| Technology | Responsibility |
|---|---|
| React Native | User Interface |
| TypeScript | Application Logic |
| Kotlin | Android Native Integration |
| Gradle | Android Build System |
| Android SDK | Android Platform APIs |
| Git | Version Control |
| GitHub | Source Code Repository |
| GitHub Actions | Automated APK Build |

### 5.2 Application Architecture

Arsitektur menggunakan pendekatan hybrid.

React Native menangani:
- UI rendering.
- Clock widget.
- Wallpaper display.
- Swipe gesture.
- Animation.
- Application state.

Kotlin menangani:
- Android orientation.
- Battery information.
- Flashlight integration.
- Camera intent.
- Android lifecycle.
- Native system integration.

### 5.3 Project Structure

```text
nexus-lock-screen/
│
├── android/
│   └── app/
│       └── src/main/
│           ├── java/
│           │   └── com/nexuslock/
│           │       ├── MainActivity.kt
│           │       └── MainApplication.kt
│           └── AndroidManifest.xml
│
├── src/
│   ├── components/
│   │   ├── StatusBar.tsx
│   │   ├── ClockWidget.tsx
│   │   ├── WeatherWidget.tsx
│   │   ├── BatteryCard.tsx
│   │   ├── SwipeUpUnlock.tsx
│   │   └── ShortcutButton.tsx
│   │
│   ├── screens/
│   │   └── LockScreen.tsx
│   │
│   ├── hooks/
│   │   ├── useClock.ts
│   │   ├── useBattery.ts
│   │   └── useWallpaper.ts
│   │
│   ├── services/
│   │   └── WallpaperService.ts
│   │
│   └── theme/
│       └── colors.ts
│
├── .github/
│   └── workflows/
│       └── android-build.yml
│
├── package.json
├── tsconfig.json
├── app.json
└── README.md
```

---

## 6. Android System Integration

Aplikasi merupakan Custom Lock Screen berbasis aplikasi biasa, bukan pengganti penuh Android Keyguard.

Batasan teknis:
- Android tetap mengelola keamanan sistem.
- Aplikasi tidak boleh melewati PIN, pola, password, atau biometrik.
- Aplikasi tidak memiliki hak untuk menggantikan Keyguard sepenuhnya.
- Aktivasi ketika layar mati atau perangkat dinyalakan kembali membutuhkan integrasi Android tambahan.
- Perilaku background bergantung pada versi Android dan kebijakan perangkat.

Target implementasi adalah menghadirkan layar alternatif yang dapat dipanggil dan ditampilkan oleh Android dengan tetap mempertahankan keamanan sistem.

---

## 7. Non-Functional Requirements

### Performance
- Animasi swipe harus terasa responsif.
- UI harus tetap lancar.
- Penggunaan memori wallpaper harus diperhatikan.
- Tidak melakukan polling baterai secara berlebihan.

### Reliability
- Aplikasi tidak crash ketika wallpaper gagal dimuat.
- Aplikasi menangani perubahan orientasi.
- Aplikasi menangani perubahan status baterai.
- Aplikasi menangani permission denial.

### Compatibility
- Mendukung perangkat Android yang kompatibel dengan versi React Native yang digunakan.
- Mendukung beberapa resolusi layar.
- Mendukung berbagai rasio landscape.

### Privacy
- Wallpaper diproses secara lokal.
- Tidak mengunggah gambar pengguna.
- Tidak mengumpulkan data pribadi yang tidak diperlukan.
- Izin Android digunakan sesuai kebutuhan fitur.

---

## 8. Development Workflow

Pengembangan dilakukan tanpa Android Studio.

### Development Environment

- Linux Terminal.
- Node.js.
- npm.
- JDK.
- Android SDK Command-line Tools.
- Gradle.
- Git.
- GitHub.

### Build Workflow

```text
Developer
    |
    v
Linux Terminal
    |
    v
React Native + TypeScript
    |
    v
Kotlin Android Integration
    |
    v
Git Commit & Push
    |
    v
GitHub Repository
    |
    v
GitHub Actions
    |
    v
Android Gradle Build
    |
    v
APK Artifact
```

### Build Output

```text
app-debug.apk
app-release.apk
```

APK release harus ditandatangani dengan signing key yang dikelola secara aman.

---

## 9. Development Roadmap

### Phase 1 — Project Initialization
- Setup Node.js.
- Setup JDK.
- Setup Android SDK.
- Setup React Native.
- Membuat repository GitHub.

### Phase 2 — UI Development
- Membuat LockScreen.
- Membuat ClockWidget.
- Membuat BatteryCard.
- Membuat StatusBar.
- Membuat ShortcutButton.

### Phase 3 — Wallpaper System
- Integrasi image picker.
- Implementasi Smart Crop.
- Implementasi focal point.
- Penyimpanan wallpaper.

### Phase 4 — Gesture System
- Implementasi swipe-up.
- Animasi gesture.
- Threshold detection.
- Unlock transition.

### Phase 5 — Kotlin Integration
- Landscape orientation.
- Battery monitoring.
- Flashlight.
- Camera shortcut.
- Lifecycle integration.

### Phase 6 — Testing
- Pengujian resolusi.
- Pengujian gesture.
- Pengujian wallpaper.
- Pengujian baterai.
- Pengujian kompatibilitas Android.

### Phase 7 — Release
- Build APK.
- Signing.
- Testing installation.
- Final release.

---

## 10. Testing Requirements

| Test | Expected Result |
|---|---|
| Landscape orientation | UI horizontal |
| Wallpaper selection | Gambar berhasil dipilih |
| Smart Crop | Gambar menyesuaikan layar |
| Clock | Waktu akurat |
| Date | Tanggal akurat |
| Battery | Persentase sesuai sistem |
| Swipe-up | Gesture terdeteksi |
| Flashlight | Senter berfungsi jika didukung |
| Camera | Kamera dapat dibuka |
| App restart | Wallpaper tetap tersimpan |
| APK installation | APK berhasil diinstal |

---

## 11. MVP Scope

Versi pertama hanya berfokus pada fitur inti.

**MVP Included:**
- Landscape lock screen interface.
- Custom wallpaper.
- Smart Crop.
- Digital clock.
- Date widget.
- Battery widget.
- Swipe-up gesture.
- Flashlight shortcut.
- Camera shortcut.

**Future Features:**
- Weather widget real-time.
- Custom themes.
- Animated wallpaper.
- Music player widget.
- Notification preview.
- Game launcher integration.
- Controller navigation.
- Advanced personalization.

---

## 12. Project Definition of Done

MVP dianggap selesai apabila:

1. Aplikasi berhasil dikompilasi menjadi APK.
2. APK dapat diinstal pada perangkat Android target.
3. Tampilan sesuai desain HTML yang menjadi acuan.
4. Landscape berjalan dengan benar.
5. Wallpaper custom dan Smart Crop berfungsi.
6. Semua widget inti berjalan.
7. Gesture swipe-up berfungsi.
8. Tidak ada crash pada alur penggunaan utama.
9. Keamanan Keyguard Android tetap dipertahankan.

---

## 13. Final Product Direction

Nexus Lock Screen dikembangkan sebagai aplikasi Android dengan pengalaman landscape lock screen yang terinspirasi dari Material You.

Fokus utama produk adalah personalisasi visual, wallpaper custom, interaksi swipe-up, serta informasi perangkat yang ditampilkan secara elegan.

**Development Principle:**

- Linux-first development.
- No Android Studio dependency.
- React Native + TypeScript frontend.
- Kotlin native integration.
- GitHub-based source management.
- Automated APK build.

**End of PRD — Nexus Lock Screen v1.0**
