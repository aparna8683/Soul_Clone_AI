# SoulClone AI

AI-powered website recreation system that turns a public website URL into a new React/Vite implementation.

## Architecture

```
Public URL
   |
   v
Playwright browser analysis
   |---- visible content + meaningful section boundaries
   |---- bounded ReconstructionIR (geometry, hierarchy, computed CSS)
   |---- image source, rendered size, fit and semantic role
   |---- desktop/tablet/mobile structure snapshots
   |---- screenshots
   |
   v
Groq semantic interpretation (optional)
   |
   v
WebsiteSpec + ReconstructionIR
   |
   v
Groq UI Architecture Agent
   |
   v
ReactSpec
   |
   v
React/Vite generator (source-derived surfaces, spacing and hero geometry)
   |
   v
Build Validator + bounded repair
   |
   v
Local Vite Preview
   |
   v
Generated Screenshot
   |
   v
Pixel diff with section-level scores + optional Groq visual critic/repair
```

The generated website is a new React implementation. It does not iframe or embed the original website.

## Stack

- React + Vite + JavaScript
- Node.js + Express
- Playwright
- Groq API
- Qwen 3.8 27B for visual analysis and visual QA
- npm
- GitHub

## Features

- Public URL analysis
- Bounded visible-element tree with DOM parent/child links, bounding boxes, layout primitives, typography, surfaces, content and links
- Responsive snapshots at desktop, tablet and mobile widths
- Image visibility, rendered/natural dimensions, object fit and object position; avatar/logo/icon detection to avoid promoting them to hero media
- Screenshot-based visual analysis
- Structured WebsiteSpec and ReconstructionIR; the tree is capped at 260 meaningful visible nodes
- Extracted section padding, gap, backgrounds/gradients, radii and hero height are carried into generated CSS
- Deterministic section plan when Groq analysis or generation is unavailable, including rate limits
- AI component planning
- AI React specification generation
- React/Vite file generation
- Local image asset caching
- Build validation
- Bounded AI build repair
- Local preview
- Visual comparison/QA with per-section bounding boxes and similarity/error scores
- Natural-language modification of generated websites

## Run locally

### Backend

```bash
cd server
npm install
```

Create `server/.env`:

```env
GROQ_API_KEY=your_key_here
```

Start:

```bash
npm run dev
```

Backend runs on:

```
http://localhost:5000
```

### Frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown by the client.

## Generated output

Generated websites are written to:

```
server/generated-site/
```

The local preview normally runs on:

```
http://localhost:4173
```

## AI modification

After generation, enter a natural-language request such as:

- Make the primary color purple.
- Make the navbar sticky.
- Add a testimonials section.
- Remove the pricing section.

The modification pipeline updates the React specification, regenerates the frontend, validates the build, starts a new preview and runs visual QA.

## Safety and reliability

- Vision analysis is non-blocking. If the vision model fails, DOM/CSS analysis continues.
- Groq 429 responses are retried with bounded backoff (honoring `retry-after`). Once quota is exhausted, later AI steps fail fast and fall back to deterministic planning instead of failing the request; responses report this via `aiStatus`.
- Asset downloads are best-effort. Failed downloads fall back to source URLs.
- Generated builds are validated before a preview URL is returned.
- Build repair is bounded to avoid unbounded AI/code execution.
- Generated preview screenshots are checked separately from build success.

## Notes

The system is intentionally designed to generalize across multiple public websites instead of using a hardcoded template for one site.

## Reconstruction pipeline

Playwright captures a compact, bounded `ReconstructionIR` alongside the existing `WebsiteSpec`. Each retained visible node records its hierarchy, viewport/document geometry, computed flex/grid layout, spacing, typography, borders, backgrounds, effects, text/link details, and image sizing. The extractor excludes hidden and zero-size nodes and caps the tree to keep analysis and AI prompts manageable. Existing desktop/tablet/mobile analysis remains in place.

Groq is used for semantic section/component interpretation. The extractor's measurements remain the source for section surfaces and sizing; if AI planning is unavailable (including 429 responses), the system derives a conservative React specification from extracted headings, sections, and suitable media. The generator still produces independent React/Vite markup. It does not display the source page in an iframe, embed, proxy, or screenshot-as-page.

The pixel comparison returns both a global score and scores for extracted section boxes that overlap the captured viewport. The visual critic is optional and isolated from pixel comparison, so a model quota failure no longer suppresses the deterministic diff.

Current limits: the generated templates do not yet reproduce arbitrary DOM trees node for node; some complex canvas/video visuals and CSS background assets cannot be recreated from computed styles alone; section comparison currently covers the screenshot viewport rather than a full-page tiled comparison; semantic fallback can preserve the main structure but may omit fine-grained content groupings. Live similarity scores vary with browser access to the source site and should be treated as indicative.
