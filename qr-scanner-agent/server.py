#!/usr/bin/env python3
"""
Servidor HTTP para el servicio de escáner QR
Se integra con el printer-agent para detección automática
"""

import os
import json
import time
import threading
from flask import Flask, request, jsonify
from qr_scanner_service import QrScannerService

app = Flask(__name__)

# Instancia del servicio de escáner QR
qr_service = QrScannerService()

# Estado del servicio
service_status = {
    "scanner_connected": False,
    "last_qr_code": None,
    "last_scan_time": None,
    "total_scans": 0,
    "current_discount": None
}

def on_scanner_status_changed(connected: bool):
    """Callback cuando cambia el estado del escáner"""
    global service_status
    service_status["scanner_connected"] = connected
    print(f"Estado del escáner cambiado: {'Conectado' if connected else 'Desconectado'}")

def on_qr_scanned(qr_code: str):
    """Callback cuando se escanea un código QR"""
    global service_status
    service_status["last_qr_code"] = qr_code
    service_status["last_scan_time"] = time.time()
    service_status["total_scans"] += 1
    
    # Procesar el descuento
    try:
        discount_amount = float(qr_code)
        service_status["current_discount"] = discount_amount
        print(f"Código QR escaneado: {qr_code} (Descuento: {discount_amount}€)")
    except ValueError:
        print(f"Código QR escaneado: {qr_code} (Formato inválido)")
        service_status["current_discount"] = None

@app.route('/v1/health', methods=['GET'])
def health():
    """Endpoint de salud del servicio"""
    return jsonify({
        "ok": True,
        "service": "qr-scanner-agent",
        "timestamp": time.time()
    })

@app.route('/v1/status', methods=['GET'])
def status():
    """Endpoint para obtener el estado del servicio"""
    return jsonify({
        "ok": True,
        "status": service_status,
        "service_status": qr_service.get_status()
    })

@app.route('/v1/scan', methods=['POST'])
def scan_qr():
    """Endpoint para escanear un código QR"""
    try:
        data = request.get_json(force=True, silent=True) or {}
        timeout = data.get('timeout', 30)
        
        if not qr_service.scanner_connected:
            return jsonify({
                "ok": False,
                "error": "No hay escáner QR conectado"
            }), 400
        
        # Escanear código QR
        qr_code = qr_service.scan_qr(timeout=timeout)
        
        if qr_code:
            # Procesar el descuento
            try:
                discount_amount = float(qr_code)
                return jsonify({
                    "ok": True,
                    "qr_code": qr_code,
                    "discount_amount": discount_amount,
                    "timestamp": time.time()
                })
            except ValueError:
                return jsonify({
                    "ok": False,
                    "error": "Formato de descuento inválido"
                }), 400
        else:
            return jsonify({
                "ok": False,
                "error": "Timeout: No se escaneó ningún código QR"
            }), 408
            
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

@app.route('/v1/check-scanner', methods=['GET'])
def check_scanner():
    """Endpoint para verificar si hay un escáner conectado"""
    try:
        is_connected = qr_service.scanner_connected
        return jsonify({
            "ok": True,
            "scanner_connected": is_connected,
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

@app.route('/v1/current-discount', methods=['GET'])
def get_current_discount():
    """Endpoint para obtener el descuento actual"""
    try:
        return jsonify({
            "ok": True,
            "current_discount": service_status["current_discount"],
            "last_scan_time": service_status["last_scan_time"],
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

@app.route('/v1/clear-discount', methods=['POST'])
def clear_discount():
    """Endpoint para limpiar el descuento actual"""
    try:
        service_status["current_discount"] = None
        return jsonify({
            "ok": True,
            "message": "Descuento limpiado",
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

@app.route('/v1/start-monitoring', methods=['POST'])
def start_monitoring():
    """Endpoint para iniciar el monitoreo de dispositivos USB"""
    try:
        qr_service.start_monitoring()
        return jsonify({
            "ok": True,
            "message": "Monitoreo iniciado",
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

@app.route('/v1/stop-monitoring', methods=['POST'])
def stop_monitoring():
    """Endpoint para detener el monitoreo de dispositivos USB"""
    try:
        qr_service.stop_monitoring()
        return jsonify({
            "ok": True,
            "message": "Monitoreo detenido",
            "timestamp": time.time()
        })
    except Exception as e:
        return jsonify({
            "ok": False,
            "error": str(e)
        }), 500

def start_qr_service():
    """Inicia el servicio de escáner QR en background"""
    def run_service():
        qr_service.set_callbacks(on_scanner_status_changed, on_qr_scanned)
        qr_service.start_monitoring()
        
        # Mantener el servicio corriendo
        while True:
            time.sleep(1)
    
    service_thread = threading.Thread(target=run_service, daemon=True)
    service_thread.start()
    print("Servicio de escáner QR iniciado en background")

if __name__ == '__main__':
    # Iniciar el servicio de escáner QR
    start_qr_service()
    
    # Configuración del servidor Flask
    bind_host = os.environ.get('QR_SCANNER_BIND', '127.0.0.1')
    bind_port = int(os.environ.get('QR_SCANNER_PORT', '9102'))
    
    print(f"Servidor HTTP iniciando en {bind_host}:{bind_port}")
    print("Endpoints disponibles:")
    print("  GET  /v1/health - Estado del servicio")
    print("  GET  /v1/status - Estado del escáner")
    print("  GET  /v1/check-scanner - Verificar escáner")
    print("  GET  /v1/current-discount - Obtener descuento actual")
    print("  POST /v1/scan - Escanear código QR")
    print("  POST /v1/clear-discount - Limpiar descuento")
    print("  POST /v1/start-monitoring - Iniciar monitoreo")
    print("  POST /v1/stop-monitoring - Detener monitoreo")
    
    app.run(host=bind_host, port=bind_port, debug=False)

