import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { cpSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');
const buildAll = process.argv.includes('--all');
const buildWebviewOnly = process.argv.includes('--webview');

/** @type {esbuild.BuildOptions} */
const extensionConfig = {
  entryPoints: [resolve(__dirname, 'src/extension.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/extension.js'),
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
};

/** @type {esbuild.BuildOptions} */
const webviewConfig = {
  entryPoints: [resolve(__dirname, 'src/webview/kanban/app.ts')],
  bundle: true,
  outfile: resolve(__dirname, 'dist/webview/kanban.js'),
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: false,
};

function copyWebviewAssets() {
  const srcDir = resolve(__dirname, 'src/webview/kanban');
  const destDir = resolve(__dirname, 'dist/webview');
  mkdirSync(resolve(destDir, 'styles'), { recursive: true });
  cpSync(resolve(srcDir, 'index.html'), resolve(destDir, 'index.html'));
  cpSync(resolve(srcDir, 'styles/theme.css'), resolve(destDir, 'styles/theme.css'));
  cpSync(resolve(srcDir, 'styles/board.css'), resolve(destDir, 'styles/board.css'));
  console.log('[esbuild] Copied webview static assets to dist/webview/');
}

async function build() {
  try {
    if (isWatch) {
      const configs = buildAll
        ? [extensionConfig, webviewConfig]
        : buildWebviewOnly
          ? [webviewConfig]
          : [extensionConfig];

      for (const config of configs) {
        const ctx = await esbuild.context(config);
        await ctx.watch();
      }
      if (configs.includes(webviewConfig)) {
        copyWebviewAssets();
      }
      console.log('[esbuild] Watching for changes...');
    } else {
      const configs = buildAll
        ? [extensionConfig, webviewConfig]
        : buildWebviewOnly
          ? [webviewConfig]
          : [extensionConfig];

      for (const config of configs) {
        await esbuild.build(config);
      }
      if (configs.includes(webviewConfig)) {
        copyWebviewAssets();
      }
      console.log('[esbuild] Build complete.');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
