const express = require('express');
const cors = require('cors');
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3002;

// Compresión gzip para reducir el tamaño de las respuestas
app.use(compression());

// Cache headers para respuestas estáticas
app.use((req, res, next) => {
  if (req.path.includes('/v1/whatsapp/')) {
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

app.use(express.json({ limit: '1mb' }));

// Traducciones
const translations = {
  es: {
    title: '🎫 Ticket de Estacionamiento',
    plate: '🚙 Matrícula',
    zone: '📍 Zona',
    start: '🕐 Inicio',
    end: '🕙 Fin',
    duration: '⏱ Duración',
    payment: '💳 Pago',
    amount: '💰 Importe',
    thanks: '✅ Gracias por su compra.'
  },
  ca: {
    title: '🎫 Tiquet d\'Aparcament',
    plate: '🚙 Matrícula',
    zone: '📍 Zona',
    start: '🕐 Inici',
    end: '🕙 Fi',
    duration: '⏱ Durada',
    payment: '💳 Pagament',
    amount: '💰 Import',
    thanks: '✅ Gràcies per la seva compra.'
  },
  en: {
    title: '🎫 Parking Ticket',
    plate: '🚙 Plate',
    zone: '📍 Zone',
    start: '🕐 Start',
    end: '🕙 End',
    duration: '⏱ Duration',
    payment: '💳 Payment',
    amount: '💰 Amount',
    thanks: '✅ Thank you for your purchase.'
  }
};

// Función para formatear precio según locale
function formatPrice(priceInCents, locale) {
  const price = (priceInCents / 100).toFixed(2);
  if (locale === 'es' || locale === 'ca') {
    return price.replace('.', ',') + ' €';
  }
  return price + ' €';
}

// Función para formatear mensaje de WhatsApp
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
  if (ticket.startTime) lines.push(`${t.start}: ${ticket.startTime}`);
  if (ticket.endTime) lines.push(`${t.end}: ${ticket.endTime}`);
  if (ticket.duration) lines.push(`${t.duration}: ${ticket.duration}`);
  if (ticket.paymentMethod) lines.push(`${t.payment}: ${ticket.paymentMethod}`);
  if (ticket.amount) lines.push(`${t.amount}: ${formatPrice(ticket.amount, locale)}`);
  lines.push('');
  lines.push(t.thanks);

  return lines.join('\n');
}

// Endpoint para enviar WhatsApp
app.post('/v1/whatsapp/send', (req, res) => {
  try {
    const { ticket, locale = 'es' } = req.body;
    
    if (!ticket) {
      return res.status(400).json({ 
        success: false, 
        error: 'Ticket data is required' 
      });
    }

    // Simular envío de WhatsApp
    const message = formatMessage(ticket, locale);
    
    // En un entorno real, aquí se enviaría el mensaje via Twilio o similar
    console.log('WhatsApp message:', message);
    
    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      formattedMessage: message
    });
    
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'WhatsApp Service' });
});

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`✅ WhatsApp Service corriendo en http://localhost:${PORT}`);
});
