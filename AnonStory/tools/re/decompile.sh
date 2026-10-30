#!/usr/bin/env bash
# Static teardown of an Android APK (built for React Native apps such as
# com.nglreactnative). Run it on an APK you obtained yourself:
#
#   ./decompile.sh path/to/app.apk [out_dir]
#
# Steps: unpack the APK (or the base.apk inside an .xapk/.apks bundle),
# decode the manifest/resources with apktool, decompile Java/Kotlin with
# jadx, locate the JS bundle, disassemble it if it is Hermes bytecode,
# then run extract.py to list endpoints, hosts, SDKs, keys and screens.
#
# Needs: java, unzip, python3. apktool/jadx are downloaded into tools/re/.bin
# on first run; hermes-dec is installed with pip if the bundle is Hermes.
set -euo pipefail

APK="${1:?usage: decompile.sh app.apk [out_dir]}"
OUT="${2:-./re-out}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BIN="$HERE/.bin"
APKTOOL_VER=2.10.0
JADX_VER=1.5.1

mkdir -p "$BIN" "$OUT"
APK="$(realpath "$APK")"
OUT="$(realpath "$OUT")"

fetch_tools() {
  if [ ! -f "$BIN/apktool.jar" ]; then
    echo "[*] downloading apktool $APKTOOL_VER"
    curl -fsSL -o "$BIN/apktool.jar" \
      "https://github.com/iBotPeaches/Apktool/releases/download/v$APKTOOL_VER/apktool_$APKTOOL_VER.jar"
  fi
  if [ ! -x "$BIN/jadx/bin/jadx" ]; then
    echo "[*] downloading jadx $JADX_VER"
    curl -fsSL -o "$BIN/jadx.zip" "https://github.com/skylot/jadx/releases/download/v$JADX_VER/jadx-$JADX_VER.zip"
    unzip -q -o "$BIN/jadx.zip" -d "$BIN/jadx" && rm "$BIN/jadx.zip"
  fi
}

# .xapk / .apks bundles: pull out the base APK.
if unzip -l "$APK" 2>/dev/null | grep -qE '(^|\s)(base|com\.[^ ]+)\.apk$'; then
  echo "[*] split bundle detected, extracting base apk"
  mkdir -p "$OUT/bundle"
  unzip -q -o "$APK" -d "$OUT/bundle"
  BASE="$(ls "$OUT"/bundle/base.apk 2>/dev/null || ls -S "$OUT"/bundle/*.apk | head -1)"
  APK="$BASE"
fi

fetch_tools

echo "[*] apktool: manifest + resources -> $OUT/apktool"
java -jar "$BIN/apktool.jar" d -f -o "$OUT/apktool" "$APK" >/dev/null

echo "[*] jadx: java sources -> $OUT/jadx"
"$BIN/jadx/bin/jadx" -q --no-res -d "$OUT/jadx" "$APK" || echo "[!] jadx finished with errors (normal for obfuscated apps)"

echo "[*] raw unzip -> $OUT/raw"
unzip -q -o "$APK" -d "$OUT/raw"

BUNDLE="$OUT/raw/assets/index.android.bundle"
if [ -f "$BUNDLE" ]; then
  if head -c 8 "$BUNDLE" | od -An -tx1 | tr -d ' \n' | grep -q '^c61fbc03c103191f'; then
    echo "[*] Hermes bytecode bundle; disassembling with hermes-dec"
    python3 -m pip install --quiet --user hermes-dec >/dev/null 2>&1 || true
    if command -v hbc-decompiler >/dev/null; then
      hbc-decompiler "$BUNDLE" "$OUT/bundle.decompiled.js" || true
    fi
    if command -v hbc-disassembler >/dev/null; then
      hbc-disassembler "$BUNDLE" "$OUT/bundle.hasm" || true
    fi
    strings -n 6 "$BUNDLE" > "$OUT/bundle.strings.txt"
  else
    echo "[*] plain JS bundle"
    cp "$BUNDLE" "$OUT/bundle.js"
  fi
else
  echo "[!] no index.android.bundle; not a React Native app or bundle is downloaded at runtime (check for CodePush/Expo updates)"
fi

echo "[*] extracting endpoints/keys/SDKs -> $OUT/report.md"
python3 -I "$HERE/extract.py" "$OUT" > "$OUT/report.md"
echo "[+] done. start with $OUT/report.md and $OUT/apktool/AndroidManifest.xml"
