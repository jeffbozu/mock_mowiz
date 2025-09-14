# WhatsApp Service para Meypark

Servicio mejorado para envío de mensajes de WhatsApp usando Twilio.

## Características

- ✅ Validación robusta de números de teléfono
- ✅ Formateo automático de números internacionales
- ✅ Manejo de errores específicos de Twilio
- ✅ Fallback a simulación cuando es necesario
- ✅ Logging detallado para debugging
- ✅ Endpoints de diagnóstico y configuración

## Configuración

### Variables de Entorno Requeridas

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
PORT=10000
NODE_ENV=production
```

### Configuración en Render

1. Ve a tu servicio en Render Dashboard
2. En la sección "Environment", agrega las variables:
   - `TWILIO_ACCOUNT_SID`: Tu Account SID de Twilio
   - `TWILIO_AUTH_TOKEN`: Tu Auth Token de Twilio
   - `TWILIO_WHATSAPP_FROM`: Tu número de WhatsApp de Twilio (formato: whatsapp:+1234567890)

## Endpoints

### POST /v1/whatsapp/send
Envía un mensaje de WhatsApp.

**Request:**
```json
{
  "phone": "+34612345678",
  "ticket": {
    "plate": "1234ABC",
    "zone": "coche",
    "start": "2024-01-01T10:00:00Z",
    "end": "2024-01-01T12:00:00Z",
    "duration": "2 horas",
    "method": "tarjeta",
    "price": 2.50
  },
  "locale": "es"
}
```

**Response:**
```json
{
  "success": true,
  "message": "WhatsApp message sent successfully",
  "messageId": "SM1234567890abcdef",
  "status": "sent",
  "formattedMessage": "🎫 Ticket de Estacionamiento...",
  "to": "whatsapp:+34612345678"
}
```

### GET /health
Verifica el estado del servicio.

### GET /v1/config
Obtiene la configuración del servicio.

### POST /v1/whatsapp/test
Prueba la validación de números de teléfono.

## Mejoras Implementadas

1. **Validación de Números**: Valida formato internacional de números de teléfono
2. **Formateo Automático**: Convierte números españoles a formato internacional
3. **Manejo de Errores**: Errores específicos para diferentes códigos de Twilio
4. **Fallback Inteligente**: Simulación solo cuando es apropiado
5. **Logging Mejorado**: Logs detallados para debugging
6. **Endpoints de Diagnóstico**: Herramientas para verificar configuración

## Códigos de Error

- `MISSING_DATA`: Faltan datos requeridos
- `INVALID_PHONE`: Formato de número inválido
- `NOT_WHATSAPP_NUMBER`: Número no es de WhatsApp
- `WHATSAPP_UNAVAILABLE`: WhatsApp no disponible
- `TWILIO_ERROR`: Error general de Twilio
- `INTERNAL_ERROR`: Error interno del servidor

## Testing

```bash
# Probar validación de número
curl -X POST https://render-whatsapp-tih4.onrender.com/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "612345678"}'

# Verificar salud del servicio
curl https://render-whatsapp-tih4.onrender.com/health

# Ver configuración
curl https://render-whatsapp-tih4.onrender.com/v1/config
```
