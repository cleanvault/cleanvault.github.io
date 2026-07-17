# CleanVault Licensing

## Overview

CleanVault is a privacy-first PDF tool that processes documents locally in your browser. The free version provides essential PDF tools, while CleanVault Pro unlocks advanced features for power users and businesses.

---

## Free Tier

The free version includes all core PDF tools with the following limits:

- **PDF Merge** — Combine multiple PDFs into one
- **PDF Split** — Split by page ranges or every N pages
- **Extract Pages** — Extract specific pages
- **Rotate PDF** — Rotate pages 90°, 180°, or 270°
- **Remove Metadata** — Remove metadata (title, author, keywords, etc.)
- **Reorder Pages** — Drag and drop to rearrange pages
- **Remove Pages** — Delete specific pages

**Free tier limits:**
- 10 operations per day
- Maximum 50 pages per PDF
- Single file processing (except Merge)

Free tools are available to everyone. No registration or account required.

---

## Personal Pro — $29.99/year

For individual users who need more control over their PDFs.

**Includes all Free features plus:**
- Add Watermark — Add text watermarks to all pages
- Add Page Numbers — Add page numbers to all pages
- Batch Processing — Process multiple PDFs at once
- All future Pro features as they're released

**License terms:**
- 1 user
- Personal and business use
- Unlimited devices (same user)
- 1 year of Pro features and updates
- Self-service activation via license key
- Annual subscription — billed yearly

---

## Corporate — $99.99/year

For teams and businesses that need multiple licenses.

**Includes all Personal Pro features plus:**
- Up to 10 licensed users
- Volume licensing
- Priority support
- 1 year of Pro features and updates

**License terms:**
- 10 users
- Commercial use allowed
- Team license management
- 1 year of Pro features and updates
- Annual subscription — billed yearly

---

## Enterprise — Contact Sales

For larger organizations with custom requirements.

**Includes all Corporate features plus:**
- Unlimited users
- Custom integrations
- Dedicated support
- Custom licensing terms
- On-premise deployment options

---

## How Licensing Works

CleanVault uses a **self-contained, hash-signed license key system** that works entirely offline:

### Automatic License Generation (New!)

1. **Purchase** — Buy a license via Stripe checkout
2. **Automatic generation** — After successful payment, your license key is **automatically generated** and displayed on the success page
3. **Copy license** — Copy your license key from the success page
4. **Activate** — Paste the key into CleanVault's activation box
5. **Unlock** — Pro features become available immediately

### Manual Activation (if needed)

If you don't see your license key after purchase:
1. Check your email for the license key
2. Open CleanVault and scroll to the **Activate** section
3. Paste the key and click **Activate**

**Important notes:**
- Activation is stored in your browser's localStorage
- Clearing browser data will deactivate your license
- Keep your license key safe for re-activation
- One license works on unlimited devices (same user)
- No account or login required
- **No backend required** — All validation happens in your browser
- **No database lookup** — License information is embedded in the key itself
- **Fully client-side** — License generation happens in your browser after payment

### License Key Format

Each license key is self-contained and hash-signed:

**Format:** `CV-PRO-{VERSION}{PLAN}-{RANDOM}-{YYYYMMDD}{SIG}`

**Example:** `CV-PRO-01PRO-A1B2C3D4-20271231ABCDEF1234567890`

**Components:**
- **VERSION** (2 chars): License version (currently "01")
- **PLAN** (3 chars): Plan type ("PRO" or "COR")
- **RANDOM** (8 hex chars): Unique identifier
- **YYYYMMDD** (8 chars): Expiration date
- **SIG** (16 hex chars): Hash-based signature (concatenated directly after expiry, no dash)

### How Validation Works

The browser validates licenses without any server communication:

1. **Decode** — Parse the license key structure
2. **Verify version** — Check license version compatibility
3. **Verify plan** — Validate plan type (PRO or COR)
4. **Check expiry** — Ensure license has not expired
5. **Verify signature** — Verify the key has not been casually modified

All validation happens 100% in your browser using JavaScript. No data is sent to any server.

---


## Payment

- All payments processed securely via Stripe
- Annual subscription — billed yearly
- Auto-renews annually unless cancelled
- No refunds — all sales final

### Pricing Tiers

| Plan | Price | Best For |
|------|-------|----------|
| **Personal** | $29.99/year | Individual users |
| **Corporate** | $99.99/year | Teams up to 10 users |

**All plans include:** 1 year of Pro features and updates, priority support

---

## Contact

For licensing inquiries, please visit our GitHub repository.


