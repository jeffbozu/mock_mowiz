# 📧 Configuración de AWS SES para KioskApp

## 🎯 **Descripción**

Este documento explica cómo configurar AWS SES (Simple Email Service) para que KioskApp pueda enviar emails con tickets de estacionamiento usando plantillas personalizables.

## 🔑 **Credenciales AWS (Ya Configuradas)**

```
Access Key ID: AKIAV7GV7TVYIFYWNCAY
Secret Access Key: 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
Region: eu-west-3
```

## 🚀 **Pasos de Configuración en AWS**

### **1. Verificar Cuenta AWS SES**

1. **Ir a AWS Console** → **SES (Simple Email Service)**
2. **Seleccionar región**: `eu-west-3` (París)
3. **Verificar estado de la cuenta**:
   - Si está en "Sandbox": Solo puedes enviar a emails verificados
   - Si está en "Production": Puedes enviar a cualquier email

### **2. Verificar Email Individual ✅ COMPLETADO**

Tu email ya está verificado en AWS SES:

- **Email verificado**: `jbolanos.meypar@gmail.com`
- **Estado**: ✅ Verificado y listo para usar
- **Región**: `eu-west-3` (París)

### **3. Verificar Dominio de Email (Opcional)**

Si quieres enviar desde un dominio personalizado:

1. **En SES Console** → **Verified identities**
2. **Create identity** → **Domain**
3. **Ingresar dominio**: `meypar.com` (o tu dominio)
4. **Seguir instrucciones de verificación DNS**

### **4. Configurar Políticas de Envío**

1. **En SES Console** → **Account dashboard**
2. **Request production access** (si estás en sandbox)
3. **Configurar límites de envío** según tus necesidades

## 📧 **Funcionalidades del Email Service**

### **Plantilla HTML Profesional:**
- ✅ **Header personalizado** con logo KioskApp
- ✅ **Información completa** del ticket
- ✅ **Diseño responsive** para móviles
- ✅ **Código QR** incluido
- ✅ **Información legal** y normativa
- ✅ **Mensajes personalizables**

### **Versión Texto Plano:**
- ✅ **Compatible** con todos los clientes de email
- ✅ **Información estructurada** del ticket
- ✅ **Formato legible** en cualquier dispositivo

## 🔧 **Configuración en el Código**

### **1. Email de Origen Configurado ✅**

Tu email ya está configurado en `lib/services/email_service.dart`:

```dart
'Source': 'jbolanos.meypar@gmail.com', // Email verificado en AWS SES
```

**¡No necesitas cambiar nada más!**

### **2. Personalizar Plantilla:**

```dart
final success = await EmailService.sendTicketEmail(
  recipientEmail: email,
  plate: widget.plate,
  zone: widget.zone,
  start: widget.start,
  end: endTime,
  price: widget.price,
  method: widget.method,
  qrData: qrData,
  customSubject: 'Tu Ticket - ${widget.plate}', // Personalizable
  customMessage: 'Mensaje personalizado aquí',   // Personalizable
);
```

## 📱 **Cómo Funciona en la App**

### **1. Usuario Completa Pago:**
- Se muestra página de éxito
- Botón "Enviar por Email" disponible

### **2. Usuario Hace Clic en "Enviar por Email":**
- Se abre diálogo para ingresar email
- Se valida formato del email

### **3. Se Envía el Email:**
- **Asunto**: "Tu Ticket de Estacionamiento - [MATRÍCULA]"
- **Contenido**: Plantilla HTML completa con ticket
- **QR**: Código de verificación incluido
- **Legal**: Normativa y términos del estacionamiento

### **4. Confirmación:**
- Se muestra diálogo de éxito
- Usuario recibe email con ticket completo

## 🎨 **Personalización de Plantillas**

### **Cambiar Colores:**
```css
.logo {
    color: #E62144; /* Color principal */
}
.price-highlight {
    background-color: #E62144; /* Color de precio */
}
```

### **Cambiar Logo:**
```html
<div class="logo">🚗 KioskApp</div>
<!-- Cambiar por: -->
<div class="logo">
    <img src="https://tu-dominio.com/logo.png" alt="Logo" height="40">
</div>
```

### **Agregar Información Legal:**
```html
<div class="legal-notice">
    <strong>⚠️ Normativa Municipal:</strong><br>
    • [Tu normativa específica aquí]<br>
    • [Más información legal]<br>
</div>
```

## 🧪 **Testing y Verificación**

### **1. Probar en Desarrollo:**
```bash
flutter run -d chrome
# Completar pago y enviar email
```

### **2. Verificar en AWS SES:**
- **SES Console** → **Sending statistics**
- **Verificar emails enviados**
- **Revisar logs de errores**

### **3. Verificar en Cliente de Email:**
- **Revisar bandeja de entrada**
- **Verificar formato HTML**
- **Probar en diferentes dispositivos**

## 🆘 **Solución de Problemas**

### **Error: "Email address not verified"**
- **Solución**: Verificar email en AWS SES
- **Verificar**: Dominio o email individual

### **Error: "Account is in sandbox mode"**
- **Solución**: Solicitar acceso a producción
- **Alternativa**: Solo enviar a emails verificados

### **Error: "Quota exceeded"**
- **Solución**: Aumentar límites en AWS SES
- **Verificar**: Uso actual vs límites

### **Email no llega:**
- **Verificar**: Spam/junk folder
- **Revisar**: Logs de AWS SES
- **Probar**: Con email diferente

## 🔒 **Seguridad y Mejores Prácticas**

### **1. Credenciales:**
- ✅ **No compartir** en código público
- ✅ **Usar variables de entorno** en producción
- ✅ **Rotar claves** regularmente

### **2. Límites de Envío:**
- ✅ **Configurar límites** por hora/día
- ✅ **Monitorear** uso y costos
- ✅ **Implementar** rate limiting

### **3. Validación:**
- ✅ **Verificar formato** de email
- ✅ **Sanitizar** datos de entrada
- ✅ **Implementar** captcha si es necesario

## 💰 **Costos AWS SES**

### **Precios (eu-west-3):**
- **Primeros 62,000 emails/mes**: GRATIS
- **Después**: $0.10 por 1,000 emails
- **Almacenamiento**: $0.09 por GB/mes

### **Estimación para KioskApp:**
- **100 tickets/día** = 3,000 emails/mes
- **Costo**: GRATIS (dentro del tier gratuito)
- **Escalabilidad**: Hasta 62,000 emails/mes gratis

## 🚀 **Próximos Pasos**

### **1. Verificar Dominio:**
- Configurar DNS para `kioskapp.com`
- Verificar en AWS SES

### **2. Solicitar Producción:**
- Salir del modo sandbox
- Enviar a cualquier email

### **3. Monitoreo:**
- Configurar CloudWatch
- Alertas de errores

### **4. Personalización:**
- Ajustar plantilla según tu marca
- Agregar información legal específica

---

## 🎉 **¡Configuración Completada!**

Tu KioskApp ahora puede:
- ✅ **Enviar emails** con tickets completos
- ✅ **Plantillas personalizables** HTML y texto
- ✅ **Códigos QR** incluidos
- ✅ **Información legal** y normativa
- ✅ **Diseño responsive** profesional

**¿Necesitas ayuda con algún paso específico?**
