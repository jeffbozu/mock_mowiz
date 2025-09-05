#!/usr/bin/env python3
"""
QR Scanner Service para Linux
Detecta automáticamente escáneres QR USB y lee códigos QR con descuentos
"""

import os
import sys
import time
import json
import threading
import re
from typing import Optional, Callable
import subprocess
import signal
import logging

try:
    import evdev
    from evdev import categorize, ecodes
    EVDEV_AVAILABLE = True
except ImportError:
    EVDEV_AVAILABLE = False
    print("Warning: evdev no disponible, usando detección básica")

try:
    import pyudev
    PYUDEV_AVAILABLE = True
except ImportError:
    PYUDEV_AVAILABLE = False
    print("Warning: pyudev no disponible, usando detección básica")

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class QrScannerService:
    def __init__(self):
        self.scanner_connected = False
        self.scanner_device = None
        self.scanner_process = None
        self.on_status_changed: Optional[Callable[[bool], None]] = None
        self.on_qr_scanned: Optional[Callable[[str], None]] = None
        self.monitoring = False
        self.running = True
        self.current_qr_buffer = ""
        self.scanner_thread = None
        
        # Configurar señales para shutdown limpio
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Maneja señales de terminación"""
        logger.info(f"Recibida señal {signum}, terminando...")
        self.running = False
        self.stop_monitoring()
        sys.exit(0)
    
    def set_callbacks(self, on_status_changed: Callable[[bool], None], 
                     on_qr_scanned: Callable[[str], None]):
        """Establece callbacks para cambios de estado y códigos QR"""
        self.on_status_changed = on_status_changed
        self.on_qr_scanned = on_qr_scanned
    
    def start_monitoring(self):
        """Inicia el monitoreo de dispositivos USB para escáneres QR"""
        if self.monitoring:
            return
        
        self.monitoring = True
        logger.info("Iniciando monitoreo de escáneres QR USB...")
        
        # Iniciar thread de monitoreo
        monitor_thread = threading.Thread(target=self._monitor_usb_devices, daemon=True)
        monitor_thread.start()
        
        # Verificar estado inicial
        self._check_scanner_status()
    
    def stop_monitoring(self):
        """Detiene el monitoreo de dispositivos USB"""
        self.monitoring = False
        if self.scanner_thread:
            self.scanner_thread.join(timeout=1)
            self.scanner_thread = None
        logger.info("Monitoreo de escáneres detenido")
    
    def _monitor_usb_devices(self):
        """Monitorea cambios en dispositivos USB para detectar escáneres QR"""
        while self.monitoring and self.running:
            try:
                # Verificar estado del escáner
                current_status = self._check_scanner_status()
                
                # Si cambió el estado, notificar
                if current_status != self.scanner_connected:
                    self.scanner_connected = current_status
                    if self.on_status_changed:
                        self.on_status_changed(current_status)
                    
                    if current_status:
                        logger.info("Escáner QR detectado y conectado")
                        self._start_qr_reading()
                    else:
                        logger.info("Escáner QR desconectado")
                        self._stop_qr_reading()
                
                # Esperar antes de la siguiente verificación
                time.sleep(2)
                
            except Exception as e:
                logger.error(f"Error en monitoreo USB: {e}")
                time.sleep(5)
    
    def _check_scanner_status(self) -> bool:
        """Verifica si hay un escáner QR conectado usando múltiples métodos"""
        try:
            # Método 1: Usar pyudev si está disponible
            if PYUDEV_AVAILABLE:
                if self._check_with_pyudev():
                    return True
            
            # Método 2: Usar evdev si está disponible
            if EVDEV_AVAILABLE:
                if self._check_with_evdev():
                    return True
            
            # Método 3: Detección básica con lsusb y /dev/input
            if self._check_basic_detection():
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error verificando estado del escáner: {e}")
            return False
    
    def _check_with_pyudev(self) -> bool:
        """Verifica escáneres usando pyudev"""
        try:
            context = pyudev.Context()
            for device in context.list_devices(subsystem='input'):
                # Buscar dispositivos HID que podrían ser escáneres
                if device.get('ID_VENDOR_ID') and device.get('ID_MODEL_ID'):
                    vendor = device.get('ID_VENDOR', '').lower()
                    model = device.get('ID_MODEL', '').lower()
                    
                    # Patrones comunes de escáneres QR
                    qr_patterns = ['scanner', 'qr', 'barcode', 'code reader', 'honeywell', 
                                  'symbol', 'datalogic', 'zebra', 'cognex', 'keyence', 'omron']
                    
                    for pattern in qr_patterns:
                        if pattern in vendor or pattern in model:
                            logger.info(f"Escáner QR detectado con pyudev: {vendor} {model}")
                            return True
                    
                    # También verificar dispositivos HID genéricos
                    if 'hid' in vendor or 'hid' in model:
                        logger.info(f"Dispositivo HID detectado: {vendor} {model}")
                        return True
            
            return False
        except Exception as e:
            logger.error(f"Error en detección pyudev: {e}")
            return False
    
    def _check_with_evdev(self) -> bool:
        """Verifica escáneres usando evdev"""
        try:
            # Buscar dispositivos de entrada
            input_devices = []
            for device_path in evdev.list_devices():
                try:
                    device = evdev.InputDevice(device_path)
                    # Verificar si es un teclado (la mayoría de escáneres QR actúan como teclado)
                    if evdev.ecodes.EV_KEY in device.capabilities():
                        input_devices.append(device_path)
                except:
                    continue
            
            if input_devices:
                logger.info(f"Dispositivos de entrada detectados: {len(input_devices)}")
                return True
            
            return False
        except Exception as e:
            logger.error(f"Error en detección evdev: {e}")
            return False
    
    def _check_basic_detection(self) -> bool:
        """Detección básica usando comandos del sistema"""
        try:
            # Verificar dispositivos USB
            result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                usb_devices = result.stdout.lower()
                
                # Buscar patrones de escáneres
                qr_patterns = ['scanner', 'qr', 'barcode', 'code reader', 'honeywell', 
                              'symbol', 'datalogic', 'zebra', 'cognex', 'keyence', 'omron']
                
                for pattern in qr_patterns:
                    if pattern in usb_devices:
                        logger.info(f"Escáner QR detectado con lsusb: {pattern}")
                        return True
            
            # Verificar dispositivos de entrada
            try:
                input_devices = subprocess.run(['ls', '/dev/input/'], capture_output=True, text=True, timeout=5)
                if input_devices.returncode == 0:
                    devices = input_devices.stdout.strip().split('\n')
                    if len(devices) > 2:  # Más de solo event0 y mice
                        logger.info("Dispositivos de entrada detectados")
                        return True
            except:
                pass
            
            return False
            
        except Exception as e:
            logger.error(f"Error en detección básica: {e}")
            return False
    
    def _start_qr_reading(self):
        """Inicia la lectura de códigos QR desde el escáner"""
        if self.scanner_thread and self.scanner_thread.is_alive():
            return
        
        try:
            logger.info("Iniciando lectura de códigos QR...")
            
            # Iniciar thread de lectura
            self.scanner_thread = threading.Thread(target=self._read_qr_codes, daemon=True)
            self.scanner_thread.start()
            
        except Exception as e:
            logger.error(f"Error iniciando lectura QR: {e}")
    
    def _stop_qr_reading(self):
        """Detiene la lectura de códigos QR"""
        if self.scanner_thread:
            self.scanner_thread.join(timeout=1)
            self.scanner_thread = None
        logger.info("Lectura de códigos QR detenida")
    
    def _read_qr_codes(self):
        """Lee códigos QR desde dispositivos de entrada"""
        try:
            if EVDEV_AVAILABLE:
                self._read_with_evdev()
            else:
                self._read_with_stdin()
        except Exception as e:
            logger.error(f"Error en lectura QR: {e}")
    
    def _read_with_evdev(self):
        """Lee códigos QR usando evdev"""
        try:
            # Buscar dispositivos de entrada disponibles
            input_devices = []
            for device_path in evdev.list_devices():
                try:
                    device = evdev.InputDevice(device_path)
                    if evdev.ecodes.EV_KEY in device.capabilities():
                        input_devices.append(device)
                except:
                    continue
            
            if not input_devices:
                logger.warning("No se encontraron dispositivos de entrada para evdev")
                return
            
            # Usar el primer dispositivo disponible
            device = input_devices[0]
            logger.info(f"Leyendo desde dispositivo: {device.name}")
            
            # Leer eventos del dispositivo
            for event in device.read_loop():
                if not self.running or not self.scanner_connected:
                    break
                
                if event.type == evdev.ecodes.EV_KEY:
                    key_event = categorize(event)
                    if key_event.keystate == evdev.KeyEvent.key_down:
                        # Procesar tecla presionada
                        if key_event.keycode == evdev.ecodes.KEY_ENTER:
                            # Enter indica fin del código QR
                            if self.current_qr_buffer:
                                self._process_qr_code(self.current_qr_buffer)
                                self.current_qr_buffer = ""
                        else:
                            # Añadir carácter al buffer
                            char = self._keycode_to_char(key_event.keycode)
                            if char:
                                self.current_qr_buffer += char
                
        except Exception as e:
            logger.error(f"Error en lectura evdev: {e}")
    
    def _read_with_stdin(self):
        """Lee códigos QR desde stdin (fallback)"""
        logger.info("Usando stdin para lectura de códigos QR")
        try:
            while self.running and self.scanner_connected:
                # En un entorno real, esto leería del dispositivo USB
                # Por ahora, simulamos la entrada
                time.sleep(1)
        except Exception as e:
            logger.error(f"Error en lectura stdin: {e}")
    
    def _keycode_to_char(self, keycode: int) -> Optional[str]:
        """Convierte keycode a carácter"""
        # Mapeo básico de keycodes a caracteres
        key_mapping = {
            evdev.ecodes.KEY_0: '0', evdev.ecodes.KEY_1: '1', evdev.ecodes.KEY_2: '2',
            evdev.ecodes.KEY_3: '3', evdev.ecodes.KEY_4: '4', evdev.ecodes.KEY_5: '5',
            evdev.ecodes.KEY_6: '6', evdev.ecodes.KEY_7: '7', evdev.ecodes.KEY_8: '8',
            evdev.ecodes.KEY_9: '9', evdev.ecodes.KEY_MINUS: '-', evdev.ecodes.KEY_DOT: '.',
            evdev.ecodes.KEY_COMMA: ','
        }
        return key_mapping.get(keycode)
    
    def _process_qr_code(self, qr_code: str):
        """Procesa un código QR escaneado"""
        try:
            # Validar formato del código QR (debe ser un descuento)
            if self._is_valid_discount(qr_code):
                logger.info(f"Código QR válido escaneado: {qr_code}")
                if self.on_qr_scanned:
                    self.on_qr_scanned(qr_code)
            else:
                logger.warning(f"Código QR inválido: {qr_code}")
                
        except Exception as e:
            logger.error(f"Error procesando código QR: {e}")
    
    def _is_valid_discount(self, qr_code: str) -> bool:
        """Valida si el código QR es un descuento válido"""
        try:
            # Patrón: -X o -X.XX donde X son números
            # Ejemplos: -1, -0.90, -5.50
            discount_pattern = r'^-(\d+(?:\.\d{1,2})?)$'
            if re.match(discount_pattern, qr_code):
                # Verificar que el descuento sea razonable (no más de 100€)
                amount = abs(float(qr_code))
                return 0 < amount <= 100
            return False
        except:
            return False
    
    def scan_qr(self, timeout: int = 30) -> Optional[str]:
        """Escanea un código QR con timeout"""
        if not self.scanner_connected:
            raise Exception("No hay escáner QR conectado")
        
        logger.info("Esperando código QR...")
        start_time = time.time()
        
        # Esperar a que se escanee un código QR
        while time.time() - start_time < timeout:
            if not self.running:
                break
            
            # Verificar si hay un código QR en el buffer
            if self.current_qr_buffer:
                qr_code = self.current_qr_buffer
                self.current_qr_buffer = ""
                return qr_code
            
            time.sleep(0.1)
        
        raise Exception("Timeout: No se escaneó ningún código QR")
    
    def get_status(self) -> dict:
        """Retorna el estado actual del servicio"""
        return {
            "scanner_connected": self.scanner_connected,
            "scanner_device": self.scanner_device,
            "monitoring": self.monitoring,
            "running": self.running,
            "evdev_available": EVDEV_AVAILABLE,
            "pyudev_available": PYUDEV_AVAILABLE
        }

def main():
    """Función principal para ejecutar el servicio como standalone"""
    service = QrScannerService()
    
    def on_status_changed(connected: bool):
        print(f"Estado del escáner: {'Conectado' if connected else 'Desconectado'}")
    
    def on_qr_scanned(qr_code: str):
        print(f"Código QR escaneado: {qr_code}")
    
    service.set_callbacks(on_status_changed, on_qr_scanned)
    service.start_monitoring()
    
    try:
        print("Servicio de escáner QR iniciado. Presiona Ctrl+C para terminar.")
        while service.running:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nTerminando servicio...")
    finally:
        service.stop_monitoring()

if __name__ == "__main__":
    main()

