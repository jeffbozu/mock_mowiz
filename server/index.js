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

// Validar configuración de Twilio
const isTwilioConfigured = () => {
  return process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
};

// Número de WhatsApp configurable
const getWhatsAppFromNumber = () => {
  return process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
};

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

// Función para validar número de teléfono
const validatePhoneNumber = (phone) => {
  // Remover espacios y caracteres especiales
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Validar formato internacional
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(cleanPhone);
};

// Función para formatear número de teléfono
const formatPhoneNumber = (phone) => {
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // Si no tiene prefijo internacional, agregar +34 (España)
  if (!cleanPhone.startsWith('+')) {
    if (cleanPhone.startsWith('34')) {
      cleanPhone = '+' + cleanPhone;
    } else if (cleanPhone.startsWith('6') || cleanPhone.startsWith('7')) {
      cleanPhone = '+34' + cleanPhone;
    } else {
      cleanPhone = '+34' + cleanPhone;
    }
  }
  
  return cleanPhone;
};

// Endpoint para enviar WhatsApp
app.post('/v1/whatsapp/send', async (req, res) => {
  try {
    const { phone, ticket, locale = 'es' } = req.body;
    
    console.log('📱 Solicitud de WhatsApp recibida:', {
      phone: phone ? phone.substring(0, 5) + '***' : 'undefined',
      hasTicket: !!ticket,
      locale
    });
    
    // Validaciones mejoradas
    if (!ticket || !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and ticket data are required',
        code: 'MISSING_DATA'
      });
    }

    // Validar número de teléfono
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        code: 'INVALID_PHONE'
      });
    }

    // Formatear número de teléfono
    const formattedPhone = formatPhoneNumber(phone);
    const whatsappPhone = `whatsapp:${formattedPhone}`;
    
    // Formatear mensaje
    const message = formatMessage(ticket, locale);
    
    console.log('📱 Enviando WhatsApp a:', whatsappPhone);
    console.log('📱 Mensaje formateado:', message.substring(0, 100) + '...');
    
    // Verificar si Twilio está configurado
    if (!isTwilioConfigured()) {
      console.warn('⚠️ Twilio no configurado, usando simulación');
      return res.json({
        success: true,
        message: 'WhatsApp message sent successfully (simulated - Twilio not configured)',
        messageId: 'simulated_' + Date.now(),
        status: 'simulated',
        formattedMessage: message,
        warning: 'Twilio credentials not configured'
      });
    }
    
    // Enviar mensaje real con Twilio
    try {
      const twilioMessage = await client.messages.create({
        from: getWhatsAppFromNumber(),
        to: whatsappPhone,
        body: message
      });
      
      console.log('✅ WhatsApp enviado exitosamente:', {
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        to: whatsappPhone
      });
      
      res.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        messageId: twilioMessage.sid,
        status: twilioMessage.status,
        formattedMessage: message,
        to: whatsappPhone
      });
    } catch (twilioError) {
      console.error('❌ Error de Twilio:', {
        code: twilioError.code,
        message: twilioError.message,
        status: twilioError.status,
        moreInfo: twilioError.moreInfo
      });
      
      // Manejar errores específicos de Twilio
      let errorMessage = 'Error sending WhatsApp message';
      let errorCode = 'TWILIO_ERROR';
      
      if (twilioError.code === 21211) {
        errorMessage = 'Invalid phone number format';
        errorCode = 'INVALID_PHONE';
      } else if (twilioError.code === 21610) {
        errorMessage = 'Phone number is not a valid WhatsApp number';
        errorCode = 'NOT_WHATSAPP_NUMBER';
      } else if (twilioError.code === 63007) {
        errorMessage = 'WhatsApp number is not available';
        errorCode = 'WHATSAPP_UNAVAILABLE';
      }
      
      // Fallback a simulación solo para ciertos errores
      if (twilioError.code === 63007 || twilioError.code === 21610) {
        console.log('⚠️ Fallback a simulación por error de WhatsApp');
        return res.json({
          success: true,
          message: 'WhatsApp message sent successfully (simulated - WhatsApp not available)',
          messageId: 'simulated_' + Date.now(),
          status: 'simulated',
          formattedMessage: message,
          warning: errorMessage
        });
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        details: twilioError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'WhatsApp Service',
    twilioConfigured: isTwilioConfigured(),
    whatsappFrom: getWhatsAppFromNumber(),
    timestamp: new Date().toISOString()
  });
});

// Endpoint de configuración
app.get('/v1/config', (req, res) => {
  res.json({
    service: 'WhatsApp Service',
    version: '2.0.0',
    twilioConfigured: isTwilioConfigured(),
    whatsappFrom: getWhatsAppFromNumber(),
    features: {
      phoneValidation: true,
      autoFormatting: true,
      errorHandling: true,
      fallbackSimulation: true
    },
    endpoints: {
      'POST /v1/whatsapp/send': 'Send WhatsApp message',
      'GET /health': 'Service health check',
      'GET /v1/config': 'Service configuration'
    }
  });
});

// Endpoint de prueba
app.post('/v1/whatsapp/test', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required for test'
      });
    }
    
    // Validar número
    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format',
        phone: phone
      });
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    const whatsappPhone = `whatsapp:${formattedPhone}`;
    
    res.json({
      success: true,
      message: 'Phone number validation successful',
      originalPhone: phone,
      formattedPhone: formattedPhone,
      whatsappPhone: whatsappPhone,
      twilioConfigured: isTwilioConfigured()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
});

// Arranque del servidor
app.listen(PORT, () => {
  console.log(`✅ WhatsApp Service corriendo en http://localhost:${PORT}`);
});
