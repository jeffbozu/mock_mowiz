import os
import io
from flask import Flask, request, jsonify
from escpos.printer import Usb, Serial, Network
import socket
import qrcode


app = Flask(__name__)


def _make_printer():
    vid = os.environ.get('ESC_POS_USB_VID')
    pid = os.environ.get('ESC_POS_USB_PID')
    net_host = os.environ.get('ESC_POS_NETWORK_HOST')
    net_port = int(os.environ.get('ESC_POS_NETWORK_PORT', '9100'))
    net_scan_prefix = os.environ.get('ESC_POS_NETWORK_SCAN_PREFIX')  # e.g., 192.168.1.
    serial_dev = os.environ.get('ESC_POS_SERIAL_DEVICE')
    serial_baud = int(os.environ.get('ESC_POS_SERIAL_BAUD', '9600'))

    # Priority for this project: serial → usb → network
    if serial_dev:
        return Serial(
            devfile=serial_dev,
            baudrate=serial_baud,
            bytesize=8,
            parity='N',
            stopbits=1,
            timeout=2,
        )

    # Try some common USB vendors if not specified
    common = [
        (0x0fe6, 0x811e),  # Xprinter generic
        (0x0416, 0x5011),  # Winbond/Nuvoton based
        (0x04b8, 0x0202),  # Epson TM
    ]
    last_err = None
    for v, p in common:
        try:
            return Usb(v, p, timeout=3)
        except Exception as e:  # noqa: BLE001
            last_err = e

    # Try common serial device paths if not specified
    for dev in [
        '/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyUSB2', '/dev/ttyUSB3',
        '/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyS0', '/dev/ttyS1',
    ]:
        try:
            return Serial(
                devfile=dev,
                baudrate=serial_baud,
                bytesize=8,
                parity='N',
                stopbits=1,
                timeout=2,
            )
        except Exception as e:  # noqa: BLE001
            last_err = e

    if net_host:
        return Network(net_host, port=net_port, timeout=3)

    # Network autodiscovery (very lightweight): scan /24 for port 9100 if prefix provided
    if net_scan_prefix:
        for i in range(1, 255):
            host = f"{net_scan_prefix}{i}"
            try:
                with socket.create_connection((host, net_port), timeout=0.15):
                    return Network(host, port=net_port, timeout=3)
            except Exception:
                continue

    raise RuntimeError(f'No printer found ({last_err})')


def _print_ticket(data):
    title = data.get('title') or 'Ticket'
    lines = data.get('lines') or []
    qr_data = data.get('qrData')

    p = _make_printer()
    # Header
    p.set(align='center', bold=True, width=2, height=2)
    p.textln(title)
    p.set(align='left', bold=False, width=1, height=1)
    p.textln('-' * 32)

    for line in lines:
        p.textln(str(line))

    p.textln('-' * 32)

    # Small QR for 58mm: module_size ~3-4
    if qr_data:
        # Render QR to image to ensure compatibility
        qr = qrcode.QRCode(border=1, box_size=3)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        p.image(img, center=True)

    p.textln('\n')
    p.cut()


@app.get('/v1/health')
def health():
    return jsonify({'ok': True})


@app.post('/v1/print-ticket')
def print_ticket():
    try:
        data = request.get_json(force=True, silent=False)
        _print_ticket(data or {})
        return jsonify({'ok': True})
    except Exception as e:  # noqa: BLE001
        return jsonify({'ok': False, 'error': str(e)}), 500


if __name__ == '__main__':
    bind = os.environ.get('PRINTER_BIND', '127.0.0.1')
    port = int(os.environ.get('PRINTER_PORT', '9101'))
    app.run(host=bind, port=port)


