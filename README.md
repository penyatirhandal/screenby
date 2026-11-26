# Nexus Launcher

Launcher Android alternatif bergaya **Steam Big Picture** dengan orientasi **landscape**,
Dynamic Color dari wallpaper sistem, game yang di-pin di Home, dan halaman **Apps** berisi
semua aplikasi yang terpasang.

Dibangun dengan **React Native 0.88 + TypeScript** untuk UI dan **Kotlin** untuk integrasi
sistem Android. APK dibangun otomatis melalui **GitHub Actions** — tanpa Android Studio.

> Aplikasi ini **bukan pengganti Android Keyguard**. PIN/pola/biometrik tetap dikelola
> Android dan tidak pernah dilewati.

---

## Fitur

| Fitur | Catatan |
|---|---|
| Home bergaya Steam | Tab `NOW` / `FAVS` / `ANDROID`, kartu game besar, metadata manual, action bar Apps / Settings / Search / Play |
| Landscape + reverse landscape | `android:screenOrientation="sensorLandscape"` |
| Launcher default (HOME) | Dipilih lewat dialog Home Android |
| Apps | Semua aplikasi + pencarian; tap untuk membuka |
| Pin game | Tekan tahan aplikasi di Apps → **Pin game**; game muncul di Home |
| Edit game | Tekan tahan game di Home → **Edit**: nama, ikon dari galeri, tahun rilis, genre, developer, publisher; **Save** / **Delete** |
| Dismiss / Hapus | `Dismiss` melepas pin; `Hapus` di Apps membuka dialog uninstall Android |
| Dynamic Color | Aksen diambil dari `WallpaperColors` Android 12+; fallback ke palet bawaan |
| Font & ukuran font | Hack, Inter, Arial (Liberation Sans); preset Kecil–Sangat Besar, berlaku untuk seluruh teks launcher |
| Wallpaper | Galeri + Smart Crop; bisa diterapkan sebagai wallpaper sistem agar warna berubah |
| Status OS asli | Jam, tanggal, baterai, jaringan Wi-Fi/seluler/ethernet/VPN |

---

## Cara pakai

1. Pasang APK, tekan **Home**, pilih **Nexus Launcher** → **Always**.
2. Di Home tekan **Apps**.
3. Tekan tahan aplikasi → **Pin game** agar muncul di Home.
4. Di Home tekan tahan game → **Play**, **Edit**, atau **Dismiss**.
5. **Settings** → pilih font, ukuran font, wallpaper, lalu “Pakai sebagai wallpaper sistem”.

Metadata game (tahun rilis, genre, developer, publisher) diisi manual lewat **Edit** karena
Android tidak menyediakan data tersebut.

---

## Struktur Proyek

```text
.
├── App.tsx
├── src/
│   ├── components/      # ActionMenu, GameEditSheet, Icon, WallpaperSheet, ...
│   ├── hooks/           # useGameLibrary, useLauncherSettings, useLauncherTheme, ...
│   ├── screens/         # HomeScreen, AppsScreen, SettingsScreen, LauncherRoot
│   ├── services/        # NexusNative, GameLibraryService, LauncherSettingsService, ...
│   ├── theme/           # colors, dynamicColor, typography, providers
│   ├── utils/smartCrop.ts
│   └── types.ts
├── android/app/src/main/
│   ├── java/com/nexuslock/NexusNativeModule.kt
│   ├── assets/fonts/    # Hack, Inter, Liberation Sans, Material Symbols, ...
│   └── AndroidManifest.xml
├── __tests__/
└── .github/workflows/android-build.yml
```

---

## Build & verifikasi

Prasyarat: Node.js **≥ 22.11**, JDK **17**, Android SDK platform 36 + build-tools 36.0.0.

```bash
npm install
npm run typecheck
npm run lint
npm test -- --runInBand
npm run build:debug      # android/app/build/outputs/apk/debug/app-debug.apk
npm run build:release    # android/app/build/outputs/apk/release/app-release.apk
```

Build release lokal memakai debug keystore sebagai fallback; jangan dipakai untuk
distribusi produksi.

### GitHub Actions & Release

Setiap push/PR menjalankan workflow `.github/workflows/android-build.yml` dan menghasilkan
artifact **nexus-lock-screen-debug**. Setiap push ke `main`/`master` juga memperbarui
[GitHub Release `latest-debug`](https://github.com/penyatirhandal/screenby/releases/tag/latest-debug):

```text
https://github.com/penyatirhandal/screenby/releases/download/latest-debug/NexusLockScreen-debug.apk
```

Untuk release bertanda tangan, tambahkan secrets `NEXUS_KEYSTORE_BASE64`,
`NEXUS_KEYSTORE_PASSWORD`, `NEXUS_KEY_ALIAS`, dan `NEXUS_KEY_PASSWORD`.

---

## Catatan teknis

- Widget/status memakai data OS asli (`BatteryManager`, `ConnectivityManager`,
  `TelephonyManager`, `WallpaperColors`). Estimasi waktu isi daya tidak ditampilkan.
- Wi-Fi SSID tidak dibaca karena memerlukan izin lokasi.
- Generasi seluler hanya tampil bila OS mengizinkan `READ_BASIC_PHONE_STATE`.
- Izin: `INTERNET`, `ACCESS_NETWORK_STATE`, `READ_BASIC_PHONE_STATE`, `SET_WALLPAPER`.
  Picker galeri memakai system photo picker tanpa izin storage.
- Uninstall memanggil `ACTION_DELETE`Android; konfirmasi ada pada dialog sistem.
- Dynamic Color aktif di Android 12+; perangkat lama memakai palet bawaan.

## Lisensi Font

- Hack — MIT (`licenses/LICENSE-Hack.txt`)
- Inter — SIL OFL (`licenses/OFL-Inter.txt`)
- Liberation Sans — SIL OFL (`licenses/OFL-Liberation.txt`)
- Plus Jakarta Sans, Rubik — SIL OFL (`licenses/OFL-PlusJakartaSans.txt`, `licenses/OFL-Rubik.txt`)
- Material Symbols — Apache 2.0 (`licenses/LICENSE-MaterialSymbols.txt`), di-subset ke ikon yang dipakai
