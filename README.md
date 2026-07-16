<<<<<<< HEAD
# web-vestate-template
=======
# V-Estate Webcore Editor

A modern, interactive virtual tour web application for real estate projects. Built with SvelteKit, this tool renders property websites dynamically using configuration exported from the admin V-Estate editor.

## Overview

V-Estate Webcore is a client-facing web platform that transforms project configurations into immersive real estate experiences. When a project is configured in the V-Estate editor, a `config.json` file is exported and published to S3. This application fetches that configuration and renders an interactive web tour featuring 360° panoramas, dollhouse views, walkthrough videos, brochures, and project information.

**Use Case**: Client servicing teams use the V-Estate editor to configure virtual tours for real estate projects. Once published, the `config.json` is used by this webcore to automatically generate a fully functional, branded project website.

## Key Features

- **Dynamic Configuration Loading** – Fetches project data from S3 via `config.json`
- **Section Visibility Control** – Toggle sections on/off via config
- **360° Panoramic Viewer** – Day/Night views powered by CloudImage 360
- **Interactive Dollhouse** – 3D unit walkthrough using Marzipano
- **Exterior & Vicinity Tours** – 360° overviews with categorized hotspots
- **Brochure & Walkthrough** – PDF pagination and video player with controls
- **Responsive Design** – Optimized for desktop, tablet, and mobile
- **Static Site Generation** – Fast, SEO-friendly builds with SvelteKit

## Tech Stack

| Category                         | Technology                         |
| -------------------------------- | ---------------------------------- |
| Framework                        | SvelteKit 2.0                      |
| Language                         | TypeScript                         |
| Styling                          | Tailwind CSS + Material Tailwind   |
| 360 Viewer (Overview/Vicinities) | CloudImage 360 (CI360)             |
| 360 Viewer (Interiors/Amenities) | Marzipano                          |
| State Management                 | Svelte Stores                      |
| Build Tool                       | Vite                               |
| Deployment                       | Static (Vercel/Netlify compatible) |

## Project Structure

```
src/
├── lib/
│   ├── components/       # Reusable UI components
│   │   └── ui/          # Accordion, Button, etc.
│   ├── images/          # SVGs and icons
│   └── services/
│       └── configLoader.ts   # S3 config fetcher
├── routes/
│   ├── [project]/       # Dynamic project routes
│   │   ├── +layout.svelte    # Project layout wrapper
│   │   ├── +layout.ts        # Config loader & fetch
│   │   ├── +page.svelte      # Home/landing (intro video)
│   │   ├── overview/         # 360° day/night panoramas
│   │   ├── interiors/        # Dollhouse + unit tours
│   │   ├── amenities/        # Amenity 360° tours
│   │   ├── exterior/         # Exterior 360° tours
│   │   ├── vicinities/       # Vicinity 360° tours
│   │   └── brochure/         # PDF brochures + walkthrough video
│   ├── +layout.svelte
│   └── +page.svelte
└── stores/
    └── ui.ts            # Global UI state & projectConfig
static/
├── sample.json          # Example project configuration
└── tool/template/       # Export template files (for editor integration)
```

## How It Works

### 1. Configuration Loading

The app loads project configuration from an S3 bucket using the project slug in the URL.

**URL Format**: `https://yourdomain.com/{org}-{project}-{env}`

Example: `https://tour.vestate.io/runwal-raaya-test`

**Config Fetch Flow**:

```
[project]/+layout.ts → fetchConfig(org, project) → S3 URL
    ↓
S3: https://assets.vestate.io/webtool/{org}/{project}/config.json
    ↓
config.json → Svelte store (projectConfig) → All sections consume it
```

### 2. Configuration Schema

The `config.json` defines all project content and section visibility:

```json
{
  "projectId": "...",
  "projectName": "Raaya",
  "orgName": "Runwal",
  "overviewImages": {
    "day": [...],
    "evening": [...],
    "initialStartIndexDay": 10,
    "initialStartIndexNight": 1
  },
  "sectionVisibility": {
    "overview": true,
    "amenities": true,
    "brochure": true,
    "vicinities": true,
    "exterior": true,
    "interiors": true
  },
  "brochureSection": { "items": [...] },
  "vicinities": { "categories": [...] },
  "exterior": { "categories": [...] },
  "amenities": { "categories": [...] },
  "interiors": { "categories": [...] },
  "introVideo": "...",
  "projectLogo": "...",
  "orgLogo": "..."
}
```

**Important**: Each section (interiors, amenities, exterior, vicinities) uses categories with `zipUrl` pointing to tile data, and `data.json` containing the scene definitions for Marzipano tours.

### 3. 360° Panorama Rendering

- **Overview/Vicinities**: Uses **CloudImage 360 (CI360)** script loaded from `static/scripts/js-cloudimage-360-view.min.js`. The viewer is configured via `data-*` attributes on a container div.

- **Interiors/Amenities**: Uses **Marzipano** (via dynamic import) to render dollhouse panoramic tours with clickable hotspot navigation.

### 4. State Management

Global state lives in `src/stores/ui.ts`:

- `projectConfig` – Main project config (persisted to localStorage)
- `activeSection` – Currently active navigation section
- `hotspotName` – Current scene/hotspot ID
- `UIPanel` – Intro/instructions/loaded UI states

## Development

### Prerequisites

- Node.js ≥ 18
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
```

### Using a Local Config

To work with a local config instead of fetching from S3:

1. Open browser console
2. Set the config manually:

```javascript
import { projectConfig } from '$lib/stores/ui';
projectConfig.set({
	/* your config object */
});
```

### Environment Variables

Create `.env` files in the `environments/` folder:

```
environments/
├── .env.development
├── .env.staging
└── .env.production
```

Key variables:

- `PUBLIC_S3_BUCKET` – Override S3 bucket URL (defaults to assets.vestate.io/webtool)

## Building for Production

The app uses the **static adapter** (`@sveltejs/adapter-static`) with SPA fallback for client-side routing.

```bash
npm run build
# Output: build/ (can be deployed to any static host)
```

**Deployment**: Push the `build` folder to Vercel, Netlify, or any static hosting provider. Ensure the server rewrites all routes to `index.html` (SPA fallback).

## Test Coverage

- **Unit Tests**: Vitest (`npm run test:unit`)
- **Integration Tests**: Playwright (`npm run test:integration`)

Test files are located in the `tests/` directory.

## Config Format Details

### Overview Images

```json
"overviewImages": {
  "day": ["https://.../1.webp", "https://.../2.webp"],
  "evening": ["https://.../1.webp"],
  "initialStartIndexDay": 10,
  "initialStartIndexNight": 1
}
```

- 24 images per view (indexed 0–23)
- `initialStartIndexDay` specifies the starting frame
- CI360 loads the folder path automatically from the first URL

### Interiors / Amenities

```json
"interiors": {
  "categories": [
    {
      "id": "interior-category-...",
      "name": "4BHK",
      "dollhouseImage": "https://.../dollhouse.webp",
      "zipUrl": "https://.../Interiors/4bhk",
      "order": 1
    }
  ]
}
```

Each `zipUrl` must host:

- `data.json` – Scene definitions (id, levels, faceSize, initialViewParameters, linkHotspots)
- `tiles/{sceneId}/{z}/{f}/{y}/{x}.jpg` – Cubemap tiles for Marzipano

### Exterior / Vicinities

```json
"exterior": {
  "categories": [
    {
      "id": "...",
      "name": "Podium",
      "images": ["https://.../1.webp", ...],
      "initialViewIndex": 1
    }
  ]
}
```

Uses CloudImage 360 viewer; `initialViewIndex` sets the starting panorama.

### Brochure Section

```json
"brochureSection": {
  "items": [
    {
      "id": "item-...",
      "label": "Walkthrough",
      "type": "video",
      "assets": [{ "url": "https://.../output.mp4" }]
    },
    {
      "id": "...",
      "label": "Brochure",
      "type": "image",
      "assets": [
        { "url": "https://.../1.jpg", "pageNumber": 1 },
        { "url": "https://.../2.jpg", "pageNumber": 2 }
      ]
    }
  ]
}
```

## Contributing

This project follows standard SvelteKit conventions. Please ensure:

- TypeScript strict mode is respected
- ESLint and Prettier passes (`npm run lint`)
- Components are modular and typed
- UI changes are responsive

## License

Proprietary – V-Estate Platform

For questions or support, contact the V-Estate engineering team.
>>>>>>> 8e86303 (initial commit)
