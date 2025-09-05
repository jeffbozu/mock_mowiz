# QR Scanner Agent

Agente de escáner QR para KioskApp que detecta automáticamente escáneres USB y lee códigos QR con descuentos.

## Características

- **Detección automática** de escáneres QR USB conectados
- **Lectura en tiempo real** de códigos QR
- **Procesamiento de descuentos** en formato `-X` o `-X.XX` (ej: `-1`, `-0.90`)
- **Integración automática** con la aplicación Flutter
- **Instalación automática** en Linux con todas las dependencias

## Formato de Códigos QR

Los códigos QR deben contener descuentos en el siguiente formato:
- `-1` = Descuento de 1€
- `-0.90` = Descuento de 0.90€
- `-5.50` = Descuento de 5.50€

**Importante**: El precio final nunca será negativo, el mínimo es 0.00€.

## Instalación Automática

### En Linux (Recomendado)

El agente se instala automáticamente cuando se instala KioskApp:

```bash
# El paquete Debian instala automáticamente:
# - Todas las dependencias del sistema
# - Reglas udev para permisos USB
# - Servicio systemd
# - Entorno virtual Python
```

### Instalación Manual

Si necesitas instalar manualmente:

```bash
cd qr-scanner-agent
sudo ./install_linux.sh
```

## Dependencias del Sistema

El script de instalación instala automáticamente:

- **Python 3** con pip y venv
- **Bibliotecas de desarrollo**: libudev-dev, libevdev-dev, libinput-dev
- **Bibliotecas USB**: libusb-1.0-0-dev, libhidapi-dev
- **Herramientas**: udev, usbutils, hwdata

## Dependencias Python

```
Flask==3.0.3
pyudev==0.24.1
evdev==1.6.1
python-evdev==1.6.1
```

## Configuración

### Variables de Entorno

- `QR_SCANNER_BIND`: Host de binding (default: 127.0.0.1)
- `QR_SCANNER_PORT`: Puerto del servicio (default: 9102)

### Reglas UDEV

Se crean automáticamente reglas para:
- Escáneres genéricos USB
- Dispositivos HID
- Fabricantes específicos: Honeywell, Symbol/Zebra, Datalogic, Cognex, Keyence, Omron

## Uso

### Servicio HTTP

El agente expone una API HTTP en `http://127.0.0.1:9102`:

```bash
# Verificar estado del servicio
curl http://127.0.0.1:9102/v1/health

# Verificar si hay escáner conectado
curl http://127.0.0.1:9102/v1/check-scanner

# Escanear código QR
curl -X POST http://127.0.0.1:9102/v1/scan \
  -H "Content-Type: application/json" \
  -d '{"timeout": 30}'

# Obtener descuento actual
curl http://127.0.0.1:9102/v1/current-discount

# Limpiar descuento
curl -X POST http://127.0.0.1:9102/v1/clear-discount
```

### Desde Flutter

```dart
import 'qr_scanner_service.dart';

// Verificar si el escáner está conectado
final isConnected = await QrScannerService.isScannerConnected();

// Escanear código QR
final discount = await QrScannerService.scanQrCode(timeout: 30);

// Obtener descuento actual
final currentDiscount = await QrScannerService.getCurrentDiscount();

// Limpiar descuento
await QrScannerService.clearDiscount();
```

## Detección de Escáneres

El agente usa múltiples métodos para detectar escáneres:

1. **pyudev**: Detección avanzada de dispositivos USB
2. **evdev**: Acceso directo a dispositivos de entrada
3. **Detección básica**: Comandos del sistema (lsusb, /dev/input)

## Monitoreo Automático

- **Detección en tiempo real** de conexión/desconexión de escáneres
- **Reconexión automática** cuando se reconecta un escáner
- **Logs detallados** para debugging

## Logs

Los logs se escriben en:
- **Systemd**: `journalctl -u qr-scanner-agent.service -f`
- **Archivo**: `/var/log/qr-scanner/` (si está configurado)

## Troubleshooting

### Escáner no detectado

1. Verificar que el escáner esté conectado:
   ```bash
   lsusb
   ls /dev/input/
   ```

2. Verificar permisos:
   ```bash
   sudo chmod 666 /dev/input/event*
   ```

3. Verificar reglas udev:
   ```bash
   sudo udevadm control --reload-rules
   sudo udevadm trigger
   ```

### Error de permisos

```bash
# Añadir usuario al grupo input
sudo usermod -a -G input $USER

# O cambiar permisos temporalmente
sudo chmod 666 /dev/input/event*
```

### Servicio no inicia

```bash
# Verificar estado
systemctl status qr-scanner-agent.service

# Ver logs
journalctl -u qr-scanner-agent.service -f

# Reiniciar servicio
sudo systemctl restart qr-scanner-agent.service
```

## Desarrollo

### Estructura del Proyecto

```
qr-scanner-agent/
├── server.py              # Servidor HTTP Flask
├── qr_scanner_service.py  # Lógica del servicio
├── requirements.txt       # Dependencias Python
├── install_linux.sh      # Script de instalación
└── README.md             # Este archivo
```

### Agregar Nuevos Fabricantes

Para agregar soporte para nuevos fabricantes de escáneres:

1. Añadir el vendor ID en `qr_scanner_service.py`
2. Agregar reglas udev específicas en `install_linux.sh`
3. Probar la detección

### Testing

```bash
# Ejecutar servicio manualmente
cd qr-scanner-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 server.py

# Probar endpoints
curl http://127.0.0.1:9102/v1/health
```

## Seguridad

- El servicio solo escucha en localhost (127.0.0.1)
- Usuario dedicado `qrscanner` sin permisos de shell
- Permisos mínimos necesarios para dispositivos USB

## Compatibilidad

- **Sistemas**: Linux (Ubuntu, Debian, CentOS, RHEL)
- **Python**: 3.7+
- **Escáneres**: Cualquier escáner USB que actúe como teclado HID
- **Arquitecturas**: x86_64, ARM64

## Licencia

Este proyecto es parte de KioskApp y sigue la misma licencia.

