# 🌐 Funcionalidades Web de KioskApp

## 🎯 **Descripción General**

KioskApp ahora funciona **100% en modo web** con todas las funcionalidades de impresión de tickets y escáner QR integradas. No necesitas instalar software adicional ni configurar impresoras físicas.

## ✨ **Funcionalidades Web Implementadas**

### 🖨️ **1. Impresión de Tickets Web**
- **Descarga automática** de tickets como PDF
- **Formato profesional** con toda la información del ticket
- **QR incluido** para verificación
- **Funciona en cualquier navegador** (Chrome, Firefox, Safari, Edge)
- **No requiere impresora física**

### 📱 **2. Escáner QR Web**
- **Usa la cámara del dispositivo** (webcam, cámara del móvil)
- **Detección automática** de códigos QR
- **Aplicación de descuentos** en tiempo real
- **Interfaz intuitiva** con botones de escaneo
- **100% compatible** con la funcionalidad desktop

## 🚀 **Cómo Usar en Web**

### **Imprimir Ticket:**
1. Completa el proceso de pago
2. En la página de éxito, haz clic en **"Imprimir Tiquet"**
3. El PDF se descarga automáticamente
4. El archivo incluye: matrícula, zona, horarios, precio, QR

### **Escanear QR:**
1. En la página de selección de tiempo, haz clic en **"Escanejar QR"**
2. Se abre la cámara del dispositivo
3. Apunta al código QR
4. Haz clic en **"Escanear"**
5. El descuento se aplica automáticamente

## 🔧 **Arquitectura Técnica**

### **Servicios Unificados:**
```
UnifiedService
├── Web Mode (PDF + Cámara)
└── Desktop Mode (Impresora + Escáner USB)
```

### **Detección Automática de Plataforma:**
- **Web**: `kIsWeb = true` → Usa servicios web
- **Desktop**: `Platform.isLinux/Windows/MacOS` → Usa servicios nativos
- **Móvil**: No soportado por ahora

### **Implementaciones:**
- **`PrinterServiceWeb`**: Genera PDFs y descarga
- **`QrScannerServiceWeb`**: Usa cámara del dispositivo
- **`UnifiedService`**: Orquesta automáticamente

## 📱 **Compatibilidad de Navegadores**

| Navegador | Impresión PDF | Cámara QR | Estado |
|-----------|---------------|-----------|---------|
| Chrome    | ✅ Completo   | ✅ Completo | 🟢 Perfecto |
| Firefox   | ✅ Completo   | ✅ Completo | 🟢 Perfecto |
| Safari    | ✅ Completo   | ✅ Completo | 🟢 Perfecto |
| Edge      | ✅ Completo   | ✅ Completo | 🟢 Perfecto |

## 🎨 **Características del PDF del Ticket**

### **Contenido:**
- **Encabezado**: "TICKET DE ESTACIONAMIENTO"
- **Información del vehículo**: Matrícula, zona
- **Horarios**: Inicio, fin, duración
- **Precio**: Total y método de pago
- **QR Code**: Para verificación
- **Pie de página**: Fecha de generación

### **Formato:**
- **Tamaño**: A4 estándar
- **Orientación**: Vertical
- **Colores**: Blanco y negro (compatible con impresión)
- **Fuentes**: Estándar del sistema

## 🔍 **Funcionalidad del Escáner QR Web**

### **Características:**
- **Resolución**: 640x480 (configurable)
- **Cámara preferida**: Trasera (si está disponible)
- **Timeout**: 30 segundos (configurable)
- **Validación**: Solo códigos de descuento válidos

### **Formato de Descuentos:**
- **Patrón**: `-X` o `-X.XX` donde X son números
- **Ejemplos válidos**: `-1`, `-0.90`, `-5.50`, `-20`
- **Límite**: Máximo 100€ de descuento
- **Validación**: Regex automática

## 🛠️ **Instalación y Configuración**

### **1. Dependencias:**
```yaml
dependencies:
  pdf: ^3.10.7               # Generación de PDFs
  universal_html: ^2.2.4     # Compatibilidad HTML
```

### **2. Inicialización Automática:**
```dart
// En main.dart
await UnifiedService.initialize();
```

### **3. Uso en las Páginas:**
```dart
// Imprimir ticket
final success = await UnifiedService.printTicket(
  plate: plate,
  zone: zone,
  start: start,
  end: end,
  price: price,
  method: method,
  qrData: qrData,
);

// Escanear QR
final discount = await UnifiedService.scanQrCode(timeout: 30);
```

## 🌍 **Ventajas del Modo Web**

### **Para Usuarios:**
- ✅ **Sin instalación** de software
- ✅ **Acceso desde cualquier dispositivo**
- ✅ **Funciona en cualquier navegador**
- ✅ **No requiere hardware especial**
- ✅ **Descarga de tickets en PDF**

### **Para Desarrolladores:**
- ✅ **Código unificado** (web + desktop)
- ✅ **Detección automática** de plataforma
- ✅ **Fácil mantenimiento**
- ✅ **Testing simplificado**
- ✅ **Deployment flexible**

## 🔮 **Futuras Mejoras**

### **Escáner QR:**
- [ ] **Detección automática** de códigos (sin botón)
- [ ] **Múltiples formatos** de QR
- [ ] **Historial** de escaneos
- [ ] **Configuración** de cámara

### **Impresión:**
- [ ] **Vista previa** antes de descargar
- [ ] **Múltiples formatos** (PDF, HTML, texto)
- [ ] **Personalización** de tickets
- [ ] **Envío por email** automático

## 🧪 **Testing**

### **Modo Web:**
```bash
# Ejecutar en modo web
flutter run -d chrome

# Build para web
flutter build web
```

### **Verificar Funcionalidades:**
1. **Impresión**: Completar pago y descargar PDF
2. **Escáner**: Usar cámara para escanear QR
3. **Descuentos**: Verificar aplicación automática
4. **Responsive**: Probar en diferentes tamaños

## 📚 **Recursos Adicionales**

- **PDF Generation**: [pdf package](https://pub.dev/packages/pdf)
- **Universal HTML**: [universal_html package](https://pub.dev/packages/universal_html)
- **QR Flutter**: [qr_flutter package](https://pub.dev/packages/qr_flutter)
- **Flutter Web**: [Flutter Web Documentation](https://flutter.dev/web)

## 🆘 **Solución de Problemas**

### **Cámara no funciona:**
- Verificar permisos del navegador
- Usar HTTPS (requerido para cámara)
- Probar en modo incógnito

### **PDF no se descarga:**
- Verificar bloqueador de popups
- Comprobar permisos de descarga
- Probar en navegador diferente

### **QR no se detecta:**
- Verificar iluminación
- Asegurar que el QR esté completo
- Probar con diferentes códigos

---

**🎉 ¡KioskApp ahora funciona perfectamente en web con todas las funcionalidades!**
