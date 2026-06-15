import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
const viteConfigSource = readFileSync(resolve(process.cwd(), 'vite.config.js'), 'utf8');

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
      build: 'vite build',
      preview: 'vite preview',
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
});
