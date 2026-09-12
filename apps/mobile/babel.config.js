// Babel del móvil. NativeWind necesita:
//  - jsxImportSource: "nativewind"  -> para entender className en componentes RN.
//  - el preset "nativewind/babel"   -> transforma las clases a estilos.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
