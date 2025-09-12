const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { getTranslations, formatDateTime, formatDuration } = require('./translations');

/**
 * Genera un PDF del ticket de estacionamiento similar al de Flutter
 * @param {Object} ticketData - Datos del ticket
 * @param {string} locale - Idioma (es, ca, en)
 * @returns {Buffer} - Buffer del PDF generado
 */
async function generateTicketPDF(ticketData, locale = 'es') {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      const t = getTranslations(locale);
      const {
        plate,
        zone,
        start,
        end,
        price,
        method,
        qrData,
        discount,
        customMessage
      } = ticketData;

      // Función auxiliar para crear filas de información con mejor diseño
      function buildInfoRow(label, value, isBold = false) {
        const currentY = doc.y;
        const rowHeight = 25;
        
        // Fondo de la fila
        doc.rect(50, currentY - 5, doc.page.width - 100, rowHeight)
           .fill('#f8f9fa');
        
        // Borde izquierdo
        doc.rect(50, currentY - 5, 4, rowHeight)
           .fill('#E62144');
        
        // Label (izquierda)
        doc.fontSize(12)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor('#495057')
           .text(label, 65, currentY, { width: 120, continued: false });
        
        // Value (derecha)
        doc.fontSize(12)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .fillColor('#212529')
           .text(value, 185, currentY, { width: 350 });
        
        doc.fillColor('black');
        doc.moveDown(0.5);
      }

      // Helpers de etiquetas y textos
      function getTitle(loc) {
        const t = getTranslations(loc);
        return t.title;
      }

      function getZoneName(zone, loc) {
        const t = getTranslations(loc);
        if (zone === 'green') return t.zoneGreen;
        if (zone === 'blue') return t.zoneBlue;
        if (zone === 'moto') return t.zoneMoto;
        if (zone === 'coche') return t.zoneCoche;
        if (zone === 'camion') return t.zoneCamion;
        return zone;
      }

      function getMethodName(method, loc) {
        const t = getTranslations(loc);
        return (t.methods && t.methods[method]) || method;
      }

      function getLabel(key, loc) {
        const t = getTranslations(loc);
        const map = {
          plate: t.plate,
          zone: t.zone,
          start: t.startTime,
          end: t.endTime,
          duration: t.duration,
          discount: t.discount,
          total: t.price,
          price: t.price,
          method: t.paymentMethod,
          scan: t.qrDescription,
          generated: t.footer,
        };
        return map[key] || key;
      }

      // Encabezado con fondo
      doc.rect(0, 0, doc.page.width, 80)
         .fill('#E62144');
      
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text('🚗 Meypark', 0, 20, { align: 'center' });
      
      doc.fontSize(16)
         .font('Helvetica')
         .text(getTitle(locale), 0, 50, { align: 'center' });
      
      doc.fillColor('black');
      doc.moveDown(3);

      // Información del ticket - formato idéntico a Flutter
      const zoneName = getZoneName(zone, locale);
      const methodName = getMethodName(method, locale);
      const startFormatted = formatDateTime(start, locale);
      const endFormatted = formatDateTime(end, locale);
      const duration = formatDuration(start, end, locale);

      buildInfoRow(getLabel('plate', locale), plate);
      buildInfoRow(getLabel('zone', locale), zoneName);
      buildInfoRow(getLabel('start', locale), startFormatted);
      buildInfoRow(getLabel('end', locale), endFormatted);
      buildInfoRow(getLabel('duration', locale), duration);
      
      // Línea divisoria
      doc.moveTo(60, doc.y + 5)
         .lineTo(550, doc.y + 5)
         .stroke();
      
      doc.moveDown(0.5);
      
      // Descuento si existe
      if (discount && discount !== 0) {
        const discountFormatted = locale.startsWith('es') || locale.startsWith('ca') 
          ? `${discount.toFixed(2).replace('.', ',')} €`
          : `${discount.toFixed(2)} €`;
        buildInfoRow(getLabel('discount', locale), discountFormatted);
      }
      
      // Precio total - destacado con fondo especial
      const priceFormatted = locale.startsWith('es') || locale.startsWith('ca') 
        ? `${price.toFixed(2).replace('.', ',')} €`
        : `${price.toFixed(2)} €`;
      
      // Fondo especial para el precio
      const priceY = doc.y;
      doc.rect(50, priceY - 5, doc.page.width - 100, 30)
         .fill('#E62144');
      
      doc.fontSize(16)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text(`${getLabel('total', locale)}: ${priceFormatted}`, 0, priceY + 5, { align: 'center' });
      
      doc.fillColor('black');
      doc.moveDown(1);
      
      buildInfoRow(getLabel('method', locale), methodName);
      
      doc.moveDown(1);
      
      // Eliminado mensaje personalizado en PDF (customMessage) para evitar artefactos de texto
      
      doc.moveDown(1);
      
      // Generar y agregar código QR con mejor diseño
      if (qrData) {
        try {
          // Convertir qrData a string si es un objeto
          const qrString = typeof qrData === 'string' ? qrData : JSON.stringify(qrData);
          
          const qrCodeBuffer = await QRCode.toBuffer(qrString, {
            width: 150,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          
          // Fondo para la sección QR
          const qrY = doc.y;
          doc.rect(50, qrY - 10, doc.page.width - 100, 200)
             .fill('#f8f9fa');
          
          // Centrar el QR
          const qrX = (doc.page.width - 150) / 2;
          doc.image(qrCodeBuffer, qrX, qrY + 10, { width: 150 });
          
          // Título del QR
          doc.fontSize(14)
             .font('Helvetica-Bold')
             .fillColor('#E62144')
             .text('📱 ' + getLabel('scan', locale), 0, qrY + 180, { 
               align: 'center',
               width: doc.page.width
             });
          
          doc.fillColor('#000000');
          doc.moveDown(3);
        } catch (qrError) {
          console.error('Error generando QR code:', qrError);
          // Si falla el QR, mostrar el texto como fallback
          doc.fontSize(10)
             .font('Helvetica')
             .fillColor('#666666')
             .text(`QR Data: ${typeof qrData === 'string' ? qrData : JSON.stringify(qrData)}`, { 
               align: 'center',
               width: 500
             });
          doc.fillColor('#000000');
        }
      }
      
      doc.moveDown(2);
      
      // Pie de página - centrado correctamente con hora local de España
      const now = new Date();
      const spainTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Madrid"}));
      const footerText = `${getLabel('generated', locale)} ${formatDateTime(spainTime, locale)}`;
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text(footerText, 0, doc.y, { 
           align: 'center',
           width: doc.page.width,
           lineGap: 2
         });

      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateTicketPDF
};
