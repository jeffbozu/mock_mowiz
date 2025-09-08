const axios = require('axios');

// Configuración de prueba
const SERVER_URL = 'http://localhost:3000';

// Datos de prueba del ticket
const testTicketData = {
  recipientEmail: 'jbolanos.meypar@gmail.com', // Email de prueba
  plate: '1234ABC',
  zone: 'green',
  start: new Date().toISOString(),
  end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas después
  price: 3.50,
  method: 'card',
  customSubject: 'Prueba - Ticket de Estacionamiento KioskApp',
  customMessage: 'Este es un email de prueba del sistema KioskApp',
  qrData: 'ticket|plate:1234ABC|zone:green|test:true',
  
  // Credenciales de email (opcional, también se pueden usar variables de entorno)
  senderEmail: 'tu-email@gmail.com', // Cambiar por tu email
  senderPassword: 'tu-contraseña-app', // Cambiar por tu contraseña de aplicación
  provider: 'gmail' // o 'hotmail', 'outlook'
};

async function testEmailServer() {
  console.log('🧪 Iniciando pruebas del servidor de email...\n');

  try {
    // Prueba 1: Verificar que el servidor esté corriendo
    console.log('1️⃣ Verificando estado del servidor...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('✅ Servidor activo:', healthResponse.data);
    console.log('');

    // Prueba 2: Obtener información del servidor
    console.log('2️⃣ Obteniendo información del servidor...');
    const infoResponse = await axios.get(`${SERVER_URL}/`);
    console.log('✅ Información del servidor:', infoResponse.data);
    console.log('');

    // Prueba 3: Enviar email de prueba
    console.log('3️⃣ Enviando email de prueba...');
    console.log('📧 Destinatario:', testTicketData.recipientEmail);
    console.log('🚗 Matrícula:', testTicketData.plate);
    
    const emailResponse = await axios.post(`${SERVER_URL}/api/send-email`, testTicketData);
    console.log('✅ Email enviado exitosamente:', emailResponse.data);
    console.log('');

    console.log('🎉 Todas las pruebas pasaron correctamente!');
    console.log('📬 Revisa tu bandeja de entrada para ver el email del ticket.');

  } catch (error) {
    console.error('❌ Error en las pruebas:');
    
    if (error.response) {
      console.error('📄 Código de estado:', error.response.status);
      console.error('📄 Respuesta del servidor:', error.response.data);
    } else if (error.request) {
      console.error('🔌 No se pudo conectar al servidor. ¿Está corriendo en el puerto 3000?');
    } else {
      console.error('🐛 Error:', error.message);
    }
  }
}

// Función para probar diferentes proveedores de email
async function testEmailProviders() {
  const providers = [
    { name: 'Gmail', provider: 'gmail' },
    { name: 'Hotmail', provider: 'hotmail' },
    { name: 'Outlook', provider: 'outlook' }
  ];

  console.log('🧪 Probando diferentes proveedores de email...\n');

  for (const { name, provider } of providers) {
    try {
      console.log(`📧 Probando ${name}...`);
      
      const testData = {
        ...testTicketData,
        provider,
        recipientEmail: 'test@example.com', // Cambiar por tu email
        customSubject: `Prueba ${name} - Ticket KioskApp`
      };

      const response = await axios.post(`${SERVER_URL}/api/send-email`, testData);
      console.log(`✅ ${name} funcionando correctamente:`, response.data.message);
      
    } catch (error) {
      console.error(`❌ Error con ${name}:`, error.response?.data?.error || error.message);
    }
    
    console.log('');
  }
}

// Ejecutar pruebas
if (require.main === module) {
  console.log('🚀 Iniciando pruebas del servidor de email KioskApp\n');
  
  // Verificar configuración
  console.log('⚙️ Configuración de prueba:');
  console.log('🌐 URL del servidor:', SERVER_URL);
  console.log('📧 Email de prueba:', testTicketData.recipientEmail);
  console.log('🔑 Proveedor:', testTicketData.provider);
  console.log('');
  
  testEmailServer()
    .then(() => {
      console.log('\n🔄 ¿Quieres probar otros proveedores? Ejecuta: node test-email.js --providers');
    })
    .catch(console.error);
}

// Exportar funciones para uso en otros archivos
module.exports = {
  testEmailServer,
  testEmailProviders,
  testTicketData
};
