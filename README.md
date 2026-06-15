# Convert Image To PDF

Client-side web app for converting JPEG, PNG, HEIC, and HEIF images into a PDF without uploading files to a server.

Files are processed entirely on your device. The app is designed for privacy-sensitive image-to-PDF workflows and is published as a static GitHub Pages site.

Live app: https://patrikguerra.github.io/img2pdf/

## Features

- Convert JPEG and PNG images directly to PDF.
- Convert HEIC and HEIF photos locally to JPEG before PDF generation.
- Prepare uploads with visible per-file status, including HEIC/HEIF conversion feedback.
- Add multiple pages, reorder pages, remove pages with confirmation, rotate pages, and flip pages horizontally or vertically.
- Auto-detect portrait/landscape page orientation from image proportions, with per-page orientation controls.
- Configure PDF output:
  - page size: A4, US Letter, Oficio, or Same as Image;
  - page orientation;
  - margin presets and custom margins in millimeters;
  - Fit or Cover image placement;
  - optional page background color;
  - optional page numbers with position, alignment, and overlay/header-footer placement;
  - optional JPEG compression and quality percentage.
- Customize the output PDF filename.
- Show image count, estimated source size, and generation progress.
- Includes an About dialog with credits for the original project and third-party tools.

## Development

The app source lives in `pdf-app` and uses React, TypeScript, Vite, Vitest, and `pdf-lib`.

```sh
cd pdf-app
npm ci
npm run dev
```

Useful commands:

- `npm run typecheck`: run TypeScript checks.
- `npm test`: run the Vitest suite.
- `npm run build`: build the static site into `docs`.
- `npm run preview`: preview the production build locally.

## Deployment

The production static site is generated into the repository-level `docs` directory.

This repo includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml` that runs tests, builds the app, uploads `docs` as a GitHub Pages artifact, and deploys it. In GitHub repository settings, configure Pages to use `GitHub Actions` as the publishing source.

## Credits

This project is based on and inspired by the original `subhra74/img2pdf` project: https://github.com/subhra74/img2pdf

Key third-party tools include React, pdf-lib, exif-js, heic2any, mobile-drag-drop, Font Awesome, Vite, TypeScript, Vitest, jsdom, and Testing Library.

## License

This project is licensed under the GNU General Public License v3.0. See `LICENSE` for the full license text.

Third-party dependencies are distributed under their own licenses.
