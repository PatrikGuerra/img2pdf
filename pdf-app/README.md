# Img2PDF App

React + TypeScript + Vite app for converting local JPEG, PNG, HEIC, and HEIF files to PDF in the browser.

The app is client-only: selected files are processed on the user's device and are not uploaded to a server.

## Functionality

- Local JPEG/PNG to PDF generation with `pdf-lib`.
- Local HEIC/HEIF to JPEG conversion before preview/PDF generation.
- Upload preparation queue with per-file status, ignored-file feedback, and conversion progress messaging.
- Page management:
  - page selection;
  - drag-and-drop reorder;
  - contextual toolbar for move left/right, rotate, flip horizontal, flip vertical, and remove;
  - removal confirmation;
  - page numbers shown below each preview.
- Orientation handling:
  - automatic portrait/landscape detection from image dimensions;
  - EXIF orientation support for JPEGs;
  - per-page orientation controls;
  - confirmation before overwriting mixed orientations globally.
- PDF options:
  - page sizes: A4, US Letter, Oficio, and Same as Image;
  - portrait/landscape orientation;
  - margin presets plus custom millimeter input;
  - Fit/Cover image placement;
  - optional page background color;
  - optional page numbering with vertical position, horizontal alignment, and overlay/header-footer placement;
  - optional image compression with percentage quality control.
- Output controls:
  - custom PDF filename;
  - image count and estimated source size;
  - progress overlay while generating;
  - About dialog with original project and third-party credits.

## Scripts

- `npm start` or `npm run dev`: run the Vite development server.
- `npm run typecheck`: run TypeScript without emitting files.
- `npm test`: run the Vitest test suite once.
- `npm run test:watch`: run Vitest in watch mode.
- `npm run build`: typecheck and build the production bundle into `../docs`.
- `npm run preview`: preview the production build locally.

## Deployment

GitHub Pages is served from the repository-level `docs` directory. Run `npm run build` from this directory to regenerate that output locally.

The repository also includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`. It runs on pushes to `main` or manually through `workflow_dispatch`, installs dependencies, runs tests, builds the Vite app into `docs`, and deploys that directory to GitHub Pages. In the repository settings, configure Pages to use `GitHub Actions` as the publishing source.

## Image formats

JPEG and PNG are embedded directly.

HEIC and HEIF photos are converted locally in the browser to JPEG before PDF generation. WebP is intentionally not enabled; adding it would require canvas conversion and a separate decision about how to handle transparency.

## Credits

This app is based on and inspired by the original `subhra74/img2pdf` project: https://github.com/subhra74/img2pdf

Runtime libraries:

- React
- React DOM
- pdf-lib
- exif-js
- heic2any
- mobile-drag-drop
- Font Awesome

Development, testing, and build tools:

- Vite
- @vitejs/plugin-react
- TypeScript
- Vitest
- jsdom
- @testing-library/jest-dom
- @testing-library/react
- @testing-library/user-event
- @types/exif-js
- @types/node
- @types/react
- @types/react-dom

## License

This project is licensed under the GNU General Public License v3.0. See the repository-level `LICENSE` file for the full license text.

Third-party dependencies are distributed under their own licenses.
