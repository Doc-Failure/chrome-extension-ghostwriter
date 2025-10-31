# Ghost Writer Assistant - Installation

## Install

1. Open Chrome → `chrome://extensions/`
2. Enable **"Developer mode"** (top-right)
3. Drag `chrome-extension-ghostwriter.crx` onto the page
4. Click **"Add extension"**

## Enable AI Flags

Go to each URL and set to **Enabled**:

1. `chrome://flags/#optimization-guide-on-device-model`
2. `chrome://flags/#prompt-api-for-gemini-nano`
3. `chrome://flags/#language-detection-api`

Click **"Relaunch"** to restart Chrome.

## Test

Click the ghost icon (👻) → Try "Check Grammar on Page"

## Troubleshooting

**"API not available"** → Enable all 3 flags above, restart Chrome, wait 10 minutes

**Extension not showing** → Go to `chrome://extensions/` and toggle it ON

**Can't install CRX** → Rename `.crx` to `.zip`, extract, use "Load unpacked"

---

**Requirements:** Chrome 128+ | AI models download automatically after restart

**Files:** Share `.crx` and this guide | Keep `.pem` private