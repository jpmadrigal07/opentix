import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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
      console.log('[esbuild] Build complete.');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
