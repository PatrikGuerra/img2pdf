# Image to PDF

Turn JPEG, PNG, WebP, HEIC, and HEIF images into a PDF in your browser. Arrange pages, adjust their layout, and download the result without uploading local files to a server.

**[Open Image to PDF](https://patrikguerra.github.io/img2pdf/)**

## Contents

- [Convert images](#convert-images)
- [Page and PDF controls](#page-and-pdf-controls)
- [Privacy and limits](#privacy-and-limits)
- [Run locally](#run-locally)
- [Project layout](#project-layout)
- [Deployment](#deployment)
- [Credits](#credits)
- [License](#license)

## Convert images

1. Open the app and select images, drag them onto the page, or paste copied images with `Ctrl+V` / `⌘+V`.
2. To use images hosted elsewhere, enter one image URL per line and select **Add image URLs**. You can also drop image links onto the page.
3. Review the preparation queue and select **Continue**. HEIC and HEIF images are converted to JPEG on your device.
4. Arrange and edit the pages, choose your PDF options and filename, then select **Generate PDF**.

You can add more files after entering the editor. Each image becomes a PDF page. The preparation queue shows unsupported files and conversion failures.

## Page and PDF controls

| Control | What it does |
| --- | --- |
| Page toolbar | Select, move, rotate, flip, or remove a page. Pages can also be reordered by dragging. |
| Undo page edit | Restore the most recent page edit or deletion, including the last page. |
| Orientation | Detects orientation from image dimensions; change it for each page or for all pages. JPEG EXIF orientation is supported. |
| Page size | Choose A4, US Letter, Oficio, or the image's dimensions. |
| Margin and placement | Set a margin and choose Fit or Cover. |
| Background and page numbers | Set a page background color and configure number position, alignment, and placement. |
| Compression | Optionally compress images as JPEG and choose the quality. |
| Maximum image dimension | Reduce large images before embedding them; zero keeps their original dimensions. |
| Output | Set the PDF filename, follow generation progress, and see the generated file size. |

PDF options are saved in browser storage for the next visit. Images themselves are not saved.

## Privacy and limits

- Local files are processed in the browser and are not uploaded by the app. PDF generation and HEIC/HEIF conversion happen on your device.
- Image URLs are requested directly from their hosts. Those hosts receive the browser's request; loading also depends on the host allowing cross-origin access (CORS).
- Supported inputs are JPEG, PNG, WebP, HEIC, and HEIF. WebP is converted locally to PNG unless JPEG compression is enabled.
- Large images or many pages can require substantial browser memory and processing time.

## Run locally

Use Node.js `^22.12.0`, `^24.0.0`, or `>=26.0.0` and npm.

```sh
git clone https://github.com/PatrikGuerra/img2pdf.git
cd img2pdf/pdf-app
npm ci
npm run dev
```

Open the local URL printed by Vite. Stop the server with `Ctrl+C`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm run typecheck` | Check TypeScript types. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run build` | Typecheck and build the static site into `../docs`. |
| `npm run preview` | Preview the production build locally. |

## Project layout

```text
pdf-app/
  public/             Static assets
  src/components/     Upload, page editing, and PDF controls
  src/image/          Image preparation and orientation
  src/pdf/            PDF generation and page layout
  src/download/       PDF download and filename handling
  src/App.tsx         Application state and workflow
.github/workflows/    GitHub Pages build and deployment
```

The app uses React, TypeScript, Vite, and pdf-lib. Vitest and Testing Library cover the application and conversion logic.

## Deployment

The GitHub Actions workflow builds and tests the app on pushes to `main` or through a manual run. It publishes the generated `docs` directory to GitHub Pages. Configure the repository's Pages source as **GitHub Actions**. The generated directory is ignored by Git.

## Credits

This project is based on and inspired by [subhra74/img2pdf](https://github.com/subhra74/img2pdf). It also uses React, pdf-lib, exif-js, heic2any, mobile-drag-drop, and Font Awesome.

## License

[GNU General Public License v3.0](LICENSE). Third-party dependencies have their own licenses.
