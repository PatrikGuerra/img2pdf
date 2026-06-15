# Img2PDF App

React + Vite app for converting local JPEG, PNG, HEIC, and HEIF files to PDF in the browser.

## Scripts

- `npm start` or `npm run dev`: run the Vite development server.
- `npm test`: run the Vitest test suite once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run build`: build the production bundle into `../docs`.
- `npm run preview`: preview the production build locally.

## Deployment

GitHub Pages is served from the repository-level `docs` directory. Run `npm run build` from this directory to regenerate that output.

## Image formats

JPEG and PNG are embedded directly. HEIC and HEIF photos are converted locally in the browser to JPEG before PDF generation. WebP is intentionally not enabled in this step; adding it would require canvas conversion and a separate decision about how to handle transparency.
