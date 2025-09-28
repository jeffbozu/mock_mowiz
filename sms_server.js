const express = require('express');
const cors = require('cors');
const compression = require('compression');
const twilio = require('twilio');
const app = express();
const PORT = process.env.PORT || 3003;

// Compresión gzip para reducir el tamaño de las respuestas
app.use(compression());

// Cache headers para respuestas estáticas
app.use((req, res, next) => {
  if (req.path.includes('/v1/sms/')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  next();
});

app.use(cors({
  origin: [
    'https://jeffbozu.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:9001',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:9001'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Configurar Twilio para SMS
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioSmsNumber = process.env.TWILIO_SMS_NUMBER || '+14155238886';

let twilioClient = null;
if (!twilioAccountSid || !twilioAuthToken) {
  console.error('❌ TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configurados');
} else {
  twilioClient = new Twilio(twilioAccountSid, twilioAuthToken);
  console.log('✅ Twilio configurado correctamente para SMS');
  console.log(`   SMS Number: ${twilioSmsNumber}`);
}

// Función para validar número de teléfono
function validatePhoneNumber(phone) {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phone);
}

// Función para formatear mensaje SMS
function formatSMSMessage(ticket, locale = 'es') {
  const translations = {
    es: {
      title: '🎫 Ticket de Estacionamiento',
      plate: 'Matrícula',
      zone: 'Zona',
      start: 'Inicio',
      end: 'Fin',
      duration: 'Duración',
      method: 'Pago',
      price: 'Importe',
      thanks: 'Gracias por su compra',
      footer: 'Meypark - Sistema de Gestión de Aparcamiento'
    },
    ca: {
      title: '🎫 Tiquet d\'Aparcament',
      plate: 'Matrícula',
      zone: 'Zona',
      start: 'Inici',
      end: 'Fi',
      duration: 'Durada',
      method: 'Pagament',
      price: 'Import',
      thanks: 'Gràcies per la seva compra',
      footer: 'Meypark - Sistema de Gestió d\'Aparcament'
    },
    en: {
      title: '🎫 Parking Ticket',
      plate: 'Plate',
      zone: 'Zone',
      start: 'Start',
      end: 'End',
      duration: 'Duration',
      method: 'Payment',
      price: 'Amount',
      thanks: 'Thank you for your purchase',
      footer: 'Meypark - Parking Management System'
    }
  };

  const t = translations[locale] || translations.es;
  
  // Mapear zona
  const zoneMap = {
    'coche': locale === 'ca' ? 'Zona Cotxe' : locale === 'en' ? 'Car Zone' : 'Zona Coche',
    'moto': locale === 'ca' ? 'Zona Moto' : locale === 'en' ? 'Motorcycle Zone' : 'Zona Moto',
    'camion': locale === 'ca' ? 'Zona Camió' : locale === 'en' ? 'Truck Zone' : 'Zona Camión',
    'green': locale === 'ca' ? 'Zona Verda' : locale === 'en' ? 'Green Zone' : 'Zona Verde',
    'blue': locale === 'ca' ? 'Zona Blava' : locale === 'en' ? 'Blue Zone' : 'Zona Azul'
  };

  // Mapear método de pago
  const methodMap = {
    'qr': 'QR',
    'card': locale === 'ca' ? 'Targeta' : locale === 'en' ? 'Card' : 'Tarjeta',
    'cash': locale === 'ca' ? 'Efectiu' : locale === 'en' ? 'Cash' : 'Efectivo',
    'mobile': locale === 'ca' ? 'Mòbil' : locale === 'en' ? 'Mobile' : 'Móvil',
    'bizum': 'Bizum'
  };

  const zoneName = zoneMap[ticket.zone] || ticket.zone;
  const methodName = methodMap[ticket.method] || ticket.method;

  let message = `${t.title}\n\n`;
  message += `🚙 ${t.plate}: ${ticket.plate}\n`;
  message += `📍 ${t.zone}: ${zoneName}\n`;
  message += `🕐 ${t.start}: ${ticket.start}\n`;
  message += `🕙 ${t.end}: ${ticket.end}\n`;
  message += `⏱ ${t.duration}: ${ticket.duration}\n`;
  message += `💳 ${t.method}: ${methodName}\n`;
  message += `💰 ${t.price}: ${ticket.price}€\n\n`;
  message += `✅ ${t.thanks}\n\n`;
  message += `📱 ${t.footer}`;

  return message;
}

// Endpoint para enviar SMS
app.post('/v1/sms/send', async (req, res) => {
  try {
    const { phone, ticket, locale = 'es' } = req.body;
    
    console.log('📱 Solicitud de SMS recibida:', {
      phone: phone ? phone.substring(0, 5) + '***' : 'undefined',
      hasTicket: !!ticket,
      locale
    });
    
    // Validaciones
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

    if (!twilioClient) {
      return res.status(500).json({
        success: false,
        error: 'Twilio not configured',
        code: 'TWILIO_NOT_CONFIGURED'
      });
    }

    // Formatear mensaje
    const formattedMessage = formatSMSMessage(ticket, locale);
    
    console.log('📱 Enviando SMS:', {
      to: phone,
      from: twilioSmsNumber,
      messageLength: formattedMessage.length
    });

    // Enviar SMS
    const result = await twilioClient.messages.create({
      body: formattedMessage,
      from: twilioSmsNumber,
      to: phone
    });

    console.log('✅ SMS enviado exitosamente:', result.sid);

    res.json({
      success: true,
      message: 'SMS sent successfully',
      messageId: result.sid,
      status: result.status,
      formattedMessage: formattedMessage,
      to: phone
    });

  } catch (error) {
    console.error('❌ Error enviando SMS:', error);
    
    let errorMessage = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';
    
    if (error.code === 21211) {
      errorMessage = 'Invalid phone number';
      errorCode = 'INVALID_PHONE';
    } else if (error.code === 21614) {
      errorMessage = 'Phone number is not a valid mobile number';
      errorCode = 'NOT_MOBILE';
    } else if (error.code === 21610) {
      errorMessage = 'Phone number is not verified for trial account';
      errorCode = 'NOT_VERIFIED';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: error.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SMS Service',
    twilioConfigured: twilioClient ? 'configured' : 'not configured',
    smsFrom: twilioSmsNumber,
    timestamp: new Date().toISOString()
  });
});

// Información del servicio
app.get('/', (req, res) => {
  res.json({
    name: 'Meypark SMS Service',
    version: '1.0.0',
    description: 'Servidor de SMS para KioskApp - Usando Twilio',
    endpoints: {
      'POST /v1/sms/send': 'Enviar SMS con ticket',
      'GET /health': 'Estado del servidor',
      'GET /': 'Información del servidor'
    }
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'POST /v1/sms/send',
      'GET /health',
      'GET /'
    ]
  });
});

// Manejo de errores globales
app.use((error, req, res, next) => {
  console.error('❌ Error global:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SMS Server iniciado en puerto ${PORT}`);
  console.log(`📱 SMS endpoint: /v1/sms/send`);
  console.log(`🔗 Servidor accesible en: http://localhost:${PORT}`);
});
