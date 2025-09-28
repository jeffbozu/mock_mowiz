const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const sgMail = require('@sendgrid/mail');
const { getTranslations, formatDateTime, formatDuration } = require('./translations');
const { generateTicketPDF } = require('./pdf-generator');
require('dotenv').config();

// Configurar SendGrid API con validación
const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (!sendGridApiKey) {
  console.error('❌ SENDGRID_API_KEY no configurada');
} else {
  // Limpiar la API Key de caracteres inválidos
  const cleanApiKey = sendGridApiKey.replace(/[^\x20-\x7E]/g, '');
  sgMail.setApiKey(cleanApiKey);
  console.log('✅ SendGrid API Key configurada correctamente');
}

const app = express();
const PORT = process.env.PORT || 4000;

// Configurar trust proxy para Render (necesario para rate limiting)
app.set('trust proxy', 1);

// Middlewares de seguridad
app.use(helmet());

// Compresión gzip para reducir el tamaño de las respuestas
app.use(compression());

// Cache headers para respuestas estáticas
app.use((req, res, next) => {
  // Cache por 1 hora para configuración
  if (req.path === '/v1/config') {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  // Cache por 5 minutos para endpoints de datos
  if (req.path.includes('/api/')) {
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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting para prevenir spam
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 emails por IP cada 15 minutos
  message: {
    success: false,
    error: 'Demasiados intentos de envío de email. Intente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Función para generar QR como base64
const generateQRBase64 = async (qrData) => {
  try {
    const qrString = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
    const qrBuffer = await QRCode.toBuffer(qrString, {
      width: 150,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrBuffer.toString('base64');
  } catch (error) {
    console.error('Error generando QR base64:', error);
    return '';
  }
};

// Función para generar plantilla HTML del ticket multiidioma
const generateTicketHTML = async (ticketData, locale = 'es') => {
  const {
    plate,
    zone,
    start,
    end,
    price,
    method,
    customMessage,
    qrData,
    discount
  } = ticketData;
  
  // Generar QR como base64 si existe qrData
  const qrBase64 = qrData ? await generateQRBase64(qrData) : '';

  const t = getTranslations(locale);
  const zoneName = zone === 'green' ? t.zoneGreen : zone === 'blue' ? t.zoneBlue : zone === 'playa' ? t.zonePlaya : zone === 'costa' ? t.zoneCosta : zone === 'parque' ? t.zoneParque : zone;
  const methodName = t.methods[method] || method;
  const startFormatted = formatDateTime(start, locale);
  const endFormatted = formatDateTime(end, locale);
  const duration = formatDuration(start, end, locale);

  return `
<!DOCTYPE html>
<html lang="${locale.startsWith('ca') ? 'ca' : locale.startsWith('en') ? 'en' : 'es'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 15px;
            padding: 40px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #E62144;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #E62144;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #333;
        }
        .intro {
            margin-bottom: 25px;
            color: #555;
            line-height: 1.8;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #eee;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #333;
            flex: 1;
        }
        .value {
            color: #666;
            text-align: right;
            flex: 1;
        }
        .price-highlight {
            background: linear-gradient(135deg, #E62144, #ff4757);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 25px 0;
            box-shadow: 0 4px 15px rgba(230, 33, 68, 0.3);
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 10px;
        }
        .qr-image {
            max-width: 150px;
            height: auto;
            border: 3px solid #E62144;
            border-radius: 8px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .custom-message {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🎫 Meypark</div>
            <div class="subtitle">${t.subtitle}</div>
        </div>
        
        <div class="greeting">${t.greeting}</div>
        
        <div class="intro">${t.intro}</div>
        
        <h1 style="color: #E62144; text-align: center; margin-bottom: 30px;">
            🎫 ${t.title} - Meypark
        </h1>
        
        ${customMessage ? `
        <div class="custom-message">
            <strong>💬 ${t.customMessage || 'Mensaje'}:</strong><br>
            ${customMessage}
        </div>
        ` : ''}
        
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #E62144; margin-top: 0;">${t.ticketDetails}</h3>
            <div class="info-row">
                <span class="label">🚙 ${t.plate}:</span>
                <span class="value"><strong>${plate}</strong></span>
            </div>
            <div class="info-row">
                <span class="label">📍 ${t.zone}:</span>
                <span class="value">${zoneName}</span>
            </div>
            <div class="info-row">
                <span class="label">🕐 ${t.startTime}:</span>
                <span class="value">${startFormatted}</span>
            </div>
            <div class="info-row">
                <span class="label">🕙 ${t.endTime}:</span>
                <span class="value">${endFormatted}</span>
            </div>
            <div class="info-row">
                <span class="label">⏱️ ${t.duration}:</span>
                <span class="value">${duration}</span>
            </div>
            <div class="info-row">
                <span class="label">💳 ${t.paymentMethod}:</span>
                <span class="value">${methodName}</span>
            </div>
            ${discount && discount !== 0 ? `
            <div class="info-row">
                <span class="label">💰 ${t.discount}:</span>
                <span class="value" style="color: #28a745;">${locale.startsWith('es') || locale.startsWith('ca') ? discount.toFixed(2).replace('.', ',') : discount.toFixed(2)} €</span>
            </div>
            ` : ''}
        </div>
        
        <div class="price-highlight">
            💰 ${t.totalPrice}: ${locale.startsWith('es') || locale.startsWith('ca') ? price.toFixed(2).replace('.', ',') : price.toFixed(2)}€
        </div>
        
        ${qrData ? `
        <div class="qr-section" style="width: 100%; margin: 20px 0; font-family: Arial, sans-serif;">
            <h3 style="color: #333; margin-bottom: 12px; font-size: 18px;">📱 ${t.qrTitle}</h3>
            <div style="background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 20px 10px; margin: 0 auto; text-align: center; max-width: 250px;">
                <img 
                    src="cid:ticket-qr" 
                    alt="${t.qrAltText || 'QR Code'}" 
                    style="
                        width: 100%; 
                        max-width: 150px; 
                        height: auto; 
                        display: block; 
                        margin: 0 auto;
                        border: none;
                    "
                    width="150"
                    height="150"
                />
            </div>
            <p style="font-size: 13px; color: #666; text-align: center; margin-top: 12px; line-height: 1.4; padding: 0 10px;">
                ${t.qrDescription}
            </p>
        </div>
        ` : ''}
        
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #155724; margin-top: 0;">📎 ${t.pdfAttached}</h4>
            <p style="color: #155724; margin-bottom: 0;">${t.pdfDescription}</p>
        </div>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #856404; margin-top: 0;">⚠️ ${t.importantInfo}</h4>
            ${t.instructions.map(instruction => `<p style="color: #856404; margin: 5px 0;">• ${instruction}</p>`).join('')}
        </div>
        
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #721c24; margin-top: 0;">🔒 ${t.security}</h4>
            <p style="color: #721c24; margin-bottom: 0;">${t.securityText}</p>
        </div>
        
        <div style="background-color: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #495057; margin-top: 0;">📧 ${t.noreply}</h4>
            <p style="color: #495057; margin-bottom: 0;">${t.noreplyText}</p>
        </div>
        
        <div style="background-color: #cce5ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #004085; margin-top: 0;">📞 ${t.support}</h4>
            <p style="color: #004085; margin-bottom: 0;">${t.supportText}</p>
            <p style="color: #004085; margin: 5px 0 0 0;">📧 support@kioskapp.com | 📱 +34 900 123 456</p>
        </div>
        
        <div class="footer">
            <p>📧 ${t.footer}</p>
            <p>🕐 ${t.timestamp} ${formatDateTime(new Date(), locale)}</p>
            <p>${t.copyright}</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Endpoint principal para enviar emails usando SendGrid API REST
app.post('/api/send-email', emailLimiter, async (req, res) => {
  console.log('📧 Petición de envío de email recibida:', {
    recipientEmail: req.body.recipientEmail,
    plate: req.body.plate,
    provider: 'sendgrid-api'
  });
  
  try {
    const {
      recipientEmail,
      plate,
      zone,
      start,
      end,
      price,
      method,
      customSubject,
      customMessage,
      qrData,
      discount,
      locale = 'es'
    } = req.body;

    // Validaciones básicas
    if (!recipientEmail || !plate || !zone || !start || !end || !price || !method) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Verificar que SendGrid API Key esté configurada
    if (!process.env.SENDGRID_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'SendGrid API Key no configurada'
      });
    }

    // Generar contenido del email
    const ticketData = {
      plate,
      zone,
      start,
      end,
      price,
      method,
      customMessage,
      qrData,
      discount
    };

    const t = getTranslations(locale);
    const htmlContent = await generateTicketHTML(ticketData, locale);
    const subject = 'Meypark';

    // Procesar QR y PDF en paralelo para mayor velocidad
    console.log('🚀 Iniciando procesamiento paralelo de QR y PDF...');
    const startTime = Date.now();
    
    const [qrImageBuffer, pdfBuffer] = await Promise.allSettled([
      // Generar QR en buffer PNG para usar como imagen inline (CID) en el email
      qrData ? QRCode.toBuffer(typeof qrData === 'string' ? qrData : JSON.stringify(qrData), {
        width: 150,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      }) : Promise.resolve(null),
      
      // Generar PDF del ticket
      generateTicketPDF(ticketData, locale)
    ]);
    
    const processingTime = Date.now() - startTime;
    console.log(`⚡ Procesamiento paralelo completado en ${processingTime}ms`);
    
    // Manejar resultados
    const qrBuffer = qrImageBuffer.status === 'fulfilled' ? qrImageBuffer.value : null;
    const pdfBufferResult = pdfBuffer.status === 'fulfilled' ? pdfBuffer.value : null;
    
    if (qrImageBuffer.status === 'rejected') {
      console.warn('⚠️ No se pudo generar QR inline para el email:', qrImageBuffer.reason?.message || qrImageBuffer.reason);
    }
    
    if (pdfBuffer.status === 'rejected') {
      console.error('❌ Error generando PDF:', pdfBuffer.reason?.message || pdfBuffer.reason);
      return res.status(500).json({
        success: false,
        error: 'Error generando PDF del ticket'
      });
    }
    
    console.log('🧾 PDF generado. Tamaño:', pdfBufferResult?.length, 'bytes');

    // Configurar email para SendGrid API REST
    const msg = {
      to: recipientEmail,
      from: {
        email: 'jbolanos.meypar@gmail.com',
        name: 'Meypark'
      },
      subject: subject,
      html: htmlContent,
      text: `${t.title}\n\n${t.plate}: ${plate}\n${t.zone}: ${zone}\n${t.startTime}: ${start}\n${t.endTime}: ${end}\n${t.price}: ${price}€\n${t.method}: ${method}`,
      attachments: [
        // Adjuntar PDF del ticket
        {
          content: pdfBufferResult.toString('base64'),
          filename: `ticket-${plate}-${new Date().toISOString().split('T')[0]}.pdf`,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ]
    };

    // Agregar QR como imagen inline si existe
    if (qrBuffer) {
      msg.attachments.push({
        content: qrBuffer.toString('base64'),
        filename: 'ticket-qr.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'ticket-qr'
      });
    }

    // Enviar email usando SendGrid API REST
    console.log('📤 Enviando email vía SendGrid API REST a:', recipientEmail);
    
    const response = await sgMail.send(msg);
    
    console.log('✅ SendGrid API Response:', JSON.stringify({
      statusCode: response[0].statusCode,
      headers: response[0].headers,
      body: response[0].body
    }));
    
    console.log(`✅ Email enviado exitosamente a: ${recipientEmail}`);
    console.log(`📧 Status Code: ${response[0].statusCode}`);

    res.json({
      success: true,
      message: 'Email enviado correctamente',
      statusCode: response[0].statusCode,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    console.error('❌ Error details:', JSON.stringify({
      code: error.code,
      response: error.response,
      message: error.message,
      recipient: req.body.recipientEmail || 'unknown'
    }));
    
    // Manejar errores específicos de SendGrid
    let errorMessage = 'Error interno del servidor';
    if (error.code === 400) {
      errorMessage = 'Datos de email inválidos';
    } else if (error.code === 401) {
      errorMessage = 'API Key de SendGrid inválida';
    } else if (error.code === 403) {
      errorMessage = 'Acceso denegado a SendGrid';
    } else if (error.code === 413) {
      errorMessage = 'Email demasiado grande';
    } else if (error.code === 429) {
      errorMessage = 'Límite de envío excedido, intente más tarde';
    } else if (error.code === 500) {
      errorMessage = 'Error interno de SendGrid';
    } else if (error.code === 503) {
      errorMessage = 'SendGrid temporalmente no disponible';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error && (error.stack || error.message || String(error)),
      debugInfo: {
        recipient: req.body.recipientEmail || 'unknown',
        errorCode: error.code,
        statusCode: error.response?.statusCode
      }
    });
  }
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    transporterPoolSize: 0,
    version: '2.0.0-sendgrid-api'
  });
});

// Endpoint de información
app.get('/', (req, res) => {
  res.json({
    name: 'Meypark Email Server',
    version: '2.0.0',
    description: 'Servidor de email para KioskApp - Usando SendGrid API REST',
    endpoints: {
      'POST /api/send-email': 'Enviar email con ticket usando SendGrid API',
      'GET /health': 'Estado del servidor',
      'GET /': 'Información del servidor'
    }
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    availableEndpoints: [
      'POST /api/send-email',
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
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de email iniciado en puerto ${PORT}`);
  console.log(`📧 Configurado para SendGrid API REST`);
  console.log(`🔑 API Key configurada: ${process.env.SENDGRID_API_KEY ? 'Sí' : 'No'}`);
  console.log(`🌐 Servidor accesible en: http://localhost:${PORT}`);
});

module.exports = app;
