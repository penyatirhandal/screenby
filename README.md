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
| Home bergaya Steam | Tab `DESKTOP` (widget) dan `GAMES` (hero ikon persegi 1:1 + satu baris ikon horizontal), metadata manual, action bar Apps / Settings / Search / Play |
| Landscape + reverse landscape | `android:screenOrientation="sensorLandscape"` |
| Launcher default (HOME) | Dipilih lewat dialog Home Android |
| Lock screen Nexus | Muncul setelah layar mati lalu menyala; geser ke atas masuk ke tab `DESKTOP`. Keyguard Android tetap berlaku |
| Apps | Semua aplikasi + pencarian; tap untuk membuka |
| Pin game | Tekan tahan aplikasi di Apps → **Pin ke Games**; game muncul di tab `GAMES` |
| Widget Desktop | Jam, tanggal, baterai, dan jaringan dapat dipilih satu per satu di Settings |
| Edit game | Tekan tahan game di Home → **Edit**: nama, ikon dari galeri, tahun rilis, genre, developer, publisher; **Save** / **Delete** |
| Dismiss / Hapus | `Dismiss` melepas pin; `Hapus` di Apps membuka dialog uninstall Android |
| Dynamic Color | Aksen diambil dari `WallpaperColors` Android 12+; fallback ke palet bawaan |
| Font & ukuran font | Hack, Inter, Arial (Liberation Sans); preset Kecil–Sangat Besar, berlaku untuk seluruh teks launcher |
| Gamepad | D-pad/stick kiri untuk fokus, A untuk memilih, B untuk kembali, L1/R1 ganti tab, Start/Select membuka Settings/Apps |
| Wallpaper | Galeri + Smart Crop; dipakai sebagai latar Home/Lock screen dan bisa diterapkan ke wallpaper sistem agar Dynamic Color berubah |
| Status OS asli | Jam, tanggal, baterai, jaringan Wi-Fi/seluler/ethernet/VPN |

---

## Cara pakai

1. Pasang APK, tekan **Home**, pilih **Nexus Launcher** → **Always**.
2. Di Home, tab **DESKTOP** berisi widget; tab **GAMES** berisi game yang di-pin.
3. Tekan **Apps**, lalu tekan tahan aplikasi → **Pin ke Games**.
4. Di tab GAMES tekan tahan game → **Play**, **Edit**, atau **Dismiss**.
5. Setelah layar mati lalu menyala, geser ke atas pada lock screen untuk masuk ke **DESKTOP**.
6. **Settings** → pilih widget, font, ukuran font, wallpaper, lalu “Pakai sebagai wallpaper sistem”.

Metadata game (tahun rilis, genre, developer, publisher) diisi manual lewat **Edit** karena
Android tidak menyediakan data tersebut.

### Kontrol gamepad

| Input | Aksi |
|---|---|
| D-pad / stick kiri | Pindah fokus (tab, game, widget, tombol aksi) |
| A / DPAD_CENTER / Enter | Aktifkan item yang sedang difokuskan |
| B / Y | Kembali, menutup sheet/menu |
| L1 / R1 | Ganti tab `DESKTOP` / `GAMES` (kembali ke Home dari halaman lain) |
| Start | Buka Settings |
| Select | Buka Apps |
| Stick analog | Diterjemahkan ke arah D-pad dengan dead zone |

Focus ring ditampilkan saat item dipilih gamepad; touch tetap berfungsi seperti biasa.
Pada layar kunci, A dapat menggantikan swipe-up (geser tetap didukung).

Untuk gamepad fisik, hubungkan via Bluetooth atau jalankan `scrcpy --gamepad=uhid`
dengan gamepad tersambung ke komputer. Tanpa gamepad, event Android yang sama bisa
dikirim lewat `adb shell input keyevent`.

---

## Struktur Proyek

```text
.
├── App.tsx
├── src/
│   ├── components/      # ActionMenu, GameEditSheet, Icon, WallpaperSheet, ...
│   ├── gamepad/         # Event mapping, spatial focus provider, Focusable
│   ├── hooks/           # useGameLibrary, useLauncherSettings, useLauncherTheme, ...
│   ├── screens/         # HomeScreen, AppsScreen, SettingsScreen, LauncherRoot
│   ├── services/        # NexusNative, GameLibraryService, LauncherSettingsService, ...
│   ├── theme/           # colors, dynamicColor, typography, providers
│   ├── utils/smartCrop.ts
│   └── types.ts
├── android/app/src/main/
│   ├── java/com/nexuslock/NexusNativeModule.kt, NexusGamepadModule.kt
│   ├── assets/fonts/    # Hack, Inter, Liberation Sans, Material Symbols, ...
│   └── AndroidManifest.xml
├── scripts/test-gamepad.sh
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

### Menguji gamepad dengan scrcpy

```bash
chmod +x scripts/test-gamepad.sh
scripts/test-gamepad.sh android/app/build/outputs/apk/release/app-release.apk
# atau: npm run test:gamepad -- android/app/build/outputs/apk/release/app-release.apk
```

Gunakan APK **release** karena APK debug memuat JS dari Metro (`localhost:8081`).
Jika ingin menguji APK debug, jalankan `npm start` dan `adb reverse tcp:8081 tcp:8081`
terlebih dahulu.

Skrip ini menyalakan scrcpy (gamepad pass-through lewat `--gamepad=uhid`),
mengirim rangkaian `KEYCODE_DPAD_*`, `BUTTON_A/B`, `L1/R1`, `START`, `SELECT`,
mematikan/menyalakan layar untuk menguji layar kunci, lalu menyimpan screenshot
ke `/tmp/opencode/gamepad-test`. Set `GAMEPAD_MODE=disabled` bila tidak ada
gamepad fisik di komputer; event masih diinjeksi via `adb keyevent` dan hasilnya
tetap terlihat di jendela scrcpy.

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
