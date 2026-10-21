import { defineConfig, globalIgnores } from 'eslint/config';
import expoConfig from 'eslint-config-expo/flat';

export default defineConfig([
  globalIgnores(['dist/*', 'node_modules/*']),
  expoConfig,
]);
