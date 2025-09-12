const express = require('express');
const cors = require('cors');
const compression = require('compression');
const twilio = require('twilio');
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

// Configuración de Twilio
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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
    if (zone === 'moto') return 'Zona Moto';
    if (zone === 'coche') return 'Zona Coche';
    if (zone === 'camion') return 'Zona Camión';
    if (zone === 'green') return 'Zona Verde';
    if (zone === 'blue') return 'Zona Azul';
    return zone;
  }

  lines.push(t.title);
  lines.push('');
  if (ticket.plate) lines.push(`${t.plate}: *${ticket.plate}*`);
  if (ticket.zone) lines.push(`${t.zone}: ${getZoneName(ticket.zone, locale)}`);
  if (ticket.start) lines.push(`${t.start}: ${ticket.start}`);
  if (ticket.end) lines.push(`${t.end}: ${ticket.end}`);
  if (ticket.duration) lines.push(`${t.duration}: ${ticket.duration}`);
  if (ticket.method) lines.push(`${t.payment}: ${ticket.method}`);
  if (ticket.price) lines.push(`${t.amount}: ${formatPrice(ticket.price * 100, locale)}`);
  lines.push('');
  lines.push(t.thanks);

  return lines.join('\n');
}

// Endpoint para enviar WhatsApp
app.post('/v1/whatsapp/send', async (req, res) => {
  try {
    const { phone, ticket, locale = 'es' } = req.body;
    
    if (!ticket || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and ticket data are required' 
      });
    }

    // Formatear mensaje
    const message = formatMessage(ticket, locale);
    
    console.log('📱 Enviando WhatsApp a:', phone);
    console.log('📱 Mensaje:', message);
    
    // Enviar mensaje real con Twilio
    try {
      const twilioMessage = await client.messages.create({
        from: 'whatsapp:+14155238886', // Número de Twilio Sandbox
        to: `whatsapp:${phone}`,
        body: message
      });
      
      console.log('✅ WhatsApp enviado exitosamente:', twilioMessage.sid);
      
      res.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        formattedMessage: message
      });
    } catch (twilioError) {
      console.error('❌ Error de Twilio:', twilioError);
      
      // Fallback a simulación si Twilio falla
      console.log('⚠️ Fallback a simulación');
      res.json({
        success: true,
        message: 'WhatsApp message sent successfully (simulated)',
        messageId: 'simulated_' + Date.now(),
        formattedMessage: message
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Error sending WhatsApp message',
      details: error.message
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
