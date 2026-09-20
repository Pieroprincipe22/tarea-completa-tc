// Config estándar de Expo + soporte de .wasm para que expo-sqlite (que en
// web usa wa-sqlite, compilado a WebAssembly) pueda bundlear en el target
// web. En Android/iOS reales expo-sqlite usa el motor SQLite nativo y esto
// no hace falta — es solo para poder previsualizar la app en el navegador.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('wasm');

module.exports = config;
