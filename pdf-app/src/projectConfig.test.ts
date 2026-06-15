import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const viteConfigSource = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
const deployPagesWorkflowPath = resolve(process.cwd(), '..', '.github', 'workflows', 'deploy-pages.yml');

describe('project configuration', () => {
  test('uses Vite and Vitest instead of CRA react-scripts', () => {
    expect(JSON.stringify(packageJson)).not.toContain('react-scripts');
    expect(packageJson.dependencies.react).toMatch(/^(\^)?18\./);
    expect(packageJson.dependencies['react-dom']).toMatch(/^(\^)?18\./);
    expect(packageJson.devDependencies.vite).toBeDefined();
    expect(packageJson.devDependencies.vitest).toBeDefined();
  });

  test('keeps the expected development scripts', () => {
    expect(packageJson.scripts).toMatchObject({
      dev: 'vite',
      start: 'vite',
      build: 'npm run typecheck && vite build',
      preview: 'vite preview',
      typecheck: 'tsc --noEmit',
      test: 'vitest run',
    });
  });

  test('builds GitHub Pages output into docs with relative asset paths', () => {
    expect(viteConfigSource).toContain("base: './'");
    expect(viteConfigSource).toContain("outDir: '../docs'");

    const docsIndex = readFileSync(resolve(process.cwd(), '..', 'docs', 'index.html'), 'utf8');

    expect(docsIndex).toContain('./assets/');
    expect(docsIndex).not.toMatch(/(?:href|src)="\/assets\//);
  });

  test('does not keep the deprecated pdf-app build output directory', () => {
    expect(existsSync(resolve(process.cwd(), 'build'))).toBe(false);
  });

  test('keeps the GitHub Pages deployment workflow configured', () => {
    expect(existsSync(deployPagesWorkflowPath)).toBe(true);

    const workflowSource = readFileSync(deployPagesWorkflowPath, 'utf8');

    expect(workflowSource).toContain('branches:');
    expect(workflowSource).toContain('- main');
    expect(workflowSource).toContain('working-directory: pdf-app');
    expect(workflowSource).toContain('run: npm ci');
    expect(workflowSource).toContain('run: npm test');
    expect(workflowSource).toContain('run: npm run build');
    expect(workflowSource).toContain('uses: actions/configure-pages@v5');
    expect(workflowSource).toContain('uses: actions/upload-pages-artifact@v4');
    expect(workflowSource).toContain('path: docs');
    expect(workflowSource).toContain('uses: actions/deploy-pages@v4');
  });
});
