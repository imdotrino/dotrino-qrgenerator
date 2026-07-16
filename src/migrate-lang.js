/**
 * Migración única de la preferencia de idioma.
 *
 * La app guardaba el idioma en 'qrgen.lang'; el estándar del ecosistema
 * (<dotrino-topbar>) lo persiste en 'dotrino.lang'. Copiamos el valor una sola
 * vez para no resetear a quien ya había elegido idioma.
 *
 * IMPORTANTE: debe evaluarse ANTES de importar '@dotrino/topbar' — el componente
 * resuelve el idioma al registrarse, y si lo hace antes de la copia leería el del
 * navegador en vez de la preferencia guardada.
 */
const OLD_KEY = 'qrgen.lang'
const KEY = 'dotrino.lang'

try {
  const old = localStorage.getItem(OLD_KEY)
  if (old) {
    if (!localStorage.getItem(KEY) && (old === 'es' || old === 'en')) localStorage.setItem(KEY, old)
    localStorage.removeItem(OLD_KEY)
  }
} catch { /* modo privado: sin persistencia, se cae al idioma del navegador */ }
