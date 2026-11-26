# Nexus Lock Screen

Layar kunci Android alternatif dengan orientasi **landscape**, tema gelap Material You,
wallpaper pilihan sendiri (Smart Crop), jam real-time, status baterai/jaringan, serta
gesture swipe-up untuk keluar dari layar kunci.

Dibangun dengan **React Native 0.88 + TypeScript** untuk UI dan **Kotlin** untuk integrasi
sistem Android. APK dibangun otomatis melalui **GitHub Actions** — tanpa Android Studio.

> Catatan: file HTML desain acuan yang disebut pada PRD tidak tersedia di repositori ini.
> UI diimplementasikan mengikuti palette, tipografi, dan struktur layout PRD §3.

---

## Fitur MVP

| Fitur | Status | Catatan |
|---|---|---|
| Orientasi landscape | ✅ | `sensorLandscape` + immersive fullscreen |
| Wallpaper dari galeri | ✅ | System photo picker, tanpa izin storage |
| Smart Crop + focal point | ✅ | Cover-fit tanpa distorsi, geser & zoom, tersimpan |
| Jam digital 24 jam | ✅ | Update tepat per menit + refresh saat resume |
| Tanggal Bahasa Indonesia | ✅ | Format manual, tidak bergantung locale perangkat |
| Widget baterai | ✅ | Level, status charging, sumber daya, progress bar |
| Swipe-up unlock | ✅ | Threshold jarak/kecepatan + animasi mengikuti jari |
| Senter | ✅ | Camera2 torch, menangani perangkat tanpa flash |
| Shortcut kamera | ✅ | Intent kamera sistem, menangani kamera tidak tersedia |
| Info jaringan | ✅ | Wi-Fi / seluler / ethernet / VPN, generasi seluler bila diizinkan OS |

Fitur future sesuai PRD (cuaca real-time, tema kustom, wallpaper animasi, widget musik,
notifikasi, game launcher) belum termasuk MVP.

---

## Struktur Proyek

```text
.
├── App.tsx
├── src/
│   ├── components/
│   │   ├── BatteryCard.tsx
│   │   ├── ClockWidget.tsx
│   │   ├── Icon.tsx
│   │   ├── ShortcutButton.tsx
│   │   ├── StatusBar.tsx
│   │   ├── SwipeUpUnlock.tsx
│   │   ├── WallpaperBackdrop.tsx
│   │   ├── WallpaperSheet.tsx
│   │   └── WeatherWidget.tsx      # chip tanggal (cuaca = future feature)
│   ├── hooks/
│   │   ├── useBattery.ts
│   │   ├── useClock.ts
│   │   ├── useFlashlight.ts
│   │   ├── useNetwork.ts
│   │   └── useWallpaper.ts
│   ├── screens/LockScreen.tsx
│   ├── services/
│   │   ├── NexusNative.ts         # bridge typed ke Kotlin
│   │   └── WallpaperService.ts    # picker + AsyncStorage + import
│   ├── theme/
│   │   ├── colors.ts
│   │   └── typography.ts
│   ├── utils/smartCrop.ts
│   └── types.ts
├── android/app/src/main/
│   ├── java/com/nexuslock/
│   │   ├── MainActivity.kt
│   │   ├── MainApplication.kt
│   │   ├── NexusNativeModule.kt
│   │   └── NexusPackage.kt
│   ├── assets/fonts/              # Plus Jakarta Sans, Rubik, Material Symbols
│   └── AndroidManifest.xml
├── __tests__/
└── .github/workflows/android-build.yml
```

---

## Menjalankan Secara Lokal

Prasyarat:

- Node.js **≥ 22.11**
- JDK **17**
- Android SDK (platform 36, build-tools 36.0.0) + `ANDROID_HOME` yang valid
- Perangkat/emulator Android

```bash
npm install
npm run android          # build + install debug ke perangkat
```

Perintah lain:

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint
npm test                 # Jest (smart crop + render smoke test)
npm run build:debug      # android/gradlew assembleDebug
npm run build:release    # android/gradlew assembleRelease
```

APK debug dihasilkan di:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

> Environment pengembangan saat ini tidak memiliki JDK/Android SDK. Verifikasi build
> APK dilakukan melalui GitHub Actions.

---

## Build APK via GitHub Actions

Workflow `.github/workflows/android-build.yml` berjalan pada push/PR dan dapat dipicu
manual (`workflow_dispatch`). Setiap run menghasilkan artifact **nexus-lock-screen-debug**.

### Release bertanda tangan (opsional)

Tambahkan repository secrets berikut:

| Secret | Isi |
|---|---|
| `NEXUS_KEYSTORE_BASE64` | isi keystore PKCS12 yang di-encode base64 |
| `NEXUS_KEYSTORE_PASSWORD` | password keystore |
| `NEXUS_KEY_ALIAS` | alias key |
| `NEXUS_KEY_PASSWORD` | password key |

Membuat keystore dan nilai base64:

```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore nexus-release.keystore \
  -alias nexus -keyalg RSA -keysize 2048 -validity 10000

base64 -w0 nexus-release.keystore > nexus-release.keystore.b64
```

Jika keempat secret tersedia, workflow juga membangun dan mengunggah artifact
**nexus-lock-screen-release**. Tanpa secret lengkap, release build lokal memakai debug keystore
sebagai fallback — jangan dipakai untuk distribusi produksi.

---

## Catatan Teknis & Batasan

- Aplikasi ini **bukan pengganti Android Keyguard**. PIN/pola/password/biometrik tetap
  dikelola Android dan tidak pernah dilewati.
- Swipe-up memanggil `finishAffinity()`; aplikasi keluar dari layar alternatif tanpa
  memalsukan autentikasi sistem.
- Menampilkan aplikasi otomatis saat layar mati/nyala memerlukan integrasi Android
  tambahan di luar cakupan MVP (lihat PRD §6).
- **Estimasi waktu pengisian tidak ditampilkan** karena Android tidak menyediakan nilai
  tersebut secara andal untuk aplikasi biasa. Data yang tidak tersedia tidak dibuat-buat.
- Wi-Fi SSID tidak dibaca karena membutuhkan izin lokasi; status bar menampilkan jenis
  transport aktif.
- Generasi seluler (2G/3G/4G/5G) hanya tampil bila OS mengizinkan `READ_BASIC_PHONE_STATE`;
  jika tidak, label "Seluler" digunakan.
- Wallpaper disalin ke penyimpanan privat aplikasi, dirotasi sesuai EXIF, dan diperkecil
  maksimal 2560 px agar hemat memori.
- Baterai dan jaringan memakai event native (`BroadcastReceiver` /
  `ConnectivityManager`), bukan polling.
- Izin yang diminta hanya `INTERNET`, `ACCESS_NETWORK_STATE`, dan
  `READ_BASIC_PHONE_STATE` (normal). Picker galeri memakai system photo picker sehingga
  tidak meminta akses storage.
- Cuaca real-time belum diimplementasikan (future feature); chip hanya menampilkan tanggal.

---

## Lisensi Font

- Plus Jakarta Sans — SIL Open Font License (`licenses/OFL-PlusJakartaSans.txt`)
- Rubik — SIL Open Font License (`licenses/OFL-Rubik.txt`)
- Material Symbols — Apache License 2.0 (`licenses/LICENSE-MaterialSymbols.txt`)

Ikon Material Symbols telah di-subset menjadi dua file kecil (outlined & filled) pada
`android/app/src/main/assets/fonts/`.
