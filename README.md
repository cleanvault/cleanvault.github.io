# CleanVault — Privacy-First PDF Tools That Run in Your Browser

**Your files never leave your computer.**

CleanVault is a privacy-first PDF tool website. Merge, split, extract, and rotate PDFs without uploading your files to any server. Everything happens locally in your browser.

🌐 **Live site:** `https://cleanvault.github.io`
💻 **Free to use** · 🔒 **Pro features available** · 📦 **No installation required**

---

## ✨ Features

### Free Tools

| Tool | What It Does |
|------|-------------|
| **PDF Merge** | Combine multiple PDFs into one document. Drag to reorder files. |
| **PDF Split** | Split a PDF into multiple files by page ranges (e.g., `1-5`, `10-20`). |
| **Extract Pages** | Extract specific pages from a PDF (e.g., `2,5,8,10`). |
| **Rotate PDF** | Rotate pages 90°, 180°, or 270° clockwise. |
| **Optimize PDF (Remove Metadata)** | Remove metadata and optimize PDF structure (no compression). |
| **Reorder Pages** | Drag and drop to rearrange pages in your PDF. |
| **Remove Pages** | Delete specific pages from any PDF. |

**Free tier limits:**
- 10 operations per day
- Maximum 50 pages per PDF
- Single file processing (except Merge)

### Pro Features

| Feature | What It Does |
|---------|-------------|
| **Add Watermark** | Add text watermarks (CONFIDENTIAL, DRAFT, etc.) with custom size, opacity, rotation, and position. |
| **Add Page Numbers** | Add page numbers to all pages (bottom-left, center, or right). |
| **Batch Processing** | Process multiple PDFs at once with the same operation (rotate, watermark, page numbers, remove pages, extract pages). |
| **Password Protection** | Add password to protect your PDF (browser limitation: no encryption). |

**Pro removes all limits:**
- Unlimited operations per day
- Unlimited pages per PDF

---

## 🚀 Quick Start

1. **Open the website** — No installation needed.
2. **Select a tool** — Click any tool card on the homepage.
3. **Upload your PDF** — Click the upload area or drag-and-drop a file.
4. **Configure options** — Enter page ranges, rotation angle, etc.
5. **Download** — Your processed PDF downloads automatically.

**That's it.** Your files never leave your computer.

---

## 🔒 Privacy

Unlike traditional PDF websites that upload your files to a server, CleanVault processes everything locally in your browser:

- ✅ **No uploads** — Files never leave your device
- ✅ **No storage** — Nothing is saved on any server
- ✅ **No tracking** — No analytics, cookies, or data collection
- ✅ **No accounts** — No sign-up or login required

> "Your files never leave your computer."

---

## 💎 CleanVault Pro

Unlock additional features with a CleanVault Pro license.

### Pro Features

- **Add Watermarks** — Text watermarks with custom size, opacity, rotation, and position
- **Add Page Numbers** — Page numbers at bottom-left, center, or right
- **Password Protection** — Output PDF with password metadata (see limitation note)
- **Future tools** — All upcoming Pro features included

### Pricing Plans

**Annual subscription. Billed yearly. Cancel anytime.**

| Plan | Price | Best For |
|------|-------|----------|
| **Founding Member (Personal)** | $19.99/year | First 100 customers (best value!) |
| **Personal** | $29.99/year | Individual users |
| **Founding Member (Corporate)** | $79.99/year | First 100 teams |
| **Corporate** | $99.99/year | Teams up to 10 users |

**All plans include:** All free tools + Watermark + Page Numbers + Password Protection + 1 year of updates + priority support

[See full licensing details →](LICENSING.md)

**Annual subscription** · Renew yearly to continue receiving Pro features and updates

### How to Activate

1. Purchase a license (Stripe checkout).
2. You'll receive a license key via email.
3. Open CleanVault, scroll to the **Activate** section.
4. Paste your license key and click **Activate**.
5. The Pro badge appears in the header.

> **Note:** Pro activation is stored in your browser's localStorage. Clearing your browser data will deactivate your license — keep your license key safe. License must be renewed annually to maintain Pro access.

#### How the License System Works

CleanVault uses a **self-contained, cryptographically signed license system** that works entirely offline:

- **No backend required** — License validation happens 100% in your browser
- **No database lookup** — All license information is embedded in the license key itself
- **No API calls** — Works completely offline after initial page load
- **Cryptographically signed** — Each license key contains a cryptographic signature that prevents tampering

Each license key securely contains:
- Plan type (Personal Pro or Corporate)
- Expiration date
- License version
- Unique random ID
- Optional customer email (used for signature verification)

The browser validates licenses by:
1. Decoding the license key structure
2. Verifying the cryptographic signature
3. Checking the expiration date
4. Validating the license version

**Privacy:** Your license key is never sent to any server. All validation happens locally in your browser.

---

## 📖 How to Use Each Tool

### PDF Merge

1. Click **Merge PDFs** on the homepage.
2. Click the upload area or drag-and-drop PDF files.
3. Select at least 2 PDF files.
4. Drag files to reorder them (optional).
5. Click **Merge PDFs**.
6. `merged.pdf` downloads automatically.

### PDF Split

1. Click **Split PDF** on the homepage.
2. Upload a PDF file.
3. Enter page ranges (one per line):
   ```
   1-5
   10-20
   25
   ```
4. Click **Split PDF**.
5. Multiple PDFs download automatically.

### Extract Pages

1. Click **Extract Pages** on the homepage.
2. Upload a PDF file.
3. Enter page numbers separated by commas:
   ```
   2,5,8,10
   ```
4. Click **Extract Pages**.
5. `extracted.pdf` downloads automatically.

### Rotate PDF

1. Click **Rotate PDF** on the homepage.
2. Upload a PDF file.
3. Select rotation angle: 90°, 180°, or 270°.
4. Click **Rotate PDF**.
5. `rotated.pdf` downloads automatically.

### Remove Pages

1. Click **Remove Pages** on the homepage.
2. Upload a PDF file.
3. Enter page numbers to remove:
   ```
   2,5,8
   ```
4. Click **Remove Pages**.
5. `pages-removed.pdf` downloads automatically.

### Reorder Pages

1. Click **Reorder Pages** on the homepage.
2. Upload a PDF file.
3. Drag and drop pages to reorder them.
4. Click **Reorder PDF**.
5. `reordered.pdf` downloads automatically.

### Optimize PDF (Remove Metadata)

1. Click **Optimize PDF (Remove Metadata)** on the homepage.
2. Upload a PDF file.
3. Click **Optimize PDF**.
4. `compressed.pdf` downloads with size comparison.

### Add Watermark (Pro)

1. Activate CleanVault Pro.
2. Click **Add Watermark** on the homepage.
3. Upload a PDF file.
4. Configure watermark text, size, opacity, rotation, and position.
5. Click **Add Watermark**.
6. `watermarked.pdf` downloads automatically.

### Add Page Numbers (Pro)

1. Activate CleanVault Pro.
2. Click **Add Page Numbers** on the homepage.
3. Upload a PDF file.
4. Select position (bottom-left, center, or right).
5. Click **Add Page Numbers**.
6. `numbered.pdf` downloads automatically.

### Batch Processing (Pro)

1. Activate CleanVault Pro.
2. Click **Batch Processing** on the homepage.
3. Select multiple PDF files.
4. Choose an operation: Rotate, Add Watermark, Add Page Numbers, Remove Pages, or Extract Pages.
5. Configure the operation options.
6. Click **Process All Files**.
7. All processed PDFs download automatically.

---

## ❓ FAQ

### Is CleanVault really private?

**Yes.** All PDF processing happens in your browser using JavaScript. Your files are never uploaded to any server. You can verify this by opening your browser's network tab — you'll see zero file uploads.

### Do I need an internet connection?

Only for the initial page load (to download the PDF library). After that, the tool works offline.

### What browsers are supported?

Chrome, Edge, Firefox, and Safari (latest versions).

### Is there a file size limit?

There's no hard limit, but very large PDFs (100+ MB) may be slow depending on your device's memory.

### How does Pro activation work?

Pro activation is stored in your browser's localStorage. When you enter a valid license key, the Pro features unlock. No account or login is required.

### What happens if I clear my browser data?

Your Pro activation will be lost. Keep your license key safe so you can reactivate.

### Can I use my license on multiple devices?

Yes. Your license key works on any device. Just paste it into the activation box on each device.

### How do I get support?

Email: 

---

## 🛠️ Running Locally

```bash
# Clone the repository
git clone https://github.com/cleanvault/cleanvault.git
cd cleanvault

# Start a local server
python3 -m http.server 8000

# Open in browser
open https://cleanvault.github.io
```

---

## 🚢 Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select the `main` branch.
4. Click **Save**.
5. Your site is live at `https://cleanvault.github.io`.

> Create a `.nojekyll` file in the root directory to prevent Jekyll processing.

---

## 🧪 Running Tests

```bash
# Install test dependencies
npm install

# Generate test fixtures
node tests/generate-fixtures.js

# Run all tests
npm test
```

---

## 📁 Project Structure

```
cleanvault/
├── index.html              # Main single-page application
├── style.css               # All styles
├── js/
│   ├── pdf-tools.js        # Core PDF manipulation functions
│   ├── license.js          # Pro license management system
│   ├── ui.js               # Shared UI, tool switching, drag-and-drop
│   ├── merge.js            # Merge PDF tool
│   ├── split.js            # Split PDF tool
│   ├── extract.js          # Extract pages tool
│   ├── rotate.js           # Rotate PDF tool
│   ├── optimize.js         # Optimize/compress PDF tool
│   ├── reorder.js          # Reorder pages tool
│   ├── watermark.js        # Watermark tool (Pro)
│   ├── page-numbers.js     # Page numbers tool (Pro)
│   ├── batch.js            # Batch processing tool (Pro)
│   └── remove.js           # Remove pages + password protect (Pro)
├── tests/                  # Automated test suite
│   ├── pdf-tools.test.js   # 30 tests for all PDF tools
│   ├── license.test.js     # 16 tests for license generation
│   ├── license-security.test.js # 32 tests for license security
│   ├── generate-fixtures.js
│   └── fixtures/           # Test PDF files
├── tools/                  # License generator (Node.js CLI)
│   ├── generate-license.js # CLI tool for generating license keys
│   ├── licenses.json       # Stored generated licenses
│   └── email-template.txt  # Email template for customers
├── assets/
│   └── logo.svg            # SVG logo
├── package.json
├── package-lock.json
├── .nojekyll               # Prevents Jekyll processing on GitHub Pages
└── .gitignore
```

---

## 📄 License

MIT License — free for personal and commercial use.

---

## 📬 Contact

- **Support:** 
- **Website:** https://cleanvault.com

---

*CleanVault — Your files never leave your computer.*