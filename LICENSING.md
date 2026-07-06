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

CleanVault uses a **self-contained, cryptographically signed license key system** that works entirely offline:

1. **Purchase** — Buy a license via Stripe checkout
2. **Receive key** — License key sent to your email
3. **Activate** — Paste the key into CleanVault's activation box
4. **Unlock** — Pro features become available immediately

**Important notes:**
- Activation is stored in your browser's localStorage
- Clearing browser data will deactivate your license
- Keep your license key safe for re-activation
- One license works on unlimited devices (same user)
- No account or login required
- **No backend required** — All validation happens in your browser
- **No database lookup** — License information is embedded in the key itself

### License Key Format

Each license key is self-contained and cryptographically signed:

**Format:** `CV-PRO-{VERSION}{PLAN}-{RANDOM}-{YYYYMMDD}{SIG}`

**Example:** `CV-PRO-01PRO-A1B2C3D4-20271231ABCDEF1234567890`

**Components:**
- **VERSION** (2 chars): License version (currently "01")
- **PLAN** (3 chars): Plan type ("PRO" or "COR")
- **RANDOM** (8 hex chars): Unique identifier
- **YYYYMMDD** (8 chars): Expiration date
- **SIG** (16 hex chars): Cryptographic signature (concatenated directly after expiry, no dash)

### How Validation Works

The browser validates licenses without any server communication:

1. **Decode** — Parse the license key structure
2. **Verify version** — Check license version compatibility
3. **Verify plan** — Validate plan type (PRO or COR)
4. **Check expiry** — Ensure license has not expired
5. **Verify signature** — Cryptographically verify the key has not been tampered with

All validation happens 100% in your browser using JavaScript. No data is sent to any server.

---

## Limitations

Client-side licensing has inherent limitations:
- **No remote revocation** — Licenses cannot be remotely deactivated
- **No device tracking** — Cannot limit concurrent device usage
- **Client-side bypass** — Determined users can bypass via DevTools
- **Secret key embedded** — The signing key is embedded in client-side JavaScript

For organizations needing stronger licensing controls, the Enterprise plan offers custom solutions including backend validation.

### Security Model

This license system provides **deterrence against casual piracy**:

- Cryptographically signed licenses prevent tampering
- Expiration dates are embedded in the license key
- Plan types are encoded in the license key
- Signature verification ensures authenticity

**Note:** The secret key used for signing is embedded in the browser code. While this deters casual users from creating fake licenses, determined users with technical knowledge can extract the key and create fraudulent licenses. This is an inherent limitation of client-side-only licensing without a backend validation service.

---

## Payment

- All payments processed securely via Stripe
- Annual subscription — billed yearly
- Auto-renews annually unless cancelled
- No refunds — all sales final

### Pricing Tiers

| Plan | Price | Best For |
|------|-------|----------|
| | **Personal** | $29.99/year | Individual users |
| | **Corporate** | $99.99/year | Teams up to 10 users |

**All plans include:** 1 year of Pro features and updates, priority support

---

## Contact

For licensing inquiries, please visit our GitHub repository.

---

### Pro Features

| Feature | What It Does |
|---------|-------------|
| **Add Watermark** | Add text watermarks (CONFIDENTIAL, DRAFT, etc.) with custom size, opacity, rotation, and position. |
| **Add Page Numbers** | Add page numbers to all pages (bottom-left, center, or right). |
| **Batch Processing** | Process multiple PDFs at once with the same operation (rotate, watermark, page numbers, remove pages, extract pages). |

### Free Tier Limits

| Limit | Free Tier | Pro Tier |
|-------|-----------|----------|
| Operations per day | 10 | Unlimited |
| Pages per PDF | 50 | Unlimited |
| Multi-file processing | Merge only | All tools |
| Batch Processing | Not available | Available |

---

## License Generation

Licenses are generated using the included Node.js CLI tool (internal use only).
The generator creates a cryptographically signed license key that can be validated entirely in the browser. No database or backend service is required.


*CleanVault — Your files never leave your computer.*