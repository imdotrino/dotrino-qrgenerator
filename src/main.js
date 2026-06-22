/**
 * QR Generator — generador de QR del ecosistema Dotrino.
 * Crea un código QR a partir de un enlace, texto, red Wi-Fi, contacto (vCard),
 * correo, teléfono, SMS o ubicación, con color y nivel de corrección ajustables,
 * y permite descargarlo en PNG o SVG o copiarlo. 100% en el navegador: nada se
 * sube a ningún servidor.
 */
import qrcode from 'qrcode-generator'
import { registerSW } from 'virtual:pwa-register'
import '@dotrino/support'
import '@dotrino/install'
import './style.css'

// UTF-8 para que acentos/ñ en texto o contraseñas Wi-Fi se codifiquen bien.
try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'] } catch { /* fallback ISO-8859-1 */ }

// Recarga cuando el SW nuevo toma control + re-chequeo periódico (CONVENCIONES §3).
const updateSW = registerSW({ immediate: true })
setInterval(() => updateSW(), 30 * 60 * 1000)

/* ---------------- i18n ---------------- */
const I18N = {
  es: {
    tagline: 'Crea un código QR y descárgalo. Elige qué guardar dentro.',
    types: { text: 'Texto / enlace', wifi: 'Wi-Fi', email: 'Correo', tel: 'Teléfono', sms: 'SMS', geo: 'Ubicación', vcard: 'Contacto' },
    f: {
      text: 'Texto o enlace', ssid: 'Nombre de la red (SSID)', pass: 'Contraseña', enc: 'Seguridad', hidden: 'Red oculta',
      to: 'Destinatario', subject: 'Asunto', body: 'Mensaje', phone: 'Número de teléfono', message: 'Mensaje',
      lat: 'Latitud', lng: 'Longitud', name: 'Nombre', org: 'Organización', email: 'Correo', url: 'Sitio web',
    },
    placeholder: { text: 'https://dotrino.com  o cualquier texto' },
    opts: 'Opciones', color: 'Color', bg: 'Fondo', ecc: 'Corrección de errores',
    eccNote: 'Más corrección = QR más denso pero más tolerante a daños.',
    downloadPng: 'Descargar PNG', downloadSvg: 'Descargar SVG', copy: 'Copiar imagen', copied: 'Copiada', print: 'Imprimir',
    empty: 'Escribe algo para generar el QR.',
    privacy: 'Todo ocurre en tu navegador. Nada se sube a ningún servidor.',
    yes: 'Sí', no: 'No',
  },
  en: {
    tagline: 'Create a QR code and download it. Pick what goes inside.',
    types: { text: 'Text / link', wifi: 'Wi-Fi', email: 'Email', tel: 'Phone', sms: 'SMS', geo: 'Location', vcard: 'Contact' },
    f: {
      text: 'Text or link', ssid: 'Network name (SSID)', pass: 'Password', enc: 'Security', hidden: 'Hidden network',
      to: 'Recipient', subject: 'Subject', body: 'Message', phone: 'Phone number', message: 'Message',
      lat: 'Latitude', lng: 'Longitude', name: 'Name', org: 'Organization', email: 'Email', url: 'Website',
    },
    placeholder: { text: 'https://dotrino.com  or any text' },
    opts: 'Options', color: 'Color', bg: 'Background', ecc: 'Error correction',
    eccNote: 'Higher correction = denser QR but more damage-tolerant.',
    downloadPng: 'Download PNG', downloadSvg: 'Download SVG', copy: 'Copy image', copied: 'Copied', print: 'Print',
    empty: 'Type something to generate the QR.',
    privacy: 'Everything happens in your browser. Nothing is uploaded to any server.',
    yes: 'Yes', no: 'No',
  },
}
const LANG_KEY = 'qrgen.lang'
let lang = (localStorage.getItem(LANG_KEY) || (navigator.language || 'es').slice(0, 2)) === 'en' ? 'en' : 'es'
const t = () => I18N[lang]

/* ---------------- estado ---------------- */
const TYPES = ['text', 'wifi', 'email', 'tel', 'sms', 'geo', 'vcard']
const state = { type: 'text', ecc: 'M', fg: '#101417', bg: '#ffffff', text: '' }
let lastMatrix = null

/* ---------------- construcción del payload ---------------- */
const v = (id) => (document.getElementById(id)?.value || '').trim()
const wifiEsc = (s) => s.replace(/([\\;,:"])/g, '\\$1')
function buildPayload () {
  switch (state.type) {
    case 'text': return v('f_text')
    case 'wifi': {
      const ssid = v('f_ssid'); if (!ssid) return ''
      const enc = v('f_enc') || 'WPA'
      const pass = v('f_pass')
      const hidden = document.getElementById('f_hidden')?.checked ? 'true' : 'false'
      return `WIFI:T:${enc};S:${wifiEsc(ssid)};${enc === 'nopass' ? '' : 'P:' + wifiEsc(pass) + ';'}H:${hidden};;`
    }
    case 'email': {
      const to = v('f_to'); if (!to) return ''
      const q = []
      if (v('f_subject')) q.push('subject=' + encodeURIComponent(v('f_subject')))
      if (v('f_body')) q.push('body=' + encodeURIComponent(v('f_body')))
      return 'mailto:' + to + (q.length ? '?' + q.join('&') : '')
    }
    case 'tel': { const n = v('f_phone'); return n ? 'tel:' + n.replace(/\s+/g, '') : '' }
    case 'sms': { const n = v('f_phone'); if (!n) return ''; const m = v('f_message'); return `SMSTO:${n.replace(/\s+/g, '')}:${m}` }
    case 'geo': { const la = v('f_lat'), lo = v('f_lng'); return (la && lo) ? `geo:${la},${lo}` : '' }
    case 'vcard': {
      const name = v('f_name'); if (!name && !v('f_phone') && !v('f_email')) return ''
      const lines = ['BEGIN:VCARD', 'VERSION:3.0']
      if (name) { lines.push('N:' + name + ';;;'); lines.push('FN:' + name) }
      if (v('f_org')) lines.push('ORG:' + v('f_org'))
      if (v('f_phone')) lines.push('TEL;TYPE=CELL:' + v('f_phone'))
      if (v('f_email')) lines.push('EMAIL:' + v('f_email'))
      if (v('f_url')) lines.push('URL:' + v('f_url'))
      lines.push('END:VCARD')
      return lines.join('\n')
    }
    default: return ''
  }
}

/* ---------------- matriz + dibujo ---------------- */
function buildMatrix (text, ecc) {
  const qr = qrcode(0, ecc)
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const m = []
  for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(qr.isDark(r, c)); m.push(row) }
  return m
}
const MARGIN = 4
function drawCanvas (canvas, matrix, scale) {
  const n = matrix.length, size = (n + MARGIN * 2) * scale
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = state.bg; ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = state.fg
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c]) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale)
}
function buildSVG (matrix) {
  const n = matrix.length, dim = n + MARGIN * 2
  let rects = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (matrix[r][c]) rects += `<rect x="${c + MARGIN}" y="${r + MARGIN}" width="1" height="1"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="${state.bg}"/><g fill="${state.fg}">${rects}</g></svg>`
}

/* ---------------- UI ---------------- */
const app = document.getElementById('app')

function fieldsFor (type) {
  const _ = t().f
  const inp = (id, label, attrs = '') => `<label class="field"><span>${label}</span><input id="${id}" ${attrs} /></label>`
  const ta = (id, label, ph = '') => `<label class="field"><span>${label}</span><textarea id="${id}" rows="3" placeholder="${escAttr(ph)}"></textarea></label>`
  switch (type) {
    case 'text': return ta('f_text', _.text, t().placeholder.text)
    case 'wifi': return `
      ${inp('f_ssid', _.ssid, 'autocomplete="off"')}
      ${inp('f_pass', _.pass, 'autocomplete="off"')}
      <label class="field"><span>${_.enc}</span><select id="f_enc"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">${lang === 'es' ? 'Sin contraseña' : 'No password'}</option></select></label>
      <label class="check"><input type="checkbox" id="f_hidden" /> <span>${_.hidden}</span></label>`
    case 'email': return `${inp('f_to', _.to, 'type="email" inputmode="email"')}${inp('f_subject', _.subject)}${ta('f_body', _.body)}`
    case 'tel': return inp('f_phone', _.phone, 'type="tel" inputmode="tel"')
    case 'sms': return `${inp('f_phone', _.phone, 'type="tel" inputmode="tel"')}${ta('f_message', _.message)}`
    case 'geo': return `<div class="row2">${inp('f_lat', _.lat, 'inputmode="decimal"')}${inp('f_lng', _.lng, 'inputmode="decimal"')}</div>`
    case 'vcard': return `${inp('f_name', _.name)}${inp('f_org', _.org)}${inp('f_phone', _.phone, 'type="tel" inputmode="tel"')}${inp('f_email', _.email, 'type="email"')}${inp('f_url', _.url, 'inputmode="url"')}`
    default: return ''
  }
}

function render () {
  const _ = t()
  app.innerHTML = `
    <header class="topbar">
      <div class="brand"><img src="/icon.svg" alt="" width="30" height="30" /><span>QR Generator</span></div>
      <div class="actions">
        <div class="lang" role="group" aria-label="es / en">
          <button data-lang="es" class="${lang === 'es' ? 'on' : ''}">ES</button>
          <button data-lang="en" class="${lang === 'en' ? 'on' : ''}">EN</button>
        </div>
        <dotrino-install lang="${lang}"></dotrino-install>
        <dotrino-support href="https://ko-fi.com/dotrino" repo="imdotrino/dotrino-qrgenerator" discord="https://discord.gg/D648uq7cth" lang="${lang}"></dotrino-support>
      </div>
    </header>

    <main class="wrap">
      <h1 class="tagline">${_.tagline}</h1>

      <div class="layout">
        <div class="card form-card">
          <div class="types" role="tablist">
            ${TYPES.map((ty) => `<button class="type ${state.type === ty ? 'on' : ''}" data-type="${ty}" role="tab" aria-selected="${state.type === ty}">${_.types[ty]}</button>`).join('')}
          </div>
          <div class="fields" id="fields">${fieldsFor(state.type)}</div>
          <details class="opts">
            <summary>${_.opts}</summary>
            <div class="opts-body">
              <div class="row2">
                <label class="field color"><span>${_.color}</span><input type="color" id="o_fg" value="${state.fg}" /></label>
                <label class="field color"><span>${_.bg}</span><input type="color" id="o_bg" value="${state.bg}" /></label>
              </div>
              <label class="field"><span>${_.ecc}</span>
                <select id="o_ecc">
                  ${['L', 'M', 'Q', 'H'].map((l) => `<option value="${l}" ${state.ecc === l ? 'selected' : ''}>${l}</option>`).join('')}
                </select>
              </label>
              <p class="hint">${_.eccNote}</p>
            </div>
          </details>
        </div>

        <div class="card preview-card">
          <div class="qr-box" id="qrBox"><canvas id="qr"></canvas><p class="empty" id="empty">${_.empty}</p></div>
          <div class="btn-row">
            <button class="btn btn-primary" data-act="png" disabled>${dlIcon()} ${_.downloadPng}</button>
            <button class="btn btn-ghost" data-act="svg" disabled>${dlIcon()} ${_.downloadSvg}</button>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost" data-act="copy" disabled>${copyIcon()} ${_.copy}</button>
            <button class="btn btn-ghost" data-act="print" disabled>${printIcon()} ${_.print}</button>
          </div>
        </div>
      </div>

      <p class="privacy">${_.privacy}</p>
    </main>
  `
  wire()
  update()
}

/* ---------------- cableado ---------------- */
function wire () {
  app.querySelectorAll('[data-lang]').forEach((b) =>
    b.addEventListener('click', () => { lang = b.dataset.lang; localStorage.setItem(LANG_KEY, lang); document.documentElement.lang = lang; render() }))

  app.querySelectorAll('[data-type]').forEach((b) =>
    b.addEventListener('click', () => { state.type = b.dataset.type; render() }))

  app.querySelector('#fields').addEventListener('input', update)

  const fg = app.querySelector('#o_fg'), bg = app.querySelector('#o_bg'), ecc = app.querySelector('#o_ecc')
  fg.addEventListener('input', () => { state.fg = fg.value; update() })
  bg.addEventListener('input', () => { state.bg = bg.value; update() })
  ecc.addEventListener('change', () => { state.ecc = ecc.value; update() })

  app.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', () => {
    const act = el.dataset.act
    if (act === 'png') downloadPng()
    else if (act === 'svg') downloadSvg()
    else if (act === 'copy') copyImage(el)
    else if (act === 'print') printQr()
  }))
}

function update () {
  const text = buildPayload()
  state.text = text
  const canvas = app.querySelector('#qr')
  const empty = app.querySelector('#empty')
  const actions = app.querySelectorAll('[data-act]')
  if (!text) {
    lastMatrix = null
    canvas.style.display = 'none'; empty.style.display = 'block'
    actions.forEach((b) => { b.disabled = true })
    return
  }
  try {
    lastMatrix = buildMatrix(text, state.ecc)
    const scale = Math.max(3, Math.floor(280 / (lastMatrix.length + MARGIN * 2)))
    drawCanvas(canvas, lastMatrix, scale)
    canvas.style.display = 'block'; empty.style.display = 'none'
    actions.forEach((b) => { b.disabled = false })
  } catch {
    lastMatrix = null
    canvas.style.display = 'none'; empty.style.display = 'block'
    empty.textContent = lang === 'es' ? 'El contenido es demasiado largo para un QR.' : 'Content is too long for a QR.'
    actions.forEach((b) => { b.disabled = true })
  }
}

/* ---------------- exportar ---------------- */
function pngCanvas () {
  const tmp = document.createElement('canvas')
  const scale = Math.max(4, Math.ceil(1024 / (lastMatrix.length + MARGIN * 2)))
  drawCanvas(tmp, lastMatrix, scale)
  return tmp
}
function triggerDownload (href, name) {
  const a = document.createElement('a'); a.href = href; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
}
function downloadPng () {
  if (!lastMatrix) return
  triggerDownload(pngCanvas().toDataURL('image/png'), 'qr.png')
}
function downloadSvg () {
  if (!lastMatrix) return
  const blob = new Blob([buildSVG(lastMatrix)], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, 'qr.svg')
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function copyImage (btn) {
  if (!lastMatrix || !navigator.clipboard?.write) return
  pngCanvas().toBlob((blob) => {
    if (!blob) return
    navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => {
      const old = btn.innerHTML
      btn.innerHTML = copyIcon() + ' ' + t().copied
      setTimeout(() => { btn.innerHTML = old }, 1500)
    }).catch(() => {})
  }, 'image/png')
}
function printQr () {
  if (!lastMatrix) return
  const data = pngCanvas().toDataURL('image/png')
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(`<html><head><title>QR</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}img{max-width:90vmin;image-rendering:pixelated}</style></head><body><img src="${data}" onload="setTimeout(function(){window.print();window.close()},150)"/></body></html>`)
  w.document.close()
}

/* ---------------- helpers / iconos ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => esc(s).replace(/"/g, '&quot;')
const dlIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>'
const copyIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const printIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>'

document.documentElement.lang = lang
render()
