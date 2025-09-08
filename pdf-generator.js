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

      // Función auxiliar para crear filas de información
      function buildInfoRow(label, value, isBold = false) {
        const currentY = doc.y;
        
        // Label (izquierda)
        doc.fontSize(12)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .text(label, 60, currentY, { width: 120, continued: false });
        
        // Value (derecha)
        doc.fontSize(12)
           .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
           .text(value, 180, currentY, { width: 350 });
        
        doc.moveDown(0.3);
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
          method: t.method,
          scan: t.qrDescription,
          generated: t.footer,
        };
        return map[key] || key;
      }

      // Título principal - igual que Flutter
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .text(getTitle(locale), { align: 'center' });
      
      doc.moveDown(1.5);

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
        buildInfoRow(getLabel('discount', locale), `${discount.toFixed(2)} €`);
      }
      
      // Precio total - destacado como en Flutter
      buildInfoRow(getLabel('total', locale), `${price.toFixed(2)} €`, true);
      buildInfoRow(getLabel('method', locale), methodName);
      
      doc.moveDown(1);
      
      // Eliminado mensaje personalizado en PDF (customMessage) para evitar artefactos de texto
      
      doc.moveDown(1);
      
      // Generar y agregar código QR - igual que Flutter
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
          
          // Centrar el QR como en Flutter
          const qrX = (doc.page.width - 150) / 2;
          doc.image(qrCodeBuffer, qrX, doc.y, { width: 150 });
          
          doc.moveDown(8);
          
          doc.fontSize(12)
             .font('Helvetica')
             .fillColor('#666666')
             .text(getLabel('scan', locale), { align: 'center' });
          
          doc.fillColor('#000000');
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
      
      // Pie de página - igual que Flutter
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text(`${getLabel('generated', locale)} ${formatDateTime(new Date(), locale)}`, { align: 'center' });

      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateTicketPDF
};
