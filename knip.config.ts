import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['src/main.ts'],
  project: ['src/**/*.ts'],
  ignore: ['dist/**', 'node_modules/**'],
};

export default config;
