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
| **Remove Metadata** | Remove metadata (title, author, keywords, etc.) from your PDF. |
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
| | **Personal** | $29.99/year | Individual users |
| | **Corporate** | $99.99/year | Teams up to 10 users |

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

### Remove Metadata

1. Click **Remove Metadata** on the homepage.
2. Upload a PDF file.
3. Click **Remove Metadata**.
4. `metadata-removed.pdf` downloads with metadata removed.

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

For any issues or questions, please check the documentation or open an issue on GitHub.

---

## 🛠️ Running Locally

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

## 🚢 Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select the `main` branch.
4. Click **Save**.
5. Your site is live at `https://cleanvault.github.io`.

> Create a `.nojekyll` file in the root directory to prevent Jekyll processing.

---

## 📁 Project Structure

```
cleanvault/
├── index.html              # Main single-page application
├── style.css               # All styles
├── js/
│   ├── pdf-tools.js        # Core PDF manipulation functions
│   ├── license.js          # Pro license management system
│   ├── limits.js           # Usage limits for Free vs Pro tiers
│   ├── ui.js               # Shared UI, tool switching, drag-and-drop
│   ├── merge.js            # Merge PDF tool
│   ├── split.js            # Split PDF tool
│   ├── extract.js          # Extract pages tool
│   ├── rotate.js           # Rotate PDF tool
│   ├── remove-metadata.js  # Remove metadata tool
│   ├── reorder.js          # Reorder pages tool
│   ├── watermark.js        # Watermark tool (Pro)
│   ├── page-numbers.js     # Page numbers tool (Pro)
│   ├── remove.js           # Remove pages tool
│   └── batch.js            # Batch processing tool (Pro)
├── tools/                  # License generator (Node.js CLI)
│   └── generate-license.js # CLI tool for generating license keys
├── assets/
│   └── logo.svg            # SVG logo
├── .nojekyll               # Prevents Jekyll processing on GitHub Pages
├── .gitignore
└── README.md
```

---

## 📄 License

MIT License — free for personal and commercial use.

---

## 📬 Contact

For inquiries, please visit our GitHub repository.

---

## 🔍 SEO & Search Engine Optimization

CleanVault is optimized for search engines to help users find privacy-first PDF tools:

### Target Keywords
- Privacy-first PDF tools
- Private PDF tools
- Browser-based PDF tools
- PDF tools without uploading files
- Local PDF processing
- Secure PDF tools
- Free PDF tools
- Online PDF tools
- Merge PDF
- Split PDF
- Extract PDF pages
- Remove PDF metadata
- Reorder PDF pages
- Rotate PDF

### SEO Features Implemented

**Meta Tags & Open Graph:**
- Optimized title tags with primary keywords
- Compelling meta descriptions for all pages
- Open Graph tags for social media sharing (Facebook, LinkedIn)
- Twitter Card meta tags
- Canonical URLs to prevent duplicate content

**Structured Data:**
- Schema.org WebApplication markup
- Pricing information in structured format
- Feature lists for search engines
- Software version and license information

**Technical SEO:**
- robots.txt with sitemap reference
- XML sitemap for search engine crawling
- Semantic HTML5 elements (header, main, section, article, footer)
- Proper heading hierarchy (H1 → H2 → H3)
- ARIA labels and roles for accessibility
- Skip navigation links for screen readers
- Image alt attributes and SVG accessibility

**Performance & Mobile:**
- Mobile-responsive design
- Fast loading (no heavy frameworks)
- Optimized CSS with minimal render-blocking
- Print-friendly styles

**Accessibility (SEO Benefit):**
- WCAG 2.1 compliant
- Keyboard navigation support
- Screen reader friendly
- High contrast mode support
- Reduced motion support

### Search Engine Visibility

The site is optimized for indexing by:
- Google Search
- Bing
- DuckDuckGo
- Other major search engines

All PDF processing happens client-side, making CleanVault unique in the PDF tool market.

---

*CleanVault — Your files never leave your computer.*
