// Traducciones y funciones de formateo para el servidor de email

// Función para formatear fecha y hora en formato 24h - SIN conversión de zona horaria
const formatDateTime = (date, locale = 'es') => {
  const d = new Date(date);
  
  // Formatear directamente sin conversión de zona horaria para mantener la hora exacta
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year}, ${hours}:${minutes}`;
};

// Función para formatear duración
const formatDuration = (start, end, locale = 'es') => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
};

// Función para obtener el año actual dinámicamente
const getCurrentYear = () => {
  return new Date().getFullYear();
};

// Traducciones multiidioma
const getTranslations = (locale = 'es') => {
  const currentYear = getCurrentYear(); // ✅ AÑO DINÁMICO
  
  const translations = {
    es: {
      subject: 'Meypark',
      subtitle: 'Smart Parking Management System',
      greeting: 'Estimado cliente,',
      intro: 'Hemos procesado exitosamente su pago de estacionamiento. A continuación encontrará los detalles de su ticket:',
      title: 'Ticket de Estacionamiento',
      ticketDetails: 'Detalles del Ticket',
      plate: 'Matrícula',
      zone: 'Zona',
      zoneGreen: 'Zona Verde',
      zoneBlue: 'Zona Azul',
      zoneCoche: 'Zona Coche',
      zoneMoto: 'Zona Moto',
      zoneCamion: 'Zona Camión',
      startTime: 'Hora de inicio',
      endTime: 'Hora de finalización',
      duration: 'Duración',
      totalPrice: 'Precio total',
      paymentMethod: 'Método de pago',
      methods: {
        card: 'Tarjeta',
        qr: 'QR Pay',
        mobile: 'Apple/Google Pay',
        cash: 'Efectivo',
        bizum: 'Bizum'
      },
      thanks: 'Gracias por elegir Meypark',
      footer: 'Este ticket ha sido generado automáticamente por el sistema de gestión de aparcamiento Meypark.',
      copyright: `© ${currentYear} Meypark`, // ✅ AÑO DINÁMICO
      generated: 'Generado automáticamente por Meypark',
      sent: 'Enviado el',
      importantInfo: 'Información importante',
      instructions: [
        'Mantenga este ticket visible en su vehículo',
        'El ticket es válido solo para la zona y horario indicados',
        'En caso de incidencia, contacte con el soporte'
      ],
      security: 'Seguridad',
      securityText: 'Este ticket contiene un código QR único para verificación',
      noreply: 'No responder',
      noreplyText: 'Este es un mensaje automático, por favor no responda',
      support: 'Soporte',
      supportText: 'Para asistencia técnica o consultas',
      timestamp: 'Generado el',
      pdfAttached: 'PDF adjunto',
      pdfDescription: 'Se ha adjuntado un PDF con los detalles del ticket',
      qrTitle: 'Código QR de Verificación',
      qrDescription: 'Escanee este código para verificar su ticket con las autoridades de tráfico',
      qrAltText: 'Código QR del ticket'
    },
    ca: {
      subject: 'Meypark',
      subtitle: 'Sistema de Gestió d\'Aparcament Intel·ligent',
      greeting: 'Estimat client,',
      intro: 'Hem processat amb èxit el seu pagament d\'estacionament. A continuació trobarà els detalls del seu tiquet:',
      title: 'Tiquet d\'Estacionament',
      ticketDetails: 'Detalls del Tiquet',
      plate: 'Matrícula',
      zone: 'Zona',
      zoneGreen: 'Zona Verda',
      zoneBlue: 'Zona Blava',
      zoneCoche: 'Zona Cotxe',
      zoneMoto: 'Zona Moto',
      zoneCamion: 'Zona Camió',
      startTime: 'Hora d\'inici',
      endTime: 'Hora de finalització',
      duration: 'Durada',
      totalPrice: 'Preu total',
      paymentMethod: 'Mètode de pagament',
      methods: {
        card: 'Targeta',
        qr: 'QR Pay',
        mobile: 'Apple/Google Pay',
        cash: 'Efectiu',
        bizum: 'Bizum'
      },
      thanks: 'Gràcies per triar Meypark',
      footer: 'Aquest tiquet ha estat generat automàticament pel sistema de gestió d\'aparcament Meypark.',
      copyright: `© ${currentYear} Meypark`, // ✅ AÑO DINÁMICO
      generated: 'Generat automàticament per Meypark',
      sent: 'Enviat el',
      importantInfo: 'Informació important',
      instructions: [
        'Mantingui aquest tiquet visible al seu vehicle',
        'El tiquet és vàlid només per a la zona i horari indicats',
        'En cas d\'incidència, contacti amb el suport'
      ],
      security: 'Seguretat',
      securityText: 'Aquest tiquet conté un codi QR únic per a verificació',
      noreply: 'No respondre',
      noreplyText: 'Aquest és un missatge automàtic, si us plau no respongui',
      support: 'Suport',
      supportText: 'Per a assistència tècnica o consultes',
      timestamp: 'Generat el',
      pdfAttached: 'PDF adjunt',
      pdfDescription: 'S\'ha adjuntat un PDF amb els detalls del tiquet',
      qrTitle: 'Codi QR de Verificació',
      qrDescription: 'Escanegeu aquest codi per verificar el vostre tiquet amb les autoritats de trànsit',
      qrAltText: 'Codi QR del tiquet'
    },
    en: {
      subject: 'Meypark',
      subtitle: 'Smart Parking Management System',
      greeting: 'Dear customer,',
      intro: 'We have successfully processed your parking payment. Below you will find the details of your ticket:',
      title: 'Parking Ticket',
      ticketDetails: 'Ticket Details',
      plate: 'Plate',
      zone: 'Zone',
      zoneGreen: 'Green Zone',
      zoneBlue: 'Blue Zone',
      zoneCoche: 'Car Zone',
      zoneMoto: 'Motorcycle Zone',
      zoneCamion: 'Truck Zone',
      startTime: 'Start time',
      endTime: 'End time',
      duration: 'Duration',
      totalPrice: 'Total price',
      paymentMethod: 'Payment method',
      methods: {
        card: 'Card',
        qr: 'QR Pay',
        mobile: 'Apple/Google Pay',
        cash: 'Cash',
        bizum: 'Bizum'
      },
      thanks: 'Thank you for choosing Meypark',
      footer: 'This ticket has been automatically generated by the Meypark parking management system.',
      copyright: `© ${currentYear} Meypark`, // ✅ AÑO DINÁMICO
      generated: 'Automatically generated by Meypark',
      sent: 'Sent on',
      importantInfo: 'Important information',
      instructions: [
        'Keep this ticket visible in your vehicle',
        'The ticket is valid only for the indicated zone and time',
        'In case of incident, contact support'
      ],
      security: 'Security',
      securityText: 'This ticket contains a unique QR code for verification',
      noreply: 'Do not reply',
      noreplyText: 'This is an automatic message, please do not reply',
      support: 'Support',
      supportText: 'For technical assistance or inquiries',
      timestamp: 'Generated on',
      pdfAttached: 'PDF attached',
      pdfDescription: 'A PDF with ticket details has been attached',
      qrTitle: 'Verification QR Code',
      qrDescription: 'Scan this code to verify your ticket with traffic authorities',
      qrAltText: 'Ticket QR code'
    }
  };
  
  return translations[locale] || translations.es;
};

module.exports = { getTranslations, formatDateTime, formatDuration };