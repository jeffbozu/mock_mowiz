import 'dart:io';
import 'package:flutter/foundation.dart';
import '../printer_service.dart';
import '../printer_service_web.dart';
import '../qr_scanner_service.dart';
import '../qr_scanner_service_web.dart';

/// Servicio unificado que detecta automáticamente la plataforma
/// y usa la implementación apropiada (web o desktop)
class UnifiedService {
  static bool get _isWeb => kIsWeb;
  static bool get _isDesktop => !kIsWeb && (Platform.isLinux || Platform.isWindows || Platform.isMacOS);
  
  /// Imprime un ticket usando la implementación apropiada
  static Future<bool> printTicket({
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    String? qrData,
    double? discount,
    String? locale,
  }) async {
    if (_isWeb) {
      // En web: generar y descargar PDF
      return await PrinterServiceWeb.printTicket(
        plate: plate,
        zone: zone,
        start: start,
        end: end,
        price: price,
        method: method,
        qrData: qrData,
        discount: discount,
        locale: locale,
      );
    } else if (_isDesktop) {
      // En desktop: usar impresora térmica
      return await PrinterService.printTicket(
        plate: plate,
        zone: zone,
        start: start,
        end: end,
        price: price,
        method: method,
        qrData: qrData,
      );
    } else {
      // En móvil: no soportado por ahora
      throw UnsupportedError('Plataforma no soportada para impresión');
    }
  }
  
  /// Escanea un código QR usando la implementación apropiada
  static Future<double?> scanQrCode({int timeout = 30}) async {
    if (_isWeb) {
      // En web: usar cámara del dispositivo
      final result = await QrScannerServiceWeb.scanQrCode(timeout: timeout);
      if (result != null) {
        final parsed = double.tryParse(result);
        if (parsed != null) return parsed;
        // Soporte VIP/FREE: cualquier código reconocido como gratis
        final normalized = result.trim().toUpperCase();
        if (normalized == 'FREE' || normalized == 'VIP' || normalized == 'VIP-ALL' || normalized == '-ALL' || normalized == '-100%') {
          // Usamos un valor muy negativo; la UI lo truncará a 0
          return -9999.0;
        }
      }
      return null;
    } else if (_isDesktop) {
      // En desktop: usar escáner USB/serie
      return await QrScannerService.scanQrCode(timeout: timeout);
    } else {
      // En móvil: no soportado por ahora
      throw UnsupportedError('Plataforma no soportada para escáner QR');
    }
  }
  
  /// Verifica si el escáner está conectado
  static Future<bool> isScannerConnected() async {
    if (_isWeb) {
      return await QrScannerServiceWeb.checkScanner();
    } else if (_isDesktop) {
      return await QrScannerService.isScannerConnected();
    } else {
      return false;
    }
  }
  
  /// Obtiene el estado del servicio
  static Map<String, dynamic> getStatus() {
    if (_isWeb) {
      return {
        ...QrScannerServiceWeb.getStatus(),
        'platform': 'web',
        'printer_mode': 'pdf_download',
      };
    } else if (_isDesktop) {
      return {
        'platform': 'desktop',
        'printer_mode': 'thermal_printer',
        'scanner_mode': 'usb_serial',
      };
    } else {
      return {
        'platform': 'mobile',
        'printer_mode': 'unsupported',
        'scanner_mode': 'unsupported',
      };
    }
  }
  
  /// Inicializa los servicios según la plataforma
  static Future<void> initialize() async {
    if (_isWeb) {
      await QrScannerServiceWeb.initialize();
      print('UnifiedService: Inicializado en modo WEB');
    } else if (_isDesktop) {
      print('UnifiedService: Inicializado en modo DESKTOP');
    } else {
      print('UnifiedService: Inicializado en modo MOBILE (limitado)');
    }
  }
  
  /// Libera recursos
  static void dispose() {
    if (_isWeb) {
      QrScannerServiceWeb.dispose();
    }
  }
}
