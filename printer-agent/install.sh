#!/usr/bin/env bash
set -euo pipefail

DEST_DIR="/opt/kiosk/printer-agent"
USER_NAME="kiosk"
SERVICE_NAME="printer-agent.service"

if [[ $EUID -ne 0 ]]; then
  echo "Este script debe ejecutarse como root (sudo)." >&2
  exit 1
fi

command -v python3 >/dev/null 2>&1 || { echo "python3 no encontrado" >&2; exit 1; }
apt-get update
apt-get install -y python3-venv python3-pip libusb-1.0-0
usermod -aG dialout "$USER_NAME" || true

id -u "$USER_NAME" >/dev/null 2>&1 || useradd -m -s /bin/bash "$USER_NAME"
mkdir -p "$DEST_DIR"
rsync -a --delete ./ "$DEST_DIR"/
chown -R "$USER_NAME":"$USER_NAME" "$DEST_DIR"

sudo -u "$USER_NAME" bash -c "cd '$DEST_DIR' && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt"

cat >/etc/systemd/system/$SERVICE_NAME <<EOF
[Unit]
Description=Printer Agent
After=network-online.target

[Service]
Type=simple
WorkingDirectory=$DEST_DIR
Environment=PRINTER_BIND=127.0.0.1
Environment=PRINTER_PORT=9101
ExecStart=$DEST_DIR/.venv/bin/python server.py
Restart=always
User=$USER_NAME

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now $SERVICE_NAME

# instalar reglas udev para permisos USB/Serial
install -m 0644 "$DEST_DIR/udev/99-escpos.rules" /etc/udev/rules.d/99-escpos.rules
cat >/etc/udev/rules.d/99-serial.rules <<EOF
KERNEL=="ttyUSB*", MODE:="0666"
KERNEL=="ttyACM*", MODE:="0666"
EOF
udevadm control --reload-rules
udevadm trigger

echo "Instalación completada. Servicio activo: $SERVICE_NAME"
echo "Comprueba: curl http://127.0.0.1:9101/v1/health"


