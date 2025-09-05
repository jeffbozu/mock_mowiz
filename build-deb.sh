#!/bin/bash
set -e

echo "Construyendo paquete .deb para KioskApp..."

# Verificar que estamos en el directorio correcto
if [ ! -f "pubspec.yaml" ]; then
    echo "Error: No se encontró pubspec.yaml. Ejecuta desde el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Flutter esté disponible
if ! command -v flutter &> /dev/null; then
    echo "Error: Flutter no está disponible. Instala Flutter primero."
    exit 1
fi

# Limpiar builds anteriores
echo "Limpiando builds anteriores..."
flutter clean
rm -rf build/linux

# Construir para Linux
echo "Construyendo aplicación para Linux..."
flutter build linux --release

# Verificar que la build se completó
if [ ! -d "build/linux/x64/release/bundle" ]; then
    echo "Error: La build de Linux falló. Verifica los errores."
    exit 1
fi

# Instalar dependencias de empaquetado si no están
if ! command -v dpkg-buildpackage &> /dev/null; then
    echo "Instalando dependencias de empaquetado..."
    sudo apt-get update
    sudo apt-get install -y build-essential devscripts debhelper
fi

# Construir el paquete .deb
echo "Empaquetando en .deb..."
dpkg-buildpackage -b -us -uc

# Verificar que se creó el .deb
if [ -f "../kioskapp_1.0.0-1_amd64.deb" ]; then
    echo "✅ Paquete .deb creado exitosamente: kioskapp_1.0.0-1_amd64.deb"
    echo ""
    echo "Para instalar en Linux:"
    echo "  sudo dpkg -i kioskapp_1.0.0-1_amd64.deb"
    echo ""
    echo "La instalación será 100% automática:"
echo "  - App Flutter instalada en /opt/kioskapp"
echo "  - Printer-agent configurado y activo (puerto 9101)"
echo "  - QR Scanner Agent configurado y activo (puerto 9102)"
echo "  - Servicios systemd habilitados"
echo "  - Reglas udev para puertos serie y escáneres USB"
echo "  - Solo conectar impresora serie y escáner QR USB"
echo "  - Botón 'Escanear QR' funcional con descuentos automáticos"
echo "  - Botón 'Imprimir Recibo' funcional con impresora térmica"
    echo ""
    echo "Funcionalidades incluidas:"
echo "  - Botón 'Escanear QR' en MowizTimePage"
echo "  - Descuentos automáticos (ej: QR '-20' = descuento 20€)"
echo "  - Detección automática de escáneres QR USB"
echo "  - Botón 'Imprimir Recibo' en MowizSuccessPage"
echo "  - Impresión automática en impresora térmica serie/USB"
echo "  - Tickets con QR y formato profesional"
echo "  - Integración completa con printer-agent y qr-scanner-agent"
else
    echo "❌ Error: No se pudo crear el paquete .deb"
    exit 1
fi
