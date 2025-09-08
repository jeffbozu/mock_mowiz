// Traducciones para emails multiidioma
const translations = {
  es: {
    subject: 'Tu Ticket de Estacionamiento - Meypark',
    title: 'Ticket de Estacionamiento',
    subtitle: 'Sistema de Gestión de Estacionamiento Inteligente',
    greeting: 'Estimado/a cliente,',
    intro: 'Hemos procesado exitosamente tu pago de estacionamiento. A continuación encontrarás los detalles de tu ticket:',
    ticketDetails: 'Detalles del Ticket',
    plate: 'Matrícula',
    zone: 'Zona',
    zoneGreen: 'Zona Verde',
    zoneBlue: 'Zona Azul',
    startTime: 'Hora de Inicio',
    endTime: 'Hora de Finalización',
    duration: 'Duración',
    price: 'Precio Total',
    discount: 'Descuento Aplicado',
    method: 'Método de Pago',
    methods: {
      card: 'Tarjeta de Crédito/Débito',
      qr: 'Pago QR',
      mobile: 'Apple/Google Pay',
      cash: 'Efectivo',
      bizum: 'Bizum'
    },
    qrTitle: 'Código QR de Verificación',
    qrDescription: 'Escanea este código para verificar tu ticket con las autoridades de tráfico',
    qrAltText: 'Código QR de verificación de estacionamiento',
    pdfAttached: 'Ticket PDF Adjunto',
    pdfDescription: 'Hemos adjuntado una versión PDF de tu ticket que puedes imprimir o guardar en tu dispositivo.',
    importantInfo: 'Información Importante',
    instructions: [
      'Mantén este ticket visible en tu vehículo durante todo el período de estacionamiento',
      'El ticket es válido únicamente para la matrícula, zona y horario especificados',
      'Cualquier modificación o falsificación del ticket constituye una infracción',
      'En caso de inspección, presenta este email o el PDF adjunto'
    ],
    security: 'Seguridad y Protección de Datos',
    securityText: 'Este email contiene información personal y de pago. Meypark cumple con el RGPD y protege tus datos según nuestra política de privacidad. No compartas este ticket con terceros no autorizados.',
    noreply: 'Email Automático - No Responder',
    noreplyText: 'Este es un email automático generado por nuestro sistema. Por favor, no respondas a este mensaje ya que no será procesado.',
    support: 'Soporte Técnico',
    supportText: 'Si tienes alguna pregunta o problema con tu ticket de estacionamiento, no dudes en contactarnos.',
    supportHours: 'Lunes a Viernes de 9:00 a 18:00',
    autoReplySubject: 'Respuesta Automática - No Responder',
    autoReplyTitle: 'Mensaje Automático',
    autoReplyMessage: 'Este es un mensaje automático. Esta dirección de correo no acepta respuestas. Si necesitas ayuda, utiliza nuestros canales de soporte oficial.',
    autoReplyFooter: 'Este es un mensaje automático generado por el sistema Meypark. Por favor, no respondas a este email.',
    footer: 'Generado automáticamente por Meypark',
    timestamp: 'Enviado el',
    copyright: ' 2024 Meypark - Sistema de Gestión de Estacionamiento'
  },
  
  ca: {
    subject: 'El teu Tiquet d\'Aparcament - Meypark',
    title: 'Tiquet d\'Aparcament',
    subtitle: 'Sistema de Gestió d\'Aparcament Intel·ligent',
    greeting: 'Estimat/da client,',
    intro: 'Hem processat exitosament el teu pagament d\'aparcament. A continuació trobaràs els detalls del teu tiquet:',
    ticketDetails: 'Detalls del Tiquet',
    plate: 'Matrícula',
    zone: 'Zona',
    zoneGreen: 'Zona Verda',
    zoneBlue: 'Zona Blava',
    startTime: 'Hora d\'Inici',
    endTime: 'Hora de Finalització',
    duration: 'Durada',
    price: 'Preu Total',
    discount: 'Descompte Aplicat',
    method: 'Mètode de Pagament',
    methods: {
      card: 'Targeta de Crèdit/Dèbit',
      qr: 'Pagament QR',
      mobile: 'Apple/Google Pay',
      cash: 'Efectiu',
      bizum: 'Bizum'
    },
    qrTitle: 'Codi QR de Verificació',
    qrDescription: 'Escaneja aquest codi per verificar el teu tiquet amb les autoritats de trànsit',
    pdfAttached: 'Tiquet PDF Adjunt',
    pdfDescription: 'Hem adjuntat una versió PDF del teu tiquet que pots imprimir o guardar al teu dispositiu.',
    importantInfo: 'Informació Important',
    instructions: [
      'Mantén aquest tiquet visible al teu vehicle durant tot el període d\'aparcament',
      'El tiquet és vàlid únicament per a la matrícula, zona i horari especificats',
      'Qualsevol modificació o falsificació del tiquet constitueix una infracció',
      'En cas d\'inspecció, presenta aquest email o el PDF adjunt'
    ],
    security: 'Seguretat i Protecció de Dades',
    securityText: 'Aquest email conté informació personal i de pagament. Meypark compleix amb el RGPD i protegeix les teves dades segons la nostra política de privacitat. No comparteixis aquest tiquet amb tercers no autoritzats.',
    noreply: 'Email Automàtic - No Respondre',
    noreplyText: 'Aquest és un email automàtic generat pel nostre sistema. Si us plau, no responguis a aquest missatge ja que no serà processat.',
    support: 'Suport Tècnic',
    supportText: 'Si tens alguna pregunta o problema amb el teu tiquet d\'aparcament, no dubtis a contactar-nos.',
    supportHours: 'Dilluns a Divendres de 9:00 a 18:00',
    autoReplySubject: 'Resposta Automàtica - No Respondre',
    autoReplyTitle: 'Missatge Automàtic',
    autoReplyMessage: 'Aquest és un missatge automàtic. Aquesta adreça de correu no accepta respostes. Si necessites ajuda, utilitza els nostres canals de suport oficial.',
    autoReplyFooter: 'Aquest és un missatge automàtic generat pel sistema Meypark. Si us plau, no responguis a aquest email.',
    footer: 'Generat automàticament per Meypark',
    timestamp: 'Enviat el',
    copyright: ' 2024 Meypark - Sistema de Gestió d\'Aparcament'
  },
  
  en: {
    subject: 'Your Parking Ticket - Meypark',
    title: 'Parking Ticket',
    subtitle: 'Smart Parking Management System',
    greeting: 'Dear customer,',
    intro: 'We have successfully processed your parking payment. Below you will find the details of your ticket:',
    ticketDetails: 'Ticket Details',
    plate: 'License Plate',
    zone: 'Zone',
    zoneGreen: 'Green Zone',
    zoneBlue: 'Blue Zone',
    startTime: 'Start Time',
    endTime: 'End Time',
    duration: 'Duration',
    price: 'Total Price',
    discount: 'Applied Discount',
    method: 'Payment Method',
    methods: {
      card: 'Credit/Debit Card',
      qr: 'QR Payment',
      mobile: 'Apple/Google Pay',
      cash: 'Cash',
      bizum: 'Bizum'
    },
    qrTitle: 'Verification QR Code',
    qrDescription: 'Scan this code to verify your ticket with traffic authorities',
    pdfAttached: 'PDF Ticket Attached',
    pdfDescription: 'We have attached a PDF version of your ticket that you can print or save on your device.',
    importantInfo: 'Important Information',
    instructions: [
      'Keep this ticket visible in your vehicle during the entire parking period',
      'The ticket is valid only for the specified license plate, zone and time',
      'Any modification or falsification of the ticket constitutes a violation',
      'In case of inspection, present this email or the attached PDF'
    ],
    security: 'Security and Data Protection',
    securityText: 'This email contains personal and payment information. Meypark complies with GDPR and protects your data according to our privacy policy. Do not share this ticket with unauthorized third parties.',
    noreply: 'Automatic Email - Do Not Reply',
    noreplyText: 'This is an automatic email generated by our system. Please do not reply to this message as it will not be processed.',
    support: 'Technical Support',
    supportText: 'If you have any questions or issues with your parking ticket, please don\'t hesitate to contact us.',
    supportHours: 'Monday to Friday from 9:00 AM to 6:00 PM',
    autoReplySubject: 'Automatic Reply - Do Not Reply',
    autoReplyTitle: 'Automatic Message',
    autoReplyMessage: 'This is an automatic message. This email address does not accept replies. If you need help, please use our official support channels.',
    autoReplyFooter: 'This is an automatic message generated by the Meypark system. Please do not reply to this email.',
    footer: 'Automatically generated by Meypark',
    timestamp: 'Sent on',
    copyright: ' 2024 Meypark - Parking Management System'
  }
};

// Función para obtener traducciones por idioma
function getTranslations(locale) {
  // Mapear códigos de locale a idiomas
  const langMap = {
    'es': 'es',
    'es_ES': 'es',
    'ca': 'ca',
    'ca_ES': 'ca',
    'en': 'en',
    'en_US': 'en',
    'en_GB': 'en'
  };
  
  const lang = langMap[locale] || 'es'; // Default a español
  return translations[lang];
}

// Función para formatear duración
function formatDuration(start, end, locale = 'es') {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const t = getTranslations(locale);
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}min`;
  } else {
    return `${diffMinutes}min`;
  }
}

// Función para formatear fecha según idioma
function formatDateTime(date, locale = 'es') {
  const dateObj = new Date(date);
  
  const formats = {
    es: { 
      locale: 'es-ES',
      options: { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }
    },
    ca: { 
      locale: 'ca-ES',
      options: { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false
      }
    },
    en: { 
      locale: 'en-US',
      options: { 
        month: 'short', 
        day: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      }
    }
  };
  
  const lang = locale.startsWith('ca') ? 'ca' : locale.startsWith('en') ? 'en' : 'es';
  const format = formats[lang];
  
  return dateObj.toLocaleString(format.locale, format.options);
}

module.exports = {
  translations,
  getTranslations,
  formatDuration,
  formatDateTime
};
