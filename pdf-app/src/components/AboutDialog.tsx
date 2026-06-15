interface CreditItem {
  name: string;
  url: string;
}

const runtimeCredits: CreditItem[] = [
  { name: 'React', url: 'https://react.dev/' },
  { name: 'React DOM', url: 'https://react.dev/' },
  { name: 'pdf-lib', url: 'https://pdf-lib.js.org/' },
  { name: 'exif-js', url: 'https://github.com/exif-js/exif-js' },
  { name: 'heic2any', url: 'https://github.com/alexcorvi/heic2any' },
  { name: 'mobile-drag-drop', url: 'https://github.com/timruffles/mobile-drag-drop' },
  { name: 'Font Awesome', url: 'https://fontawesome.com/v4/' },
];

const developmentCredits: CreditItem[] = [
  { name: 'Vite', url: 'https://vite.dev/' },
  { name: '@vitejs/plugin-react', url: 'https://github.com/vitejs/vite-plugin-react' },
  { name: 'TypeScript', url: 'https://www.typescriptlang.org/' },
  { name: 'Vitest', url: 'https://vitest.dev/' },
  { name: 'jsdom', url: 'https://github.com/jsdom/jsdom' },
  { name: '@testing-library/jest-dom', url: 'https://testing-library.com/docs/ecosystem-jest-dom/' },
  { name: '@testing-library/react', url: 'https://testing-library.com/docs/react-testing-library/intro/' },
  { name: '@testing-library/user-event', url: 'https://testing-library.com/docs/user-event/intro/' },
  { name: '@types/exif-js', url: 'https://www.npmjs.com/package/@types/exif-js' },
  { name: '@types/node', url: 'https://www.npmjs.com/package/@types/node' },
  { name: '@types/react', url: 'https://www.npmjs.com/package/@types/react' },
  { name: '@types/react-dom', url: 'https://www.npmjs.com/package/@types/react-dom' },
];

interface AboutDialogProps {
  onClose: () => void;
}

export default function AboutDialog({ onClose }: AboutDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div aria-labelledby="about-dialog-title" aria-modal="true" className="dialog about-dialog" role="dialog">
        <div className="about-dialog-header">
          <div className="dialog-title" id="about-dialog-title">About this app</div>
          <button aria-label="Close about dialog" className="plain-button" onClick={onClose} type="button">
            X
          </button>
        </div>
        <div className="dialog-body about-dialog-body">
          <section className="about-section">
            <h2>Original project</h2>
            <p>
              This app is based on and inspired by the original{' '}
              <ExternalLink href="https://github.com/subhra74/img2pdf">subhra74/img2pdf</ExternalLink>
              {' '}project.
            </p>
          </section>

          <CreditSection items={runtimeCredits} title="Runtime libraries" />
          <CreditSection items={developmentCredits} title="Development, testing, and build tools" />
        </div>
        <div className="dialog-actions about-dialog-actions">
          <button className="plain-dialog-button" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreditSection({ items, title }: { items: CreditItem[]; title: string }) {
  return (
    <section className="about-section">
      <h2>{title}</h2>
      <ul className="about-credit-list">
        {items.map((item) => (
          <li key={item.name}>
            <ExternalLink href={item.url}>{item.name}</ExternalLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExternalLink({ children, href }: { children: string; href: string }) {
  return (
    <a className="about-link" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  );
}
