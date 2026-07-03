# CleanVault — Product Roadmap

**Last Updated:** June 29, 2026  
**Vision:** The most trusted, private PDF tool on the web

---

## Current Status (v1.0.0)

### ✅ Launched Features
- PDF Merge (drag/drop reorder)
- PDF Split (ranges + every N pages)
- Extract Pages
- Rotate PDF
- Remove Pages (Pro)
- Cryptographic license system

### 📊 Metrics
- 66/66 tests passing (100%)
- 5 PDF tools (4 free + 1 Pro)
- 5 pricing tiers
- Works 100% offline

---

## Phase 1: Close the Gap (Week 1-2) — HIGH PRIORITY

**Goal:** Match competitor feature set

### 1.1 PDF Compression (Free)
- **Customer Value:** Very High
- **Difficulty:** Medium
- **Status:** Not started
- **Target:** 20-50% file size reduction
- **Method:** Remove unused objects, compress streams, strip metadata

### 1.2 Page Reordering (Free)
- **Customer Value:** Very High
- **Difficulty:** Easy
- **Status:** Not started
- **UI:** Drag-and-drop page thumbnails
- **Use Case:** Rearrange scanned documents, move last page to front

**Impact:** Eliminates 2 major gaps vs competitors

---

## Phase 2: Pro Features (Week 3-4) — HIGH PRIORITY

**Goal:** Justify $29/year Pro tier

### 2.1 Add Page Numbers (Pro)
- **Customer Value:** High
- **Difficulty:** Medium
- **Status:** Not started
- **Features:**
  - Custom position (top/bottom, left/center/right)
  - Custom format (Page X of Y, X/Y, etc.)
  - Font size and color options

### 2.2 Watermarks (Pro)
- **Customer Value:** High
- **Difficulty:** Medium
- **Status:** Not started
- **Features:**
  - Text watermark (custom text, font, size, color)
  - Opacity control
  - Rotation angle
  - Position (center, tile, corner)

**Impact:** 2 strong Pro features to drive upgrades

---

## Phase 3: Polish & Reliability (Week 5-6) — MEDIUM PRIORITY

**Goal:** Improve UX and edge case handling

### 3.1 Enhanced Error Handling
- ✅ Better corrupted PDF detection
- ✅ Clearer error messages
- ✅ Recovery suggestions

### 3.2 Performance Optimization
- Lazy loading for large PDFs
- Progress bars for long operations
- Memory management for 100+ page PDFs

### 3.3 Mobile Experience
- ✅ Touch-friendly drag/drop
- ✅ Responsive file lists
- ✅ Mobile-optimized buttons

**Impact:** Better user experience, fewer support tickets

---

## Phase 4: Advanced Features (Month 2+) — MEDIUM PRIORITY

**Goal:** Differentiate from competitors

### 4.1 Batch Processing (Pro)
- Process multiple PDFs at once
- Queue system
- Download all as ZIP

### 4.2 PDF Metadata Editing (Pro)
- Edit title, author, subject, keywords
- Creation/modification dates
- PDF properties

### 4.3 Crop Pages (Free)
- Crop margins
- Custom crop areas
- Preset sizes (A4, Letter, etc.)

---

## Phase 5: Innovation (Month 3+) — LOW PRIORITY

**Goal:** Unique competitive advantages

### 5.1 OCR (Pro)
- Extract text from scanned PDFs
- Requires Tesseract.js (20MB+ download)
- Slow but valuable for scanned documents

### 5.2 Protect/Unlock (Pro)
- Password protect PDFs
- Remove password protection
- Note: Limited by pdf-lib encryption support

### 5.3 Convert to Image (Free)
- PDF → PNG/JPEG
- Requires canvas rendering
- Large file sizes

---

## Feature Priority Matrix

```
NOW (Phase 1)
├── PDF Compression [Free] ← Implementing next
└── Page Reordering [Free]

NEXT (Phase 2)
├── Page Numbers [Pro]
└── Watermarks [Pro]

LATER (Phase 3-5)
├── Batch Processing [Pro]
├── Metadata Editing [Pro]
├── Crop [Free]
├── OCR [Pro]
├── Protect/Unlock [Pro]
└── Convert to Image [Free]
```

---

## Pricing Strategy

### Current Tiers
| Plan | Price | Users | Features |
|------|-------|-------|----------|
| Free | $0 | Unlimited | Merge, Split, Extract, Rotate, Compress, Reorder |
| Personal Pro | $29/year | 1 | + Remove Pages, Page Numbers, Watermarks |
| Professional | $79/year | 1 | + Priority support, early access |
| Small Team | $199/year | 5 | + Team management |
| Corporate | $499/year | 25 | + Business support, analytics |
| Enterprise | Custom | Unlimited | + Custom integrations |

### Pro Feature Allocation
**Free:** Core tools everyone needs
- Merge, Split, Extract, Rotate
- Compress, Reorder (Phase 1)

**Pro:** Advanced features for power users
- Remove Pages (current)
- Page Numbers, Watermarks (Phase 2)
- Batch Processing, Metadata (Phase 4)

---

## Success Metrics

### User Acquisition
- 1,000 monthly active users (Month 3)
- 10% Pro conversion rate
- <5% churn rate

### Product Quality
- 99% uptime (GitHub Pages)
- <2s average tool load time
- 100% offline functionality
- 0% data upload (privacy guarantee)

### Revenue
- $500/month recurring (Month 6)
- $2,000/month recurring (Month 12)
- $10,000/month recurring (Month 24)

---

## Technical Debt & Improvements

### Short Term
- [ ] Add PDF compression
- [ ] Add page reordering
- [ ] Improve error messages
- [ ] Add loading progress bars

### Medium Term
- [ ] Consider Web Workers for large PDFs
- [ ] Add service worker for offline caching
- [ ] Implement PDF preview thumbnails
- [ ] Add undo/redo functionality

### Long Term
- [ ] Evaluate backend for license validation
- [ ] Add usage analytics (privacy-respecting)
- [ ] Consider Electron wrapper for desktop app
- [ ] Add collaborative features (requires backend)

---

## Risk Assessment

### High Risk
- **Client-side licensing bypass** — Cannot fully fix without backend
- **Only 1 Pro feature** — Need more to justify $29/year
- **No backend** — Limits advanced features

### Medium Risk
- **pdf-lib limitations** — Some features require different library
- **Browser compatibility** — Must test on Safari, Edge, Firefox
- **Large file performance** — 100+ page PDFs may be slow

### Low Risk
- **CDN dependency** — pdf-lib loaded from unpkg CDN
- **GitHub Pages limits** — 100GB/month bandwidth

---

## Next Steps

### This Week
1. ✅ Implement PDF Compression
2. ✅ Implement Page Reordering
3. ✅ Update all documentation
4. ✅ Run full test suite

### Next Week
5. Implement Page Numbers (Pro)
6. Implement Watermarks (Pro)
7. Create demo videos
8. Set up Stripe checkout

### Next Month
9. Launch on Product Hunt
10. Gather user feedback
11. Iterate on most-requested features
12. Add 2-3 more Pro features

---

## Conclusion

**Immediate Focus:** PDF Compression and Page Reordering  
**Pro Tier Goal:** 4-5 compelling Pro features by launch  
**Long-term Vision:** Most trusted, private PDF tool on the web

**Current Test Status:** 66/66 passing (100%)