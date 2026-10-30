# Building the Android APK

`mobile/` is a small native Android app: a full-screen WebView that opens your
deployed psst site. It has its own name and icon. Deploy the web app first (see
`DEPLOY_VERCEL.md`) so you have a URL to point it at.

## Option A — build in GitHub Actions (no computer setup)

The workflow `.github/workflows/android.yml` builds the APK on GitHub's runners
(the Android SDK is already installed there) and gives you a downloadable file.

1. Push this repo to GitHub.
2. (Optional) Set the web app URL once: repo **Settings → Secrets and variables
   → Actions → Variables → New variable**, name `APP_URL`, value
   `https://your-app.vercel.app`.
3. Go to the **Actions** tab → **Build Android APK** → **Run workflow**. If you
   didn't set `APP_URL`, type the URL in the `app_url` box.
4. When it finishes, open the run and download the **psst-apk** artifact. Inside
   is `psst.apk`.
5. Copy it to your phone and open it. Allow "install from unknown sources" when
   prompted. (This is an unsigned debug build — fine for your own use. See
   signing below for sharing.)

Tagging a release also works: `git tag v1.0 && git push --tags` builds the APK
and attaches `psst.apk` to the GitHub release.

## Option B — build locally

Needs the Android SDK (Android Studio, or the command-line tools) and a JDK 17.

```bash
cd AnonStory/mobile
./gradlew assembleDebug -PappUrl=https://your-app.vercel.app
# APK at app/build/outputs/apk/debug/app-debug.apk
```

Open that file on your phone to install.

## Changing the URL or name

- URL: the `-PappUrl=` value (or the `APP_URL` variable / `app_url` input). No
  code change needed.
- App name: `mobile/app/src/main/res/values/strings.xml` (`app_name`).
- Icon: `mobile/app/src/main/res/drawable/ic_launcher_foreground.xml` and the
  background color in `values/colors.xml`.

## Signing a release build (for sharing beyond yourself)

The CI build is a debug APK. To produce a signed release APK, create a keystore
and add a `signingConfig` to `mobile/app/build.gradle`, then run
`./gradlew assembleRelease`. Keep the keystore and its passwords out of the repo
(use GitHub Actions secrets if you sign in CI).

## What it does

- Loads the deployed site in a WebView with JavaScript and DOM storage on (so
  the per-browser `deviceId` persists).
- Keeps in-app navigation inside the WebView; hands `mailto:`, share and other
  non-web links to the system.
- Adds a small bridge so the "reply with a story" image saves to
  **Pictures/psst** in your gallery (blob downloads don't work in a WebView
  otherwise).
