# CleanVault — Feature Plan

**Last Updated:** June 29, 2026  
**Status:** Current

---

## Free Features (7 tools)

All basic PDF editing tools are free:

1. **PDF Merge** — Combine multiple PDFs into one
2. **PDF Split** — Split by page ranges or every N pages
3. **Extract Pages** — Extract specific pages
4. **Rotate PDF** — Rotate 90°, 180°, or 270°
5. **Compress PDF** — Reduce file size
6. **Reorder Pages** — Drag-and-drop page reordering
7. **Remove Pages** — Delete specific pages

**Rationale:** These are essential PDF operations that every user needs. Making them free:
- Maximizes user acquisition
- Reduces friction
- Builds trust
- Matches competitor baseline

---

## Pro Features (2 tools)

Advanced features for power users:

1. **Add Watermark** — Text watermarks with customizable options
   - Custom text
   - Font size (24pt, 48pt, 72pt)
   - Opacity (10%, 30%, 50%)
   - Rotation (-45°, 0°, 45°)
   - Position (5 options)

2. **Add Page Numbers** — Add page numbers to all pages
   - Position: Bottom Left, Center, Right
   - Format: "Page {n}"
   - Applied to all pages

**Rationale:** Pro features provide:
- Business document security (watermarks)
- Professional formatting (page numbers)
- Competitive parity with major PDF tools
- Clear value proposition for $29/year

**Note:** Password Protect was removed from Pro tier due to pdf-lib library limitations (no encryption support). Will be re-added when real encryption is implemented.

---

## Future Roadmap

### Phase 1: Essential (Not Started)
- **Page Numbers** (Pro) — Add page numbers to PDFs
  - Custom position and format
  - High business value

### Phase 2: Advanced (Not Started)
- **Batch Processing** (Pro) — Process multiple PDFs at once
  - Queue system
  - Download all as ZIP
- **PDF Metadata Editing** (Pro) — Edit title, author, keywords
- **Image Watermark** (Pro) — Upload logo/image as watermark

### Phase 3: Nice to Have (Not Started)
- **Crop Pages** (Free) — Crop margins
- **Protect PDF** (Pro) — Password protection
- **Unlock PDF** (Pro) — Remove password protection

### Not Planned
- **OCR** — Requires 20MB+ Tesseract.js download
- **Convert to Image** — Low demand, large files
- **Fill/Sign** — Different use case, better as separate product
- **Compare PDFs** — Low demand

---

## Feature Priority Matrix

```
HIGH PRIORITY (Implement Next)
├── Page Numbers (Pro)
└── Batch Processing (Pro)

MEDIUM PRIORITY
├── Image Watermark (Pro)
├── PDF Metadata (Pro)
└── Crop Pages (Free)

LOW PRIORITY
├── Protect/Unlock (Pro)
└── Page Preview Thumbnails (Free)
```

---

## Pricing Strategy

### Current Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 7 tools (Merge, Split, Extract, Rotate, Compress, Reorder, Remove) |
| **Pro** | $29/year | + Watermark + future Pro features |

### Why This Works

**Free tier:**
- Complete PDF editing toolkit
- No limits, no registration
- Solves 90% of user needs
- Drives massive adoption

**Pro tier:**
- Watermark for business users
- Future advanced features
- $29/year is impulse-buy price
- Clear upgrade path

---

## Competitive Position

### Feature Comparison

| Feature | PDF24 | PDFsam | Smallpdf | iLovePDF | Sejda | CleanVault |
|---------|-------|--------|----------|----------|-------|------------|
| Merge | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Split | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Rotate | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Extract | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Compress | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Reorder | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ Free |
| Watermark | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ Pro |
| Page Numbers | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ Planned |

**Status:** 7/8 competitor features implemented (87.5%)

---

## Success Metrics

### User Adoption
- 1,000 monthly active users (Month 3)
- 5% Pro conversion rate
- <5% churn rate

### Product Quality
- 99% uptime (GitHub Pages)
- <2s average tool load time
- 100% offline functionality
- 0% data upload

### Revenue
- $500/month recurring (Month 6)
- $2,000/month recurring (Month 12)

---

## Next Steps

1. ✅ Finalize free/pro feature split — **DONE**
2. Launch and gather user feedback
3. Add Page Numbers (Pro) based on demand
4. Add Batch Processing (Pro) for power users
5. Consider image watermark if requested

---

*CleanVault — Your files never leave your computer.*