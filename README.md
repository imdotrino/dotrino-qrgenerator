# QR Generator — Dotrino

> **Parte del ecosistema [Dotrino](https://dotrino.com).** Misión: aplicaciones que resuelven problemas comunes, respetando tu privacidad — sin anuncios, sin cookies, sin rastreo de datos, sin vender tu identidad a nadie.

Generador de códigos QR (`qrgenerator.dotrino.com`): crea un QR a partir de un
**enlace, texto, red Wi-Fi, contacto (vCard), correo, teléfono, SMS o ubicación**,
ajusta el color y el nivel de corrección de errores, y descárgalo en **PNG o SVG**
o cópialo al portapapeles.

**100% en el navegador**: el QR se genera localmente con `qrcode-generator` y se
dibuja en un canvas/SVG en tu dispositivo. Nada de lo que escribes se sube a ningún
servidor. App hermana del [QR Reader](https://qrreader.dotrino.com).

Sin anuncios, sin cookies, sin rastreo. Vite (sin framework) + PWA. Bilingüe es/en.
La barra superior es la estándar del ecosistema (`@dotrino/topbar`): marca, volver,
idioma, botón de perfil (identidad del vault `id.dotrino.com`) y moneda de soporte.

## Desarrollo

```sh
npm install
npm run dev
npm run build
```
