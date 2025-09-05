#!/bin/bash
set -e

echo "🌐 Construyendo KioskApp para Web..."

# Verificar que estamos en el directorio correcto
if [ ! -f "pubspec.yaml" ]; then
    echo "❌ Error: No se encontró pubspec.yaml. Ejecuta desde el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Flutter esté disponible
if ! command -v flutter &> /dev/null; then
    echo "❌ Error: Flutter no está disponible. Instala Flutter primero."
    exit 1
fi

# Limpiar builds anteriores
echo "🧹 Limpiando builds anteriores..."
flutter clean
rm -rf build/web

# Obtener dependencias
echo "📦 Obteniendo dependencias..."
flutter pub get

# Construir para web
echo "🔨 Construyendo aplicación para Web..."
flutter build web --release --web-renderer html

# Verificar que la build se completó
if [ ! -d "build/web" ]; then
    echo "❌ Error: La build de Web falló. Verifica los errores."
    exit 1
fi

echo ""
echo "✅ Build de Web completada exitosamente!"
echo ""
echo "📁 Archivos generados en: build/web/"
echo ""
echo "🚀 Para probar localmente:"
echo "  cd build/web"
echo "  python3 -m http.server 8000"
echo "  # Luego abre http://localhost:8000 en tu navegador"
echo ""
echo "🌍 Para desplegar en producción:"
echo "  - Sube el contenido de build/web/ a tu servidor web"
echo "  - Asegúrate de que tu servidor soporte SPA (Single Page Application)"
echo "  - Configura HTTPS para funcionalidades de cámara"
echo ""
echo "✨ Funcionalidades Web incluidas:"
echo "  ✅ Impresión de tickets como PDF (descarga automática)"
echo "  ✅ Escáner QR usando cámara del dispositivo"
echo "  ✅ Aplicación automática de descuentos"
echo "  ✅ Interfaz responsive para todos los dispositivos"
echo "  ✅ Compatible con Chrome, Firefox, Safari, Edge"
echo ""
echo "🔧 Configuración automática:"
echo "  - Detección automática de plataforma (Web/Desktop)"
echo "  - Servicios unificados para máxima compatibilidad"
echo "  - No requiere configuración adicional"
echo ""
echo "📱 Prueba las funcionalidades:"
echo "  1. Completa un pago y descarga el ticket PDF"
echo "  2. Usa la cámara para escanear códigos QR"
echo "  3. Verifica que los descuentos se apliquen automáticamente"
echo ""
echo "🎉 ¡KioskApp está lista para funcionar en web!"
