const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const QRCode = require('qrcode');
const { getTranslations, formatDateTime, formatDuration } = require('./translations');
const { generateTicketPDF } = require('./pdf-generator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares de seguridad
app.use(helmet());
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
app.use(express.json({ limit: '10mb' }));

// Rate limiting: máximo 10 emails por IP cada 15 minutos
const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 requests por ventana
  message: {
    error: 'Demasiados emails enviados. Intenta de nuevo en 15 minutos.'
  }
});

// Configuración de transporters para diferentes proveedores
const createTransporter = (provider, email, password) => {
  const configs = {
    gmail: {
      service: 'gmail',
      auth: { user: email, pass: password }
    },
    hotmail: {
      service: 'hotmail',
      auth: { user: email, pass: password }
    },
    outlook: {
      service: 'outlook',
      auth: { user: email, pass: password }
    },
    meypar: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user: email, pass: password },
      tls: {
        rejectUnauthorized: false
      }
    },
    custom: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: { user: email, pass: password }
    }
  };
  
  return nodemailer.createTransport(configs[provider] || configs.gmail);
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
  
  // Para dominios corporativos desconocidos, usar Gmail como fallback
  // Esto funciona porque Gmail puede entregar a cualquier dominio
  console.log(`🔄 Dominio corporativo desconocido: ${domain}, usando Gmail como fallback`);
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
  const zoneName = zone === 'green' ? t.zoneGreen : zone === 'blue' ? t.zoneBlue : zone;
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
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #E62144;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #E62144;
            margin-bottom: 10px;
        }
        .ticket-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #495057;
        }
        .value {
            color: #212529;
        }
        .price-highlight {
            background-color: #E62144;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
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
                <span class="label">💳 ${t.method}:</span>
                <span class="value">${methodName}</span>
            </div>
            ${discount && discount !== 0 ? `
            <div class="info-row">
                <span class="label">💰 ${t.discount}:</span>
                <span class="value" style="color: #28a745;">${discount.toFixed(2)} €</span>
            </div>
            ` : ''}
        </div>
        
        <div class="price-highlight">
            💰 ${t.price}: ${price.toFixed(2)}€
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

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Email de destinatario inválido'
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

    // Generar QR en buffer PNG para usar como imagen inline (CID) en el email
    let qrImageBuffer = null;
    if (qrData) {
      try {
        const qrStringForEmail = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
        qrImageBuffer = await QRCode.toBuffer(qrStringForEmail, {
          width: 150,
          margin: 2,
          color: { dark: '#000000', light: '#FFFFFF' }
        });
      } catch (e) {
        console.warn('⚠️ No se pudo generar QR inline para el email:', e?.message || e);
      }
    }
    
    // Generar PDF del ticket
    console.log('🧾 Generando PDF del ticket...');
    const pdfBuffer = await generateTicketPDF(ticketData, locale);
    console.log('🧾 PDF generado. Tamaño:', pdfBuffer?.length, 'bytes');

    // Configurar email con PDF adjunto
    const mailOptions = {
      from: `"Meypark NoReply" <${fromEmail}>`,
      replyTo: 'noreply@meypark.com',
      to: recipientEmail,
      subject: subject,
      html: htmlContent,
      text: `${t.title}\n\n${t.plate}: ${plate}\n${t.zone}: ${zone}\n${t.startTime}: ${start}\n${t.endTime}: ${end}\n${t.price}: ${price}€\n${t.method}: ${method}`,
      attachments: [
        // Adjuntar QR como imagen inline si existe
        ...(qrImageBuffer ? [{
          filename: 'ticket-qr.png',
          content: qrImageBuffer,
          cid: 'ticket-qr',
          contentType: 'image/png'
        }] : []),
        // Adjuntar PDF del ticket
        {
          filename: `ticket-${plate}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    // Enviar email
    console.log('📤 Enviando email vía', emailProvider, 'como', fromEmail, 'a', recipientEmail);
    console.log('🔧 Proveedor detectado automáticamente:', detectedProvider, 'para dominio:', recipientEmail.split('@')[1]);
    const info = await transporter.sendMail(mailOptions);
    
    console.log(`✅ Email enviado exitosamente a: ${recipientEmail}`);
    console.log(`📧 Message ID: ${info.messageId}`);

    res.json({
      success: true,
      message: 'Email enviado correctamente',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error enviando email:', error);
    
    // Manejar errores específicos
    let errorMessage = 'Error interno del servidor';
    if (error.code === 'EAUTH') {
      errorMessage = 'Credenciales de email incorrectas';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Error de conexión con el servidor de email';
    } else if (error.responseCode === 550) {
      errorMessage = 'Email de destinatario inválido o bloqueado';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error && (error.stack || error.message || String(error))
    });
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
    uptime: process.uptime()
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
