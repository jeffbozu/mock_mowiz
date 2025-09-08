# KioskApp Email Server

Servidor proxy para envío de emails de tickets de estacionamiento desde Flutter Web.

## 🚀 Características

- ✅ Compatible con Gmail, Hotmail/Outlook
- ✅ Plantillas HTML responsivas
- ✅ Rate limiting (10 emails por 15 min)
- ✅ Validación de emails
- ✅ Manejo de errores robusto
- ✅ Listo para Render deployment

## 📦 Instalación Local

```bash
# Instalar dependencias
npm install

# Copiar configuración
cp .env.example .env

# Editar .env con tus credenciales
# Para Gmail: usar contraseña de aplicación
# Para Hotmail: usar contraseña normal
```

## ⚙️ Configuración

### Gmail (Recomendado)
1. Activar verificación en 2 pasos en Google
2. Generar "Contraseña de aplicación"
3. Usar esa contraseña en `.env`:

```env
EMAIL_PROVIDER=gmail
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=abcd-efgh-ijkl-mnop
```

### Hotmail/Outlook
```env
EMAIL_PROVIDER=hotmail
EMAIL_USER=tu-email@hotmail.com
EMAIL_PASSWORD=tu-contraseña-normal
```

## 🧪 Pruebas Locales

```bash
# Iniciar servidor
npm start

# En otra terminal, probar
npm test
```

## 📡 API Endpoints

### POST /api/send-email
Envía un ticket por email.

**Body:**
```json
{
  "recipientEmail": "cliente@example.com",
  "plate": "1234ABC",
  "zone": "green",
  "start": "2024-01-01T10:00:00Z",
  "end": "2024-01-01T12:00:00Z",
  "price": 3.50,
  "method": "card",
  "customSubject": "Tu Ticket",
  "customMessage": "Mensaje personalizado",
  "qrData": "ticket|plate:1234ABC|...",
  "senderEmail": "opcional@gmail.com",
  "senderPassword": "opcional-password",
  "provider": "gmail"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email enviado correctamente",
  "messageId": "message-id"
}
```

### GET /health
Estado del servidor.

### GET /
Información del servidor.

## 🌐 Despliegue en Render

1. Crear cuenta en [render.com](https://render.com)
2. Conectar repositorio GitHub
3. Configurar variables de entorno:
   - `EMAIL_PROVIDER=gmail`
   - `EMAIL_USER=tu-email@gmail.com`
   - `EMAIL_PASSWORD=tu-contraseña-app`
4. Deploy automático

## 🔧 Integración con Flutter

```dart
// En email_service.dart
static const String _backendUrl = 'https://tu-app.onrender.com';

static Future<bool> sendTicketEmail({...}) async {
  final response = await http.post(
    Uri.parse('$_backendUrl/api/send-email'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({...}),
  );
  return response.statusCode == 200;
}
```

## 🛡️ Seguridad

- Rate limiting: 10 emails por IP cada 15 minutos
- Validación de emails
- Headers de seguridad con Helmet
- CORS configurado
- Credenciales en variables de entorno

## 📝 Logs

El servidor registra:
- ✅ Emails enviados exitosamente
- ❌ Errores de envío
- 🔒 Intentos bloqueados por rate limit
- 🌐 Requests recibidos

## 🐛 Troubleshooting

### Error: "Credenciales incorrectas"
- Gmail: Verificar contraseña de aplicación
- Hotmail: Verificar contraseña normal

### Error: "No se pudo conectar"
- Verificar conexión a internet
- Verificar configuración SMTP

### Error: "Rate limit excedido"
- Esperar 15 minutos
- Implementar cola de emails si es necesario

## 📞 Soporte

Para problemas o mejoras, crear issue en el repositorio.
