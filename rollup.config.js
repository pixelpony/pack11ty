import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import scss from 'rollup-plugin-scss';
import entrypointHashmanifest from 'rollup-plugin-entrypoint-hashmanifest';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
const config = require('./pack11ty.config.js');

const SRC_PATH_JS = path.join(config.dir.src, '_assets/js');
const SRC_PATH_CSS = path.join(config.dir.src, '_assets/sass');
const HASH_PATH = path.join(config.dir.src, '_data');

const DEST_PATH_JS = path.join(config.dir.dist, 'js');
const DEST_PATH_CSS = path.join(config.dir.dist, 'css');

const createHashedCssFile = function (folder, srcFile, destFile, styles) {
  // Get the 8 first chars of the md5 hash of these styles
  const hash = crypto
    .createHash('md5')
    .update(styles)
    .digest('hex')
    .substring(0, 8);
  const hashedDestFile = destFile.replace('[hash]', hash);
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, hashedDestFile), styles);

  // create or update the JSON file listing hashed CSS files
  const hashesFile = path.join(HASH_PATH, 'hashes_css.json');
  let hashes = {};
  if (fs.existsSync(hashesFile)) {
    hashes = JSON.parse(
      fs.readFileSync(hashesFile, {
        encoding: 'utf8',
      })
    );
  }
  hashes[srcFile] = hashedDestFile;
  fs.writeFileSync(hashesFile, JSON.stringify(hashes, null, ' '));

  // Make sure Rollup removes the "import" from the JavaScript
  return false;
};

const plugins_critical = [
  commonjs(),
  resolve(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  babel({
    exclude: 'node_modules/**',
  }),
  terser(),
  scss({
    failOnError: true,
    outputStyle: 'compressed',
    output: function (styles, styleNodes) {
      createHashedCssFile(
        DEST_PATH_CSS,
        'critical.css',
        'critical.[hash].css',
        styles
      );
    },
    watch: SRC_PATH_CSS,
  }),
  entrypointHashmanifest({
    manifestName: path.join(HASH_PATH, 'hashes_critical.json'),
  }),
];

const plugins_additional_iife = [
  commonjs(),
  resolve(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  babel({
    exclude: 'node_modules/**',
  }),
  terser(),
  scss({
    failOnError: true,
    outputStyle: 'compressed',
    output: function (styles, styleNodes) {
      createHashedCssFile(
        DEST_PATH_CSS,
        'additional.css',
        'additional.[hash].css',
        styles
      );
    },
    watch: SRC_PATH_CSS,
  }),
  entrypointHashmanifest({
    manifestName: path.join(HASH_PATH, 'hashes_additional_iife.json'),
  }),
];

const plugins_additional_es = [
  commonjs(),
  resolve(),
  replace({
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  }),
  babel({
    exclude: 'node_modules/**',
  }),
  terser(),
  scss({
    // just here to clean the CSS import from the JS
    output: false,
  }),
  entrypointHashmanifest({
    manifestName: path.join(HASH_PATH, 'hashes_additional_es.json'),
  }),
];

export default [
  {
    input: path.join(SRC_PATH_JS, 'critical.js'),
    output: {
      dir: DEST_PATH_JS,
      entryFileNames: '[name]-[format].[hash].js',
      format: 'iife',
      name: 'critical',
      sourcemap: true,
    },
    plugins: plugins_critical,
  },
  {
    input: path.join(SRC_PATH_JS, 'additional.js'),
    output: {
      dir: DEST_PATH_JS,
      entryFileNames: '[name]-[format].[hash].js',
      format: 'iife',
      name: 'additional',
      sourcemap: true,
    },
    plugins: plugins_additional_iife,
  },
  {
    input: path.join(SRC_PATH_JS, 'additional.js'),
    output: {
      dir: DEST_PATH_JS,
      entryFileNames: '[name]-[format].[hash].js',
      format: 'es',
      sourcemap: true,
    },
    plugins: plugins_additional_es,
  },
  {
    input: path.join(config.dir.src, 'service-worker.js'),
    plugins: [
      resolve(),
      replace({
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      }),
      babel({
        presets: [
          [
            '@babel/preset-env',
            {
              targets: {
                browsers: ['chrome >= 71'],
              },
              modules: false,
            },
          ],
        ],
      }),
      terser(),
    ],
    output: {
      file: path.join(config.dir.dist, 'service-worker.js'),
      format: 'iife',
    },
  },
];
