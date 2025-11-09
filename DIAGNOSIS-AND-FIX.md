# LabCart Build Issue - Root Cause & Solution

**Date:** November 7, 2025, 7:00 PM
**Status:** Development mode works, production build fails

---

## DISCOVERY

✅ **Development mode WORKS** - `npm run electron:dev` successfully loads JavaScript
❌ **Production build FAILS** - Packaged app exits immediately without loading JavaScript

This confirms:
- The source code is correct
- electron/main.js has no syntax errors
- The issue is specific to the packaging/ASAR configuration

---

## THE PROBLEM: electron-builder ASAR Integrity

electron-builder's ASAR integrity feature is **BROKEN** for this project. The hash it calculates during build doesn't match the actual ASAR file, causing Electron to refuse to load it.

**Evidence:**
```bash
# Expected hash (in Info.plist):
fd2e49158bcd7eb8f0d991d2f150a98ca0595af4b82dc7aa2688de12c9ac0904

# Actual hash (computed):
302e7ce0f47508fff8e7fa13c2dcd88232d1bc6cbbf052d4b31bc19933d0cad6

❌ MISMATCH - Electron refuses to load
```

Even after removing the integrity check from Info.plist and re-signing, the app still doesn't work, suggesting there may be additional issues with how Electron loads the ASAR in production.

---

## SOLUTIONS

### Solution 1: Disable ASAR Packaging (Recommended for Testing)

This is the fastest way to get a working build.

**Edit package.json:**
```json
{
  "build": {
    "asar": false,  // ← Change back to false
    // Remove these lines:
    // "asarUnpack": [...]
  }
}
```

**Rebuild:**
```bash
rm -rf dist/ .next/
npm run build
npm run build:mac
```

**Pros:**
- ✅ Should work immediately
- ✅ Easier to debug (can see all files)
- ✅ No integrity issues

**Cons:**
- ❌ Larger app size
- ❌ Slower loading (many file reads vs one)
- ❌ Less protection from tampering

---

### Solution 2: Fix electron-builder Config (Better Long-Term)

The integrity hash mismatch might be due to configuration issues.

**Try these changes to package.json:**

```json
{
  "build": {
    "asar": true,
    "electronVersion": "33.2.1",
    // Add this:
    "afterPack": "./scripts/after-pack.js",
    "asarUnpack": [
      "electron/node",
      "node_modules/**/*.node"
    ]
  }
}
```

**Create `scripts/after-pack.js`:**
```javascript
exports.default = async function(context) {
  const fs = require('fs');
  const path = require('path');
  const crypto = require('crypto');

  // Manually calculate and update ASAR hash
  const appPath = context.appOutDir + '/LabCart.app';
  const asarPath = path.join(appPath, 'Contents/Resources/app.asar');
  const plistPath = path.join(appPath, 'Contents/Info.plist');

  const asarData = fs.readFileSync(asarPath);
  const correctHash = crypto.createHash('sha256').update(asarData).digest('hex');

  console.log('Correct ASAR hash:', correctHash);

  // Update Info.plist with correct hash
  const { execSync } = require('child_process');
  execSync(`/usr/libexec/PlistBuddy -c "Set :ElectronAsarIntegrity:Resources/app.asar:hash ${correctHash}" "${plistPath}"`);

  console.log('✅ Updated ASAR integrity hash');
};
```

---

### Solution 3: Use Older Electron (If All Else Fails)

ASAR integrity was added in Electron 20+. Using an older version avoids the issue entirely.

**Edit package.json:**
```json
{
  "build": {
    "electronVersion": "19.1.9",  // ← Downgrade
    "asar": true
  },
  "devDependencies": {
    "electron": "^19.1.9"
  }
}
```

**Rebuild:**
```bash
rm -rf node_modules/ dist/ .next/
npm install
npm run build
npm run build:mac
```

**Not recommended** unless absolutely necessary (missing security features and updates).

---

## IMMEDIATE ACTION PLAN

### Step 1: Try Solution 1 (No ASAR) - 10 Minutes

```bash
cd /Users/macbook/play/lab/labcart

# Edit package.json - set asar: false
cat > temp_patch.js << 'EOF'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.build.asar = false;
delete pkg.build.asarUnpack;
delete pkg.build.disableSanityCheckAsar;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Set asar: false');
EOF

node temp_patch.js
rm temp_patch.js

# Clean and rebuild
rm -rf dist/ .next/ /Applications/LabCart.app
npm run build
npm run build:mac

# The ZIP should contain an unpacked app folder instead of app.asar
# Install and test
cd dist
unzip -q LabCart-*.zip
cp -R LabCart.app /Applications/
open -a LabCart

# Wait and check
sleep 5
cat /tmp/labcart-loading.txt
```

**If this works:** You have a working build. Ship it.

**If this doesn't work:** The issue is deeper than ASAR.

---

### Step 2: If Solution 1 Fails - Debug Further

Check Console.app for any system-level errors:

```bash
# Open Console.app and filter for "LabCart"
open /System/Applications/Utilities/Console.app

# Or command line:
log stream --predicate 'processImagePath CONTAINS "LabCart"' --level debug
```

Then launch the app and watch for errors.

---

## WHY Development Mode Works But Production Doesn't

**Development mode (`npm run electron:dev`):**
- Runs `electron .` directly from source folder
- No ASAR packaging
- No integrity checks
- Direct file access
- ✅ Works fine

**Production build (`npm run build:mac`):**
- Files packed into ASAR
- Integrity hash calculated (incorrectly)
- Electron checks hash on startup
- Hash mismatch detected
- ❌ Electron refuses to load JavaScript

---

## NEXT STEPS

1. **Try Solution 1** (`asar: false`) first
2. If that works, decide if you want to keep it or fix ASAR
3. If it doesn't work, we need to dig deeper into Electron's packaging

---

## FILES TO CHECK

- `/Applications/LabCart.app/Contents/Info.plist` - Contains integrity hash
- `/Applications/LabCart.app/Contents/Resources/app.asar` - The packaged app (if using ASAR)
- `/Applications/LabCart.app/Contents/Resources/app/` - The unpacked app (if `asar: false`)
- `/tmp/labcart-loading.txt` - Created by main.js line 47 if JS executes
- `/tmp/labcart-startup.log` - App logs

---

**Status:** Ready to try Solution 1
