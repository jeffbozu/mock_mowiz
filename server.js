const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { getTranslations, formatDateTime, formatDuration } = require('./translations');
const { generateTicketPDF } = require('./pdf-generator');
require('dotenv').config();

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
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '5mb' })); // Reducido de 10mb a 5mb

// Rate limiting: máximo 10 emails por IP cada 15 minutos
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 requests por ventana
  message: {
    error: 'Demasiados emails enviados. Intenta de nuevo en 15 minutos.'
  }
});

// Pool de transporters para reutilizar conexiones
const transporterPool = new Map();

// Configuración optimizada de transporters para diferentes proveedores
const createTransporter = (provider, email, password) => {
  const poolKey = `${provider}-${email}`;
  
  // Reutilizar transporter si ya existe
  if (transporterPool.has(poolKey)) {
    return transporterPool.get(poolKey);
  }

  const configs = {
    gmail: {
      service: 'gmail',
      auth: { user: email, pass: password },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000, // Reducido de 60s a 30s
      greetingTimeout: 15000,   // Reducido de 30s a 15s
      socketTimeout: 30000      // Reducido de 60s a 30s
    },
    hotmail: {
      service: 'hotmail',
      auth: { user: email, pass: password },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    },
    outlook: {
      service: 'outlook',
      auth: { user: email, pass: password },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    },
    meypar: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    },
    corporate: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 15000,
      rateLimit: 5,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    },
    custom: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: { user: email, pass: password },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateDelta: 10000,
      rateLimit: 3,
      connectionTimeout: 30000,
      greetingTimeout: 15000,
      socketTimeout: 30000
    }
  };
  
  const transporter = nodemailer.createTransport(configs[provider] || configs.gmail);
  transporterPool.set(poolKey, transporter);
  
  return transporter;
};

// Función para detectar automáticamente el proveedor basado en el dominio del destinatario
const detectEmailProvider = (recipientEmail) => {
  const domain = recipientEmail.split('@')[1]?.toLowerCase();
  
  if (!domain) return 'gmail';
  
  // Mapeo de dominios a proveedores
  const domainMap = {
    'gmail.com': 'gmail',
    'googlemail.com': 'gmail',
    'hotmail.com': 'hotmail',
    'outlook.com': 'outlook',
    'live.com': 'hotmail',
    'meypar.com': 'meypar',
    // Agregar más dominios corporativos específicos aquí si es necesario
  };
  
  // Si el dominio está en el mapa, usar esa configuración
  if (domainMap[domain]) {
    return domainMap[domain];
  }
  
  // Detectar si es un dominio corporativo (no es un proveedor público conocido)
  const publicDomains = ['gmail.com', 'googlemail.com', 'hotmail.com', 'outlook.com', 'live.com', 'yahoo.com', 'aol.com'];
  const isCorporateDomain = !publicDomains.includes(domain) && domain.includes('.');
  
  if (isCorporateDomain) {
    console.log(`🏢 Dominio corporativo detectado: ${domain}, usando configuración corporativa`);
    return 'corporate';
  }
  
  // Para otros casos, usar Gmail como fallback
  console.log(`🔄 Dominio desconocido: ${domain}, usando Gmail como fallback`);
  return 'gmail';
};

// Función para generar QR como base64
const generateQRBase64 = async (qrData) => {
  try {
    const qrString = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
    const QRCode = require('qrcode');
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
            border: 1px solid #e9ecef;
        }
        .header {
            text-align: center;
            background: linear-gradient(135deg, #E62144 0%, #ff4757 100%);
            color: white;
            padding: 30px 20px;
            margin: -40px -40px 30px -40px;
            border-radius: 15px 15px 0 0;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .ticket-info {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 25px;
            margin: 25px 0;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 12px 0;
            padding: 12px 15px;
            background-color: white;
            border-radius: 8px;
            border-left: 4px solid #E62144;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .info-row:last-child {
            margin-bottom: 0;
        }
        .label {
            font-weight: 600;
            color: #495057;
            font-size: 14px;
        }
        .value {
            color: #212529;
            font-weight: 500;
            font-size: 14px;
        }
        .price-highlight {
            background: linear-gradient(135deg, #E62144 0%, #ff4757 100%);
            color: white;
            padding: 20px 30px;
            border-radius: 15px;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 25px 0;
            box-shadow: 0 4px 15px rgba(230, 33, 68, 0.3);
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            border: 1px solid #dee2e6;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            color: #6c757d;
            font-size: 14px;
            border: 1px solid #dee2e6;
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
            <div class="logo">🚗 Meypark</div>
            <div>${t.subtitle}</div>
        </div>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 4px;">
            <p style="margin: 0; color: #1976d2; font-weight: bold;">${t.greeting}</p>
            <p style="margin: 10px 0 0 0; color: #333;">${t.intro}</p>
        </div>
        
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
                <!-- Imagen QR con estilos responsivos -->
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
        
        <!-- PDF Attachment Notice -->
        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #155724; margin-top: 0;">📎 ${t.pdfAttached}</h4>
            <p style="color: #155724; margin-bottom: 0;">${t.pdfDescription}</p>
        </div>
        
        <!-- Important Instructions -->
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #856404; margin-top: 0;">⚠️ ${t.importantInfo}</h4>
            ${t.instructions.map(instruction => `<p style="color: #856404; margin: 5px 0;">• ${instruction}</p>`).join('')}
        </div>
        
        <!-- Security Notice -->
        <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #721c24; margin-top: 0;">🔒 ${t.security}</h4>
            <p style="color: #721c24; margin-bottom: 0;">${t.securityText}</p>
        </div>
        
        <!-- NoReply Notice -->
        <div style="background-color: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h4 style="color: #495057; margin-top: 0;">📧 ${t.noreply}</h4>
            <p style="color: #495057; margin-bottom: 0;">${t.noreplyText}</p>
        </div>
        
        <!-- Support Info -->
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

// Endpoint principal para enviar emails
app.post('/api/send-email', emailLimiter, async (req, res) => {
  console.log('📧 Petición de envío de email recibida:', {
    recipientEmail: req.body.recipientEmail,
    plate: req.body.plate,
    provider: req.body.provider || 'gmail'
  });
  
  // Responder inmediatamente que se está procesando
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Transfer-Encoding': 'chunked'
  });
  
  // Enviar respuesta inicial
  res.write(JSON.stringify({
    success: true,
    message: 'Procesando email...',
    status: 'processing'
  }));
  
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
      senderEmail,
      senderPassword,
      provider = 'gmail',
      locale = 'es'
    } = req.body;

    // Validaciones básicas
    if (!recipientEmail || !plate || !zone || !start || !end || !price || !method) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos'
      });
    }

    // Validar email con regex más estricto para correos corporativos
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Email de destinatario inválido'
      });
    }

    // Validación adicional para correos corporativos
    const domain = recipientEmail.split('@')[1]?.toLowerCase();
    if (!domain || domain.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Dominio de email inválido'
      });
    }

    // Detectar proveedor automáticamente basado en el destinatario
    const detectedProvider = detectEmailProvider(recipientEmail);
    
    // Usar credenciales del request o variables de entorno (fallback a GMAIL_*)
    const fromEmail = senderEmail || process.env.EMAIL_USER || process.env.GMAIL_EMAIL;
    const fromPassword = senderPassword || process.env.EMAIL_PASSWORD || process.env.GMAIL_PASSWORD;
    const emailProvider = provider || detectedProvider;

    if (!fromEmail || !fromPassword) {
      return res.status(500).json({
        success: false,
        error: 'Credenciales de email no configuradas'
      });
    }

    // Crear transporter
    const transporter = createTransporter(emailProvider, fromEmail, fromPassword);

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
    // Asunto fijo solicitado: solo 'Meypark'
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

    // Configurar email con PDF adjunto - optimizado para correos corporativos
    const mailOptions = {
      from: `"Meypark NoReply" <${fromEmail}>`,
      replyTo: 'noreply@meypark.com',
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: `${t.title}\n\n${t.plate}: ${plate}\n${t.zone}: ${zone}\n${t.startTime}: ${start}\n${t.endTime}: ${end}\n${t.price}: ${price}€\n${t.method}: ${method}`,
      // Headers adicionales para mejorar la entrega a correos corporativos
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Meypark Ticket System',
        'X-Originating-IP': '[127.0.0.1]',
        'Return-Path': fromEmail,
        'Message-ID': `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@meypark.com>`,
        'List-Unsubscribe': '<mailto:unsubscribe@meypark.com>',
        'X-Auto-Response-Suppress': 'All'
      },
      // Configuración adicional para correos corporativos
      envelope: {
        from: fromEmail,
        to: recipientEmail
      },
      attachments: [
        // Adjuntar QR como imagen inline si existe
        ...(qrBuffer ? [{
          filename: 'ticket-qr.png',
          content: qrBuffer,
          cid: 'ticket-qr',
          contentType: 'image/png'
        }] : []),
        // Adjuntar PDF del ticket
        {
          filename: `ticket-${plate}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBufferResult,
          contentType: 'application/pdf'
        }
      ]
    };

    // Enviar email
    console.log('📤 Enviando email vía', emailProvider, 'como', fromEmail, 'a', recipientEmail);
    console.log('🔧 Proveedor detectado automáticamente:', detectedProvider, 'para dominio:', recipientEmail.split('@')[1]);
    console.log('🔧 Configuración SMTP usada:', JSON.stringify({
      provider: emailProvider,
      host: transporter.options?.host || transporter.options?.service,
      port: transporter.options?.port,
      secure: transporter.options?.secure
    }));
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ SMTP Response:', JSON.stringify({
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    }));
    
    console.log(`✅ Email enviado exitosamente a: ${recipientEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);

    // Enviar respuesta final de éxito
    res.write(JSON.stringify({
      success: true,
      message: 'Email enviado correctamente',
      messageId: info.messageId,
      status: 'sent',
      processingTime: Date.now() - startTime
    }));
    res.end();

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    console.error('❌ Error details:', JSON.stringify({
      code: error.code,
      responseCode: error.responseCode,
      response: error.response,
      command: error.command,
      message: error.message,
      recipient: req.body.recipientEmail || 'unknown',
      provider: req.body.provider || 'unknown'
    }));
    
    // Manejar errores específicos - mejorado para correos corporativos
    let errorMessage = 'Error interno del servidor';
    if (error.code === 'EAUTH') {
      errorMessage = 'Credenciales de email incorrectas';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Error de conexión con el servidor de email';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email de destinatario inválido o bloqueado por el servidor corporativo';
    } else if (error.responseCode === 554) {
      errorMessage = 'Email rechazado por el servidor de destino (posible filtro corporativo)';
    } else if (error.responseCode === 421) {
      errorMessage = 'Servidor temporalmente no disponible, intente más tarde';
    } else if (error.responseCode === 450) {
      errorMessage = 'Buzón de correo temporalmente no disponible';
    } else if (error.responseCode === 451) {
      errorMessage = 'Error temporal del servidor, intente más tarde';
    } else if (error.responseCode === 452) {
      errorMessage = 'Sistema de correo sobrecargado, intente más tarde';
    } else if (error.responseCode === 553) {
      errorMessage = 'Dirección de correo no válida o no permitida';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Conexión rechazada por el servidor de correo';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Timeout de conexión con el servidor de correo';
    }

    // Enviar respuesta de error
    res.write(JSON.stringify({
      success: false,
      error: errorMessage,
      status: 'error',
      details: error && (error.stack || error.message || String(error)),
      debugInfo: {
        recipient: req.body.recipientEmail || 'unknown',
        provider: req.body.provider || 'unknown',
        errorCode: error.code,
        responseCode: error.responseCode
      }
    }));
    res.end();
  }
});

// Función para generar auto-respuesta noreply
const generateAutoReplyHTML = (locale = 'es') => {
  const t = getTranslations(locale);
  
  return `
<!DOCTYPE html>
<html lang="${locale.startsWith('ca') ? 'ca' : locale.startsWith('en') ? 'en' : 'es'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.autoReplySubject}</title>
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
            background-color: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #E62144;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #E62144;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🚗 Meypark</div>
            <div>${t.subtitle}</div>
        </div>
        
        <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h2 style="color: #856404; margin-top: 0;">⚠️ ${t.autoReplyTitle}</h2>
            <p style="color: #856404; margin-bottom: 0;">${t.autoReplyMessage}</p>
        </div>
        
        <div style="background-color: #cce5ff; border-left: 4px solid #007bff; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="color: #004085; margin-top: 0;">📞 ${t.support}</h3>
            <p style="color: #004085;">${t.supportText}</p>
            <ul style="color: #004085;">
                <li>📧 Email: support@kioskapp.com</li>
                <li>📱 Teléfono: +34 900 123 456</li>
                <li>🕐 Horario: ${t.supportHours}</li>
            </ul>
        </div>
        
        <div style="background-color: #e2e3e5; border-left: 4px solid #6c757d; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #495057; margin: 0; font-size: 12px;">${t.autoReplyFooter}</p>
        </div>
    </div>
</body>
</html>
  `;
};

// Endpoint para manejar auto-respuestas (webhook para emails recibidos)
app.post('/api/auto-reply', async (req, res) => {
  try {
    const { fromEmail, subject, locale = 'es' } = req.body;
    
    if (!fromEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email del remitente requerido'
      });
    }

    // Configurar transporter para auto-respuesta
    const transporter = createTransporter(
      'gmail',
      process.env.NOREPLY_EMAIL || process.env.GMAIL_EMAIL,
      process.env.NOREPLY_PASSWORD || process.env.GMAIL_PASSWORD
    );

    const t = getTranslations(locale);
    const autoReplyHTML = generateAutoReplyHTML(locale);

    const mailOptions = {
      from: `"KioskApp NoReply" <noreply@kioskapp.com>`,
      to: fromEmail,
      subject: t.autoReplySubject,
      html: autoReplyHTML,
      text: `${t.autoReplyTitle}\n\n${t.autoReplyMessage}\n\n${t.support}:\n- Email: support@kioskapp.com\n- Teléfono: +34 900 123 456\n- Horario: ${t.supportHours}`
    };

    await transporter.sendMail(mailOptions);
    
    console.log(`✅ Auto-respuesta enviada a: ${fromEmail}`);

    res.json({
      success: true,
      message: 'Auto-respuesta enviada correctamente'
    });

  } catch (error) {
    console.error('❌ Error enviando auto-respuesta:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
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
    transporterPoolSize: transporterPool.size,
    version: '2.0.0-optimized'
  });
});

// Endpoint de rendimiento
app.get('/api/performance', (req, res) => {
  res.json({
    status: 'OK',
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      transporterPoolSize: transporterPool.size,
      activeConnections: Array.from(transporterPool.values()).length,
      version: '2.0.0-optimized',
      optimizations: [
        'Connection pooling enabled',
        'Parallel QR/PDF processing',
        'Reduced SMTP timeouts',
        'Streaming responses',
        'Connection reuse'
      ]
    }
  });
});

// Endpoint de información
app.get('/', (req, res) => {
  res.json({
    name: 'Meypark Email Server',
    version: '1.0.0',
    description: 'Servidor proxy para envío de emails de tickets de estacionamiento',
    endpoints: {
      'POST /api/send-email': 'Enviar email con ticket',
      'POST /api/auto-reply': 'Auto-respuesta para emails recibidos',
      'GET /health': 'Estado del servidor',
      'GET /': 'Información del servidor'
    }
  });
});

// Manejo de errores globales
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor de email iniciado en puerto ${PORT}`);
  console.log(`📧 Configurado para Gmail: ${process.env.GMAIL_EMAIL}`);
  console.log(`🌐 Endpoints disponibles:`);
  console.log(`   - POST /api/send-email`);
  console.log(`   - POST /api/auto-reply`);
  console.log(`   - GET /health`);
  console.log(`   - GET /`);
  console.log(`🔗 Servidor accesible en: http://localhost:${PORT}`);
});

module.exports = app;
