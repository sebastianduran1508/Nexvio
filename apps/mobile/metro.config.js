// Configuración de Metro: monorepo pnpm + NativeWind.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// --- Monorepo pnpm (igual que antes) ---
// 1. Vigilar también la raíz del monorepo (paquetes compartidos, etc.)
config.watchFolders = [monorepoRoot];
// 2. Buscar dependencias primero en la app y luego en la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
// 3. Seguir symlinks (pnpm guarda las dependencias como symlinks).
config.resolver.unstable_enableSymlinks = true;

// --- NativeWind ---
// Procesa global.css (nuestros tokens) y habilita className en la app.
module.exports = withNativeWind(config, { input: './global.css' });
