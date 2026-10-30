#!/usr/bin/env python3
"""Summarise a decompiled APK directory (output of decompile.sh) as Markdown.

Usage: python3 -I extract.py <decompile_out_dir>

Reports: manifest permissions, deep links, exported components, hosts and
URLs, API paths, third-party SDKs, likely client-side keys, and React
Native screen names. Everything is pattern-based; verify by reading code.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict

ANDROID = "{http://schemas.android.com/apk/res/android}"
TEXT_EXT = {".smali", ".java", ".kt", ".js", ".xml", ".json", ".txt", ".hasm", ".properties"}
MAX_FILE = 64 * 1024 * 1024

URL_RE = re.compile(rb"https?://[A-Za-z0-9.\-]+(?::\d+)?(?:/[A-Za-z0-9._~%!$&'()*+,;=:@/\-{}]*)?")
PATH_RE = re.compile(rb"[\"'`](/(?:api|v\d|graphql|auth|user|users|inbox|questions?|messages?|submit|hints?|purchase|subscriptions?)[A-Za-z0-9_\-/{}:.]*)[\"'`]")
SCREEN_RE = re.compile(rb"\b([A-Z][A-Za-z0-9]{2,40}(?:Screen|Modal|Sheet|Page))\b")
KEY_PATTERNS = {
    "Google API key": re.compile(rb"AIza[0-9A-Za-z_\-]{35}"),
    "RevenueCat public key": re.compile(rb"\b(?:goog|appl)_[A-Za-z0-9]{20,}\b"),
    "Sentry DSN": re.compile(rb"https://[0-9a-f]{32}@[a-z0-9.\-]+/\d+"),
    "Stripe publishable key": re.compile(rb"pk_(?:live|test)_[0-9A-Za-z]{20,}"),
    "Branch key": re.compile(rb"key_(?:live|test)_[A-Za-z0-9]{20,}"),
    "OneSignal app id": re.compile(rb"onesignal[^\n]{0,40}([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", re.I),
}
SDKS = {
    "Firebase": [b"com/google/firebase", b"firebaseio.com", b"firebase"],
    "Google Play Billing": [b"com/android/billingclient"],
    "RevenueCat": [b"com/revenuecat", b"api.revenuecat.com"],
    "Amplitude": [b"com/amplitude", b"api2.amplitude.com"],
    "Mixpanel": [b"com/mixpanel", b"api.mixpanel.com"],
    "Segment": [b"com/segment", b"api.segment.io"],
    "AppsFlyer": [b"com/appsflyer"],
    "Adjust": [b"com/adjust/sdk"],
    "Branch": [b"io/branch", b"api2.branch.io"],
    "Sentry": [b"io/sentry", b"sentry.io"],
    "OneSignal": [b"com/onesignal"],
    "Facebook SDK": [b"com/facebook/FacebookSdk", b"graph.facebook.com"],
    "Instagram Stories share": [b"com.instagram.share.ADD_TO_STORY", b"instagram-stories://"],
    "Snapchat Creative Kit": [b"com/snap/creativekit", b"snapchat://"],
    "CodePush": [b"codepush", b"CodePush"],
    "Expo Updates": [b"expo-updates", b"expo/modules/updates"],
    "Hermes": [b"com/facebook/hermes"],
    "OkHttp": [b"okhttp3/"],
    "Google AdMob": [b"com/google/android/gms/ads"],
    "Perspective / moderation API": [b"commentanalyzer.googleapis.com", b"perspectiveapi"],
}
NOISE_HOSTS = ("schemas.android.com", "www.w3.org", "xmlpull.org", "apache.org", "ns.adobe.com", "json-schema.org", "example.com")


def iter_files(root):
    for dirpath, _, files in os.walk(root):
        if "/.bin" in dirpath:
            continue
        for f in files:
            p = os.path.join(dirpath, f)
            if os.path.splitext(f)[1] in TEXT_EXT or f.endswith(".bundle"):
                try:
                    if os.path.getsize(p) <= MAX_FILE:
                        yield p
                except OSError:
                    pass


def manifest_report(root):
    path = os.path.join(root, "apktool", "AndroidManifest.xml")
    out = []
    if not os.path.exists(path):
        return ["_no decoded manifest found_"]
    tree = ET.parse(path).getroot()
    out.append(f"- package: `{tree.get('package')}`")
    out.append(f"- version: `{tree.get(ANDROID + 'versionName') or tree.get('platformBuildVersionName')}`")
    perms = sorted({p.get(ANDROID + "name") for p in tree.iter("uses-permission")})
    out.append("\n**Permissions**\n")
    out += [f"- `{p}`" for p in perms]
    out.append("\n**Deep links**\n")
    for comp in tree.iter():
        if comp.tag not in ("activity", "activity-alias"):
            continue
        for f in comp.iter("intent-filter"):
            for d in f.iter("data"):
                scheme, host, prefix = d.get(ANDROID + "scheme"), d.get(ANDROID + "host"), d.get(ANDROID + "pathPrefix") or d.get(ANDROID + "path") or ""
                if scheme or host:
                    out.append(f"- `{scheme or '*'}://{host or '*'}{prefix}` → `{comp.get(ANDROID + 'name')}`")
    out.append("\n**Exported components**\n")
    for comp in tree.iter():
        if comp.tag in ("activity", "service", "receiver", "provider") and comp.get(ANDROID + "exported") == "true":
            out.append(f"- {comp.tag}: `{comp.get(ANDROID + 'name')}`")
    return out


def main(root):
    hosts = Counter()
    urls = defaultdict(set)
    paths = Counter()
    screens = Counter()
    keys = defaultdict(set)
    sdk_hits = defaultdict(set)

    for p in iter_files(root):
        try:
            with open(p, "rb") as fh:
                data = fh.read()
        except OSError:
            continue
        rel = os.path.relpath(p, root)
        for m in URL_RE.finditer(data):
            url = m.group(0).decode("utf-8", "replace").rstrip(".,;)'\"")
            host = url.split("/")[2].split(":")[0]
            if host.endswith(NOISE_HOSTS):
                continue
            hosts[host] += 1
            if len(urls[host]) < 25:
                urls[host].add(url)
        for m in PATH_RE.finditer(data):
            paths[m.group(1).decode("utf-8", "replace")] += 1
        if p.endswith((".js", ".hasm", ".txt", ".bundle")):
            for m in SCREEN_RE.finditer(data):
                screens[m.group(1).decode()] += 1
        for name, rx in KEY_PATTERNS.items():
            for m in rx.finditer(data):
                val = (m.group(1) if m.groups() else m.group(0)).decode("utf-8", "replace")
                keys[name].add(val)
        for sdk, needles in SDKS.items():
            if any(n in data for n in needles):
                sdk_hits[sdk].add(rel.split(os.sep)[0])

    print(f"# APK teardown report\n\nSource: `{root}`\n")
    print("## Manifest\n")
    print("\n".join(manifest_report(root)))
    print("\n## Third-party SDKs\n")
    for sdk in sorted(sdk_hits):
        print(f"- {sdk} (seen in: {', '.join(sorted(sdk_hits[sdk]))})")
    print("\n## Hosts (by frequency)\n")
    for host, n in hosts.most_common(60):
        print(f"### {host} ({n})")
        for u in sorted(urls[host]):
            print(f"- `{u}`")
    print("\n## API-looking paths\n")
    for path, n in paths.most_common(100):
        print(f"- `{path}` ({n})")
    print("\n## Client-side keys / ids (public by design, but note them)\n")
    for name, vals in keys.items():
        for v in sorted(vals):
            print(f"- {name}: `{v[:12]}…`")
    print("\n## React Native screens / modals\n")
    for s, n in screens.most_common(80):
        print(f"- `{s}` ({n})")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(os.path.abspath(sys.argv[1]))
