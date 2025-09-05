#!/bin/bash
# Script de instalación automática para el agente de escáner QR en Linux
# Instala todas las dependencias necesarias para detectar escáneres USB

set -e

echo "=== Instalación del Agente de Escáner QR ==="
echo "Este script instalará todas las dependencias necesarias para detectar escáneres QR USB"

# Verificar que estamos en Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "Error: Este script solo funciona en Linux"
    exit 1
fi

# Verificar que tenemos permisos de root
if [[ $EUID -ne 0 ]]; then
    echo "Error: Este script debe ejecutarse como root (sudo)"
    exit 1
fi

# Actualizar repositorios
echo "Actualizando repositorios..."
apt-get update

# Instalar dependencias del sistema
echo "Instalando dependencias del sistema..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libudev-dev \
    libevdev-dev \
    libinput-dev \
    udev \
    usbutils \
    hwdata

# Instalar dependencias específicas para detección USB
echo "Instalando dependencias para detección USB..."
apt-get install -y \
    libusb-1.0-0-dev \
    libhidapi-dev \
    libusb-dev

# Crear entorno virtual Python
echo "Creando entorno virtual Python..."
python3 -m venv .venv
source .venv/bin/activate

# Instalar dependencias Python
echo "Instalando dependencias Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Crear reglas udev para permisos de escáneres
echo "Configurando reglas udev para escáneres..."
cat > /etc/udev/rules.d/99-qr-scanner.rules << 'EOF'
# Reglas para escáneres QR USB
SUBSYSTEM=="usb", ATTR{idVendor}=="*", ATTR{idProduct}=="*", MODE="0666"
SUBSYSTEM=="input", KERNEL=="event*", MODE="0666"
SUBSYSTEM=="hidraw", MODE="0666"

# Reglas específicas para escáneres comunes
# Honeywell
SUBSYSTEM=="usb", ATTR{idVendor}=="0525", MODE="0666"
# Symbol/Zebra
SUBSYSTEM=="usb", ATTR{idVendor}=="05e0", MODE="0666"
# Datalogic
SUBSYSTEM=="usb", ATTR{idVendor}=="05f9", MODE="0666"
# Cognex
SUBSYSTEM=="usb", ATTR{idVendor}=="0b37", MODE="0666"
# Keyence
SUBSYSTEM=="usb", ATTR{idVendor}=="0b4e", MODE="0666"
# Omron
SUBSYSTEM=="usb", ATTR{idVendor}=="0590", MODE="0666"
EOF

# Crear reglas para dispositivos HID
echo "Configurando reglas para dispositivos HID..."
cat > /etc/udev/rules.d/99-hid-devices.rules << 'EOF'
# Reglas para dispositivos HID (teclados, escáneres)
KERNEL=="hidraw*", MODE="0666"
KERNEL=="input*", MODE="0666"
EOF

# Recargar reglas udev
echo "Recargando reglas udev..."
udevadm control --reload-rules
udevadm trigger

# Crear directorio de logs
echo "Creando directorio de logs..."
mkdir -p /var/log/qr-scanner
chmod 755 /var/log/qr-scanner

# Crear usuario para el servicio
echo "Creando usuario para el servicio..."
if ! id "qrscanner" &>/dev/null; then
    useradd -r -s /bin/false -d /opt/qr-scanner qrscanner
fi

# Configurar permisos
echo "Configurando permisos..."
chown -R qrscanner:qrscanner /var/log/qr-scanner
chmod +x server.py
chmod +x qr_scanner_service.py

# Crear servicio systemd
echo "Creando servicio systemd..."
cat > /etc/systemd/system/qr-scanner-agent.service << 'EOF'
[Unit]
Description=QR Scanner Agent Service
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=qrscanner
Group=qrscanner
WorkingDirectory=/opt/qr-scanner
Environment=QR_SCANNER_BIND=127.0.0.1
Environment=QR_SCANNER_PORT=9102
Environment=PYTHONPATH=/opt/qr-scanner/.venv/lib/python3.9/site-packages
ExecStart=/opt/qr-scanner/.venv/bin/python server.py
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Habilitar y arrancar el servicio
echo "Habilitando y arrancando el servicio..."
systemctl daemon-reload
systemctl enable qr-scanner-agent.service
systemctl start qr-scanner-agent.service

# Verificar estado del servicio
echo "Verificando estado del servicio..."
sleep 2
if systemctl is-active --quiet qr-scanner-agent.service; then
    echo "✅ Servicio iniciado correctamente"
else
    echo "❌ Error al iniciar el servicio"
    systemctl status qr-scanner-agent.service
fi

# Instalar herramientas de monitoreo
echo "Instalando herramientas de monitoreo..."
apt-get install -y \
    hwinfo \
    lsusb \
    usbutils

echo ""
echo "=== Instalación completada ==="
echo ""
echo "El agente de escáner QR está instalado y ejecutándose."
echo ""
echo "Comandos útiles:"
echo "  - Ver estado del servicio: systemctl status qr-scanner-agent.service"
echo "  - Ver logs: journalctl -u qr-scanner-agent.service -f"
echo "  - Reiniciar servicio: systemctl restart qr-scanner-agent.service"
echo "  - Ver dispositivos USB: lsusb"
echo "  - Ver dispositivos de entrada: ls /dev/input/"
echo ""
echo "El servicio está disponible en: http://127.0.0.1:9102"
echo "Endpoint de salud: http://127.0.0.1:9102/v1/health"
echo ""
echo "Para probar la detección de escáneres:"
echo "  curl http://127.0.0.1:9102/v1/check-scanner"
echo ""
echo "¡Conecta un escáner QR USB y se detectará automáticamente!"

