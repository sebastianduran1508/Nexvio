// Configuración de Metro para funcionar dentro del monorepo pnpm.
// Le decimos a Metro que además de la carpeta de la app (apps/mobile),
// vigile la raíz del monorepo y busque dependencias en ambos node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Vigilar también la raíz del monorepo (para paquetes compartidos, etc.)
config.watchFolders = [monorepoRoot];

// 2. Buscar dependencias primero en la app y luego en la raíz.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Seguir enlaces simbólicos: pnpm guarda las dependencias como symlinks,
//    así que Metro debe poder seguirlos para encontrar piezas como expo-modules-core.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
