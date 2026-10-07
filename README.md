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
| **PDF Split** | Split a PDF into multiple files by page ranges (e.g., `1-5`, `10-20`) or every N pages. One Split action counts as one operation. |
| **Extract Pages** | Extract specific pages from a PDF (e.g., `2,5,8,10`). |
| **Rotate PDF** | Rotate pages 90°, 180°, or 270° clockwise. |
| **Remove Metadata** | Remove document properties and XMP metadata from your PDF. |
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

**Interface behavior:**

- Only files with the PDF MIME type (`application/pdf`) are accepted — renaming a non-PDF file to `.pdf` does not bypass this check.
- Status, success, and error messages are written as plain text, never as HTML, so they cannot execute scripts. A tool's messages appear in that tool's status area; if a specifically requested status element is missing, the message falls back to the global status element when one exists, then to the general status area — degrading gracefully instead of failing.
- Action buttons can show a disabled state with a spinner while work runs. If an expected element (a button, a status area, the pricing section) is missing, the interface degrades safely — showing a fallback message or doing nothing — instead of crashing.

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
- **Future tools** — All upcoming Pro features included

### Pricing Plans

**Annual subscription. Billed yearly. Cancel anytime.**

| Plan | Price | Best For |
|------|-------|----------|
| **Personal** | $29.99/year | Individual users |
| **Corporate** | $99.99/year | Teams up to 10 users |

**All plans include:** All free tools + Watermark + Page Numbers + 1 year of updates + priority support

[See full licensing details →](LICENSING.md)

**Annual subscription** · Renew yearly to continue receiving Pro features and updates

### How to Activate

**Automatic License Generation (New!):**

1. Purchase a license via Stripe checkout.
2. After payment, you'll be redirected to a success page with your **automatically generated license key**.
3. Copy your license key from the success page.
4. Open CleanVault, scroll to the **Activate** section.
5. Paste your license key and click **Activate**.
6. The Pro badge appears in the header.

**Manual Activation (if needed):**

If you don't see your license key after purchase, check your email for the license key, then follow steps 3-6 above.

> **Note:** Pro activation is stored in your browser's localStorage. Clearing your browser data will deactivate your license — keep your license key safe. Licences are annual and must be renewed to maintain Pro access; an expired licence stops granting Pro features.

#### How the License System Works

CleanVault uses a **self-contained, SHA-256-signed license key system** that works entirely offline:

- **No backend required** — License validation happens 100% in your browser
- **No database lookup** — All license information is embedded in the license key itself
- **No API calls** — Works completely offline, including after the app has been cached
- **SHA-256 signed** — Each key carries a SHA-256 signature covering the version/plan, random ID and expiry. Altering any of those invalidates it.

**Honest security note:** CleanVault is deliberately a browser-only product with no server. A determined user controls their own browser, so client-side licensing can ultimately be bypassed; this is not presented as protection against such a user. What it does enforce is that a valid, signed, unexpired license is required — manually setting a browser flag grants nothing, and a lapsed license stops working on its own.

**Expiry is enforced.** A license past its expiry date no longer grants Pro access, so an annual licence genuinely needs renewing.

**Personal and Corporate** licences are both recorded and validated identically, and both currently unlock the same Pro feature set (Watermark, Page Numbers, Batch Processing). They differ in price and in the commercial terms that come with them, not in application capabilities.

Each license key contains:
- Plan type (Personal Pro or Corporate)
- Expiration date
- License version
- Unique random ID

The browser validates licenses by:
1. Decoding the license key structure
2. Verifying the signature
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
3. Choose a split mode:
   - **Page Ranges** — enter page ranges (one per line, or comma-separated on one line):
   ```
   1-5
   10-20
   25
   ```
   - **Every N Pages** — enter a positive whole number (e.g., `5` splits into consecutive 5-page files; the final file may be shorter).
4. Click **Split PDF**.
5. Multiple PDFs download automatically (`...-part-1.pdf`, `...-part-2.pdf`, ...).

Range rules (enforced before anything is produced):

- Each comma/line entry becomes its own output, in the order given.
- Duplicate, overlapping, and adjacent ranges are allowed — each occurrence is a separate output.
- Reversed ranges (`5-1`), out-of-range pages, empty comma entries (`1,,5`), and malformed ranges are rejected with an error.
- Whitespace around valid range syntax is accepted.

Every-N rules: N must be a positive whole number (`2.5`, `0`, negatives, and non-numeric input are rejected). `N=1` produces one file per page; N larger than the page count produces a single file with all pages. The final partial chunk is kept — no empty PDFs are produced.

Limits: one Split action counts as **one** operation no matter how many files it creates. Daily and page limits are checked both when the file is selected and again at execution time. If every download fails, nothing is counted and the file stays selected so the split can be retried.

Privacy note: Split loads a fresh copy of the source for each output, keeps only that output's pages, and sweeps unreachable objects so excluded pages' content is not carried along inside the delivered files. Processing stays local in the browser (no uploads, no PDF network calls). This is content hygiene for the delivered files, not a claim of forensic erasure of every possible byte.

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

### Remove Metadata

1. Click **Remove Metadata** on the homepage.
2. Upload a PDF file.
3. Click **Remove Metadata**.
4. `cleaned.pdf` downloads with metadata removed.

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

## 🛠️ Running Locally

For developers who want to run CleanVault locally:

```bash
# Clone the repository
git clone https://github.com/cleanvault/cleanvault.git
cd cleanvault

# Start a local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

---

## ❓ FAQ

### Is CleanVault really private?

**Yes.** All PDF processing happens in your browser using JavaScript. Your files are never uploaded to any server. You can verify this by opening your browser's network tab — you'll see zero file uploads.

### Do I need an internet connection?

Only for the initial page load. CleanVault has no external CDN dependency — the pdf-lib library is bundled with CleanVault and served from CleanVault itself.

After at least one successful visit, your browser keeps a local cached copy of the application, so you can reopen CleanVault and use all of the PDF tools with no internet connection. Your PDFs are still processed entirely on your device.

A few honest caveats:

- A first-time visitor during a complete outage cannot use CleanVault, because there is nothing cached on their device yet.
- Your browser can clear or evict that cached copy (storage pressure, private/incognito windows, or clearing browsing data).
- A cached copy may stay on an older version until your browser receives an update while online.
- Payment (Stripe) and the feedback form need a connection and will not work offline.

### What browsers are supported?

Chrome, Edge, Firefox, and Safari (latest versions).

### Is there a file size limit?

There's no hard limit, but very large PDFs (100+ MB) may be slow depending on your device's memory.

### Which files are accepted?

CleanVault accepts only files whose browser-reported type is the PDF MIME type (`application/pdf`). A renamed file (for example, an executable renamed to `.pdf`) is still rejected, because validation checks the file's type, not its name.

### How does Pro activation work?

Pro activation is stored in your browser's localStorage. When you enter a valid license key, the Pro features unlock. No account or login is required.

If activation fails — an invalid key, an expired license, or an unexpected error during validation — an error message is shown in the Activate section and nothing changes; your current state (Free or Pro) is left untouched. A valid key succeeds as described above.

### What happens if I clear my browser data?

Your Pro activation will be lost. Keep your license key safe so you can reactivate.

### Can I use my license on multiple devices?

Yes. Your license key works on any device. Just paste it into the activation box on each device.

### How do I get support?

For any issues or questions, please check the documentation or open an issue on GitHub.

---

## Contact

For inquiries, please visit our GitHub repository.

---

*CleanVault — Your files never leave your computer.*