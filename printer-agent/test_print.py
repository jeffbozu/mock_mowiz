#!/usr/bin/env python3
"""
Script de prueba para verificar la funcionalidad de impresión térmica
"""

import requests
import json
import time

def test_printer_service():
    """Prueba el servicio de impresora"""
    base_url = "http://127.0.0.1:9101"
    
    print("=== Prueba del Servicio de Impresora ===")
    
    # 1. Verificar salud del servicio
    try:
        response = requests.get(f"{base_url}/v1/health", timeout=5)
        if response.status_code == 200:
            print("✅ Servicio de impresora funcionando")
        else:
            print(f"❌ Error en servicio: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ No se puede conectar al servicio: {e}")
        print("   Asegúrate de que printer-agent esté ejecutándose")
        return False
    
    # 2. Probar impresión de ticket
    test_data = {
        "title": "Ticket de Estacionamiento",
        "lines": [
            "Matrícula: ABC1234",
            "Zona: Azul",
            "Inicio: 2024-01-15T10:00:00",
            "Fin: 2024-01-15T12:00:00",
            "Precio: 2.50 €",
            "Método: Tarjeta",
            "Fecha: " + time.strftime("%d/%m/%Y %H:%M")
        ],
        "qrData": json.dumps({
            "plate": "ABC1234",
            "zone": "Azul",
            "start": "2024-01-15T10:00:00",
            "end": "2024-01-15T12:00:00",
            "price": 2.50,
            "method": "Tarjeta"
        })
    }
    
    try:
        print("🖨️  Enviando ticket de prueba...")
        response = requests.post(
            f"{base_url}/v1/print-ticket",
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Ticket enviado correctamente")
            print("   Verifica que se haya impreso en la impresora térmica")
        else:
            print(f"❌ Error al imprimir: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error al enviar ticket: {e}")
        return False
    
    return True

def check_printer_status():
    """Verifica el estado del servicio de impresora"""
    print("\n=== Estado del Servicio ===")
    
    try:
        # Verificar si el servicio systemd está activo
        import subprocess
        result = subprocess.run(['systemctl', 'is-active', 'printer-agent.service'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            status = result.stdout.strip()
            if status == 'active':
                print("✅ Servicio systemd: ACTIVO")
            else:
                print(f"⚠️  Servicio systemd: {status}")
        else:
            print("❌ Servicio systemd: NO ENCONTRADO")
            
    except Exception as e:
        print(f"⚠️  No se pudo verificar systemd: {e}")
    
    # Verificar puerto
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', 9101))
        sock.close()
        
        if result == 0:
            print("✅ Puerto 9101: ABIERTO")
        else:
            print("❌ Puerto 9101: CERRADO")
    except Exception as e:
        print(f"⚠️  No se pudo verificar puerto: {e}")

def main():
    """Función principal"""
    print("Prueba del Sistema de Impresión Térmica")
    print("=" * 50)
    
    # Verificar estado del servicio
    check_printer_status()
    
    print("\n" + "=" * 50)
    
    # Probar impresión
    if test_printer_service():
        print("\n🎉 ¡Prueba completada exitosamente!")
        print("   La impresora térmica está funcionando correctamente")
    else:
        print("\n💥 Prueba fallida")
        print("   Revisa la configuración del printer-agent")
    
    print("\nPara más información:")
    print("  - Ver logs: journalctl -u printer-agent.service -f")
    print("  - Ver estado: systemctl status printer-agent.service")
    print("  - Reiniciar: sudo systemctl restart printer-agent.service")

if __name__ == "__main__":
    main()

