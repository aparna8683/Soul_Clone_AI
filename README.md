# SoulClone AI

AI-powered website recreation system that turns a public website URL into a new React/Vite implementation.

## Architecture

```
Public URL
   |
   v
Playwright browser analysis
   |---- DOM/content
   |---- CSS/computed styles
   |---- structure + landmarks
   |---- assets
   |---- responsive behavior
   |---- screenshots
   |
   v
Groq Vision Analyzer
   |
   v
WebsiteSpec / visual blueprint
   |
   v
Groq UI Architecture Agent
   |
   v
ReactSpec
   |
   v
React/Vite generator
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
Groq Visual Critic
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
- DOM, CSS, structure, asset and responsive extraction
- Screenshot-based visual analysis
- Structured WebsiteSpec
- AI component planning
- AI React specification generation
- React/Vite file generation
- Local image asset caching
- Build validation
- Bounded AI build repair
- Local preview
- Visual comparison/QA
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
- Asset downloads are best-effort. Failed downloads fall back to source URLs.
- Generated builds are validated before a preview URL is returned.
- Build repair is bounded to avoid unbounded AI/code execution.
- Generated preview screenshots are checked separately from build success.

## Notes

The system is intentionally designed to generalize across multiple public websites instead of using a hardcoded template for one site.
