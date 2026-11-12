/**
 * Bloque 8.9 — configuración dinámica de Expo.
 *
 * Toma todo de app.json y solo agrega la ruta de `google-services.json`
 * (la "ficha" de la app ante Firebase, necesaria para las notificaciones push
 * en Android).
 *
 * Ese archivo NO se sube a git (está en .gitignore): trae las claves del
 * proyecto de Firebase. Por eso:
 *  - En tu PC se usa la copia local `./google-services.json`.
 *  - En los servidores de EAS (donde se compila) git no la lleva, así que se
 *    sube aparte como variable de entorno de tipo archivo, GOOGLE_SERVICES_JSON
 *    (`eas env:create`), y aquí se lee su ruta.
 */
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
