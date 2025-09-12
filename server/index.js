require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const Twilio = require('twilio');

const app = express();

// Compresión gzip para reducir el tamaño de las respuestas
app.use(compression());

// Cache headers para respuestas estáticas
app.use((req, res, next) => {
  // Cache por 1 hora para configuración
  if (req.path === '/v1/config') {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  // Cache por 5 minutos para endpoints de datos
  if (req.path.includes('/whatsapp/')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});

app.use(cors({
  origin: [
    'https://jeffbozu.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Límite reducido para WhatsApp

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886');

const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
  ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

function toE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+34${digits}`; // por defecto ES
}

// Cache de traducciones para evitar recrear objetos
const translations = {
  es: {
    title: '🎫 *Ticket de Estacionamiento*',
    plate: '🚙 Matrícula',
    zone: '📍 Zona',
    start: '🕐 Inicio',
    end: '🕙 Fin',
    duration: '⏱️ Duración',
    method: '💳 Pago',
    price: '💰 Importe',
    discount: '🏷️ Descuento',
    thanks: '✅ Gracias por su compra.'
  },
  ca: {
    title: '🎫 *Tiquet d\'Estacionament*',
    plate: '🚙 Matrícula',
    zone: '📍 Zona',
    start: '🕐 Inici',
    end: '🕙 Fi',
    duration: '⏱️ Durada',
    method: '💳 Pagament',
    price: '💰 Import',
    discount: '🏷️ Descompte',
    thanks: '✅ Gràcies per la seva compra.'
  },
  en: {
    title: '🎫 *Parking Ticket*',
    plate: '🚙 Plate',
    zone: '📍 Zone',
    start: '🕐 Start',
    end: '🕙 End',
    duration: '⏱️ Duration',
    method: '💳 Payment',
    price: '💰 Amount',
    discount: '🏷️ Discount',
    thanks: '✅ Thank you for your purchase.'
  }
};

function formatMessage(ticket = {}, locale = 'es') {
  const lines = [];
  const t = translations[locale] || translations.es;
  
  // Función para mapear zona
  function getZoneName(zone, loc) {
    if (zone === 'moto') return 'moto';
    if (zone === 'coche') return 'coche';
    if (zone === 'camion') return 'camión';
    if (zone === 'green') return 'verde';
    if (zone === 'blue') return 'azul';
    return zone;
  }
  
  lines.push(t.title);
  lines.push('');
  if (ticket.plate) lines.push(`${t.plate}: *${ticket.plate}*`);
  if (ticket.zone) lines.push(`${t.zone}: ${getZoneName(ticket.zone, locale)}`);
  if (ticket.start) lines.push(`${t.start}: ${ticket.start}`);
  if (ticket.end) lines.push(`${t.end}: ${ticket.end}`);
  if (ticket.duration) lines.push(`${t.duration}: ${ticket.duration}`);
  if (ticket.method) lines.push(`${t.method}: ${ticket.method}`);
  if (typeof ticket.price === 'number') {
    const priceFormatted = (locale === 'es' || locale === 'ca') 
      ? ticket.price.toFixed(2).replace('.', ',')
      : ticket.price.toFixed(2);
    lines.push(`${t.price}: ${priceFormatted} €`);
  }
  if (typeof ticket.discount === 'number' && ticket.discount > 0) {
    const discountFormatted = (locale === 'es' || locale === 'ca') 
      ? ticket.discount.toFixed(2).replace('.', ',')
      : ticket.discount.toFixed(2);
    lines.push(`${t.discount}: -${discountFormatted} €`);
  }
  // QR data removed as requested
  lines.push('');
  lines.push(t.thanks);
  return lines.join('\n');
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/whatsapp/send', async (req, res) => {
  try {
    if (!client) return res.status(500).json({ ok: false, error: 'Twilio no configurado' });
    const { phone, message, ticket, locale = 'es', localeCode } = req.body || {};
    const actualLocale = localeCode || locale;
    const to = toE164(phone);
    if (!to) return res.status(400).json({ ok: false, error: 'Teléfono inválido' });
    
    // Extraer idioma del locale (es_ES -> es, ca_ES -> ca, en_US -> en)
    const lang = actualLocale.split('_')[0] || 'es';
    const body = message || formatMessage(ticket || {}, lang);
    
    console.log(`📱 WhatsApp - Enviando mensaje en idioma: ${lang}`);
    console.log(`📱 WhatsApp - Locale recibido: ${actualLocale}`);
    console.log(`📱 WhatsApp - Contenido: ${body.substring(0, 100)}...`);
    
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body,
    });
    res.json({ ok: true, sid: result.sid, status: result.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 WhatsApp server on :${PORT} - Language fix v3 deployed - Timezone fix applied`));

