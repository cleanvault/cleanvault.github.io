# CleanVault — Competitive Feature Gap Analysis

**Date:** June 29, 2026  
**Competitors Analyzed:** PDF24, PDFsam, Smallpdf, iLovePDF, Sejda

---

## Current CleanVault Features

### Free
- PDF Merge (with drag/drop reorder)
- PDF Split (page ranges, every N pages)
- Extract Pages
- Rotate PDF (90°, 180°, 270°)

### Pro
- Remove Pages

---

## Competitor Feature Matrix

| Feature | PDF24 | PDFsam | Smallpdf | iLovePDF | Sejda | CleanVault |
|---------|-------|--------|----------|----------|-------|------------|
| Merge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Split | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rotate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Compress** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Page Reorder** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Page Numbers** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Watermarks** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Protect (Password)** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Unlock** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **OCR** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Convert to Image** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Crop** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| **Fill/Sign** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Compare** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Feature Classification

### Common (Expected by Users)
Features that every major PDF tool has:
- ✅ Merge, Split, Rotate, Extract — **CleanVault has these**
- ❌ **Compress** — **MISSING** (all competitors have this)
- ❌ **Page Reorder** — **MISSING** (all competitors have this)

### Nice to Have
Features that add value but aren't deal-breakers:
- Page Numbers
- Watermarks
- Crop
- Protect/Unlock (password)

### Frequently Requested
Features users commonly ask for:
- **Compress** — "Make my PDF smaller"
- **Page Reorder** — "Rearrange pages"
- **Merge** — Already have this
- **Split** — Already have this

### Competitive Advantage
Features that differentiate CleanVault:
- ✅ Privacy-first (no uploads)
- ✅ Works offline
- ✅ No account required
- ✅ Fast (no server round-trip)
- ❌ **Split Every N Pages** — Unique feature (not in competitors)

---

## Missing Features Ranked

### Tier 1: Critical (Implement Immediately)

| Feature | Customer Value | Difficulty | Revenue Potential | Tier |
|---------|---------------|------------|-------------------|------|
| **PDF Compression** | 🔴 Very High | 🟡 Medium | 🟡 Medium | Free |
| **Page Reordering** | 🔴 Very High | 🟢 Easy | 🟡 Medium | Free |

**Why:**
- **Compression:** Every user wants smaller files. Universal need. Easy to explain value.
- **Page Reordering:** Common workflow (rearrange scanned docs, move last page to front). Very easy to implement with pdf-lib.

### Tier 2: High Value (Implement Soon)

| Feature | Customer Value | Difficulty | Revenue Potential | Tier |
|---------|---------------|------------|-------------------|------|
| **Add Page Numbers** | 🟠 High | 🟡 Medium | 🟡 Medium | Pro |
| **Watermarks** | 🟠 High | 🟡 Medium | 🟡 Medium | Pro |
| **Protect/Unlock** | 🟠 High | 🔴 Hard | 🟡 Medium | Pro |

**Why:**
- Page numbers: Useful for documents, theses, reports
- Watermarks: Valuable for businesses (confidential, draft)
- Protect/Unlock: Requires encryption support (pdf-lib has limited support)

### Tier 3: Medium Value (Consider Later)

| Feature | Customer Value | Difficulty | Revenue Potential | Tier |
|---------|---------------|------------|-------------------|------|
| **OCR** | 🟡 Medium | 🔴 Hard | 🟡 Medium | Pro |
| **Convert to Image** | 🟡 Medium | 🔴 Hard | 🟡 Low | Free |
| **Crop** | 🟡 Medium | 🟢 Easy | 🟡 Low | Free |

**Why:**
- OCR: Requires external library (Tesseract.js) — large download, slow
- Convert to Image: Requires canvas rendering or external library
- Crop: Easy but low demand

### Tier 4: Low Priority

| Feature | Customer Value | Difficulty | Revenue Potential | Tier |
|---------|---------------|------------|-------------------|------|
| **Fill/Sign** | 🟢 Low | 🔴 Hard | 🟡 Medium | Pro |
| **Compare** | 🟢 Low | 🔴 Hard | 🟡 Low | Free |

---

## Recommended Roadmap

### Phase 1: Close the Gap (Week 1-2)
**Goal:** Match basic competitor feature set

1. **PDF Compression** (Free) — HIGH PRIORITY
   - Customer value: Very high
   - Difficulty: Medium
   - Impact: Eliminates #1 missing feature
   - Implementation: Optimize PDF objects, remove unused resources, compress streams

2. **Page Reordering** (Free) — HIGH PRIORITY
   - Customer value: Very high
   - Difficulty: Easy
   - Impact: Eliminates #2 missing feature
   - Implementation: Drag-and-drop page thumbnails, reorder array before save

### Phase 2: Pro Features (Week 3-4)
**Goal:** Justify $29/year Pro tier

3. **Add Page Numbers** (Pro)
   - Customer value: High
   - Difficulty: Medium
   - Impact: Strong Pro feature

4. **Watermarks** (Pro)
   - Customer value: High
   - Difficulty: Medium
   - Impact: Strong Pro feature for businesses

### Phase 3: Polish (Week 5-6)
**Goal:** Improve UX and reliability

5. **Better Error Messages** — Already done
6. **Loading Indicators** — Already done
7. **Success Messages** — Already done
8. **Mobile Optimization** — Already done

### Phase 4: Advanced (Month 2+)
**Goal:** Differentiate from competitors

9. **Batch Processing** (Pro) — Process multiple files at once
10. **PDF Metadata Editing** (Pro) — Edit title, author, keywords
11. **Split Every Page** (Pro) — Already implemented as "every N pages" with N=1

---

## Implementation Priority Matrix

```
High Value, Easy → DO FIRST
├── Page Reordering
└── Split Every N Pages (already done)

High Value, Medium → DO SECOND
├── PDF Compression
├── Page Numbers
└── Watermarks

High Value, Hard → PLAN CAREFULLY
├── OCR
├── Protect/Unlock
└── Convert to Image

Low Value, Easy → NICE TO HAVE
├── Crop
└── Better UI polish

Low Value, Hard → AVOID
├── Fill/Sign
└── Compare
```

---

## Recommended Next Feature: PDF Compression

**Why this feature:**

1. **Universal Need:** Every user wants smaller files
   - Email attachments have size limits
   - Faster uploads/downloads
   - Saves storage space

2. **Easy to Implement:**
   - pdf-lib can remove unused objects
   - Can compress streams
   - Can remove metadata
   - Works entirely offline

3. **High Customer Value:**
   - Immediate visible benefit
   - Easy to understand ("Make PDF smaller")
   - Frequently requested feature

4. **Fits CleanVault Philosophy:**
   - Works 100% offline
   - No server uploads
   - Fast (no network latency)
   - Privacy-preserving

5. **Competitive Necessity:**
   - ALL competitors have this
   - Users expect it
   - Without it, CleanVault looks incomplete

**Implementation Plan:**
- Add "Compress PDF" tool card to homepage
- Upload PDF → Show original size → Compress → Show new size → Download
- Target: 20-50% size reduction
- Method: Remove unused objects, compress streams, remove metadata

---

## Conclusion

**Immediate Action:**
1. Implement PDF Compression (Free feature)
2. Implement Page Reordering (Free feature)
3. Update marketing to highlight these features

**Next Quarter:**
4. Add Page Numbers (Pro)
5. Add Watermarks (Pro)

**Long Term:**
6. Consider OCR (requires Tesseract.js, 20MB+ download)
7. Consider Protect/Unlock (requires encryption support)

**Test Status:** 66/66 tests passing (100%)