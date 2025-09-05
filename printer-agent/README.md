# Printer Agent (Linux)

Servicio local HTTP para impresoras térmicas ESC/POS. La app Flutter lo invoca para imprimir tickets con texto y QR reducido.

## 🎯 **Funcionalidad Automática**

- **Detección automática** de impresoras térmicas en puertos serie/USB
- **Integración completa** con la aplicación Flutter
- **Botón "Imprimir Recibo"** funcional en `MowizSuccessPage`
- **Instalación automática** con el paquete Debian
- **Plug & Play** - solo conectar la impresora y funciona

## Endpoints
- POST `http://127.0.0.1:9101/v1/print-ticket`
- GET `http://127.0.0.1:9101/v1/health`

## Requisitos
- Linux, Python 3.9+
- Paquetes: `libusb-1.0-0`

## Instalación
```bash
# instalación automática
cd printer-agent
sudo bash install.sh

# instalación manual (alternativa)
sudo apt update
sudo apt install -y python3-venv python3-pip libusb-1.0-0
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Ejecutar
```bash
# si usaste install.sh, ya queda como servicio
sudo systemctl status printer-agent

# manual (desarrollo)
source .venv/bin/activate
python server.py
```
Escucha en `127.0.0.1:9101`.

## Permisos y autodetección
Si hay errores de permisos USB, crea reglas udev (ajusta VID/PID a tu impresora):
```bash
sudo sh -c 'cat >/etc/udev/rules.d/99-escpos.rules <<\\EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="0fe6", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0416", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666"
EOF'
sudo udevadm control --reload-rules && sudo udevadm trigger
```

## Configuración (opcional)
Variables:
- `ESC_POS_USB_VID`/`ESC_POS_USB_PID` (hex) para fijar USB.
- `ESC_POS_SERIAL_DEVICE` para puerto serie.
- `ESC_POS_NETWORK_HOST`/`ESC_POS_NETWORK_PORT` para impresora de red.
- `PRINTER_BIND`/`PRINTER_PORT` para IP/puerto del servicio.

## Producción (systemd)
```ini
[Unit]
Description=Printer Agent
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/kiosk/printer-agent
Environment=PRINTER_BIND=127.0.0.1
Environment=PRINTER_PORT=9101
ExecStart=/opt/kiosk/printer-agent/.venv/bin/python server.py
Restart=always
User=kiosk

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now printer-agent
```

## 🔌 **Integración con Flutter**

### Botón "Imprimir Recibo"

El botón está implementado en `lib/mowiz_success_page.dart`:

```dart
FilledButton(
  onPressed: () async {
    SoundHelper.playTap();
    await _printTicket();
  },
  child: AutoSizeText(t('printTicket'), maxLines: 1),
),
```

### Función de Impresión

```dart
Future<void> _printTicket() async {
  try {
    // Pausar temporizador
    _pauseTimer();
    
    // Mostrar indicador
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Imprimiendo ticket...')),
    );
    
    // Calcular fecha de fin
    final endTime = widget.start.add(Duration(minutes: widget.minutes));
    
    // Generar datos QR
    final qrData = jsonEncode({
      'plate': widget.plate,
      'zone': widget.zone,
      'start': widget.start.toIso8601String(),
      'end': endTime.toIso8601String(),
      'price': widget.price,
      'method': widget.method,
      'timestamp': DateTime.now().toIso8601String(),
    });
    
    // Imprimir usando PrinterService
    final success = await PrinterService.printTicket(
      plate: widget.plate,
      zone: widget.zone,
      start: widget.start,
      end: endTime,
      price: widget.price,
      method: widget.method,
      qrData: qrData,
    );
    
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Ticket impreso correctamente'),
          backgroundColor: Colors.green,
        ),
      );
    }
  } catch (e) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('❌ Error: $e'),
        backgroundColor: Colors.red,
      ),
    );
  } finally {
    _startTimer();
  }
}
```

## 🧪 **Pruebas**

Ejecuta el script de prueba para verificar la funcionalidad:

```bash
cd printer-agent
python3 test_print.py
```

## 📋 **Notas**
- El QR se imprime reducido (box_size=3) adecuado para 58 mm.
- Para Epson/Xprinter comunes no necesitas configurar VID/PID; ya se prueban valores típicos.
- **Detección automática** de puertos serie: `/dev/ttyUSB*`, `/dev/ttyACM*`, `/dev/ttyS*`
- **Prioridad de conexión**: Serie → USB → Red
- **Formato del ticket**: Título, líneas de información, QR con datos del ticket


