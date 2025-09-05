import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:universal_html/html.dart' as html;

/// Servicio de escáner QR para web que usa la cámara del dispositivo
class QrScannerServiceWeb {
  static const MethodChannel _channel = MethodChannel('qr_scanner_service');
  
  // Stream para códigos QR escaneados
  static final StreamController<String> _qrController = StreamController<String>.broadcast();
  static Stream<String> get qrStream => _qrController.stream;
  
  // Estado del escáner
  static bool _isScannerConnected = false;
  static bool get isScannerConnected => _isScannerConnected;
  
  // Último código QR leído
  static String? _lastQrCode;
  static String? get lastQrCode => _lastQrCode;
  
  // Callback para cambios de estado
  static Function(bool)? _onScannerStatusChanged;
  
  /// Inicializa el servicio de escáner QR para web
  static Future<void> initialize({Function(bool)? onScannerStatusChanged}) async {
    _onScannerStatusChanged = onScannerStatusChanged;
    
    // En web, verificamos si hay cámara disponible
    _isScannerConnected = await _checkCameraAvailability();
    _onScannerStatusChanged?.call(_isScannerConnected);
    
    print('QrScannerServiceWeb inicializado. Cámara disponible: $_isScannerConnected');
  }
  
  /// Verifica si hay cámara disponible
  static Future<bool> _checkCameraAvailability() async {
    try {
      // Verificar si el navegador soporta getUserMedia
      if (html.window.navigator.mediaDevices == null) {
        return false;
      }
      
      // Verificar permisos de cámara
      final mediaDevices = html.window.navigator.mediaDevices;
      if (mediaDevices == null) return false;
      
      final devices = await mediaDevices.enumerateDevices();
      final videoDevices = devices.where((device) => device.kind == 'videoinput');
      
      return videoDevices.isNotEmpty;
    } catch (e) {
      print('Error verificando cámara: $e');
      return false;
    }
  }
  
  /// Escanea un código QR usando la cámara
  static Future<String?> scanQrCode({int timeout = 30}) async {
    if (!_isScannerConnected) {
      throw Exception('No hay cámara disponible');
    }
    
    try {
      // Mostrar diálogo de escaneo con cámara
      final qrCode = await _showCameraScanner(timeout);
      
      if (qrCode != null) {
        _lastQrCode = qrCode;
        _qrController.add(qrCode);
        
        // Procesar descuento si es válido
        if (_isValidDiscount(qrCode)) {
          // Retornar el código QR como string, el servicio unificado lo procesará
          return qrCode;
        }
        
        return qrCode;
      }
      
      return null;
    } catch (e) {
      print('Error escaneando QR: $e');
      return null;
    }
  }
  
  /// Muestra el escáner de cámara
  static Future<String?> _showCameraScanner(int timeout) async {
    try {
      // Crear elemento de video para la cámara
      final videoElement = html.VideoElement()
        ..autoplay = true
        ..muted = true
        ..style.width = '100%'
        ..style.height = '100%';
      
      // Crear canvas para capturar frames
      final canvasElement = html.CanvasElement()
        ..width = 640
        ..height = 480;
      
      // Crear diálogo modal
      final dialog = html.DivElement()
        ..style.position = 'fixed'
        ..style.top = '0'
        ..style.left = '0'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
        ..style.zIndex = '9999'
        ..style.display = 'flex'
        ..style.alignItems = 'center'
        ..style.justifyContent = 'center';
      
      // Contenido del diálogo
      final content = html.DivElement()
        ..style.backgroundColor = 'white'
        ..style.padding = '20px'
        ..style.borderRadius = '10px'
        ..style.maxWidth = '500px'
        ..style.width = '90%'
        ..style.textAlign = 'center';
      
      // Título
      final title = html.HeadingElement.h2()
        ..text = 'Escanear Código QR'
        ..style.marginBottom = '20px';
      
      // Contenedor de video
      final videoContainer = html.DivElement()
        ..style.marginBottom = '20px'
        ..style.borderRadius = '10px'
        ..style.overflow = 'hidden';
      
      // Botones
      final buttonContainer = html.DivElement()
        ..style.display = 'flex'
        ..style.gap = '10px'
        ..style.justifyContent = 'center';
      
      final scanButton = html.ButtonElement()
        ..text = 'Escanear'
        ..style.padding = '10px 20px'
        ..style.backgroundColor = '#007bff'
        ..style.color = 'white'
        ..style.border = 'none'
        ..style.borderRadius = '5px'
        ..style.cursor = 'pointer';
      
      final cancelButton = html.ButtonElement()
        ..text = 'Cancelar'
        ..style.padding = '10px 20px'
        ..style.backgroundColor = '#6c757d'
        ..style.color = 'white'
        ..style.border = 'none'
        ..style.borderRadius = '5px'
        ..style.cursor = 'pointer';
      
      // Agregar elementos
      videoContainer.append(videoElement);
      buttonContainer.append(scanButton);
      buttonContainer.append(cancelButton);
      
      content.append(title);
      content.append(videoContainer);
      content.append(buttonContainer);
      dialog.append(content);
      
      // Agregar al DOM
      html.document.body!.append(dialog);
      
      // Iniciar cámara
      final stream = await html.window.navigator.mediaDevices!.getUserMedia({
        'video': {
          'facingMode': 'environment', // Cámara trasera si está disponible
          'width': {'ideal': 640},
          'height': {'ideal': 480}
        }
      });
      
      videoElement.srcObject = stream;
      
      // Completer para el resultado
      final _completer = Completer<String?>();
      
      // Variables para el resultado
      String? result;
      bool isCompleted = false;
      
      // Función para completar
      void complete(String? value) {
        if (isCompleted) return;
        isCompleted = true;
        result = value;
        
        // Detener cámara
        stream.getTracks().forEach((track) => track.stop());
        
        // Remover diálogo
        dialog.remove();
        
        // Resolver
        _completer.complete(value);
      }
      
      // Eventos de botones
      scanButton.onClick.listen((_) async {
        try {
          final context = canvasElement.getContext('2d');
          if (context == null) {
            complete(null);
            return;
          }
          final ctx = context as dynamic; // CanvasRenderingContext2D
          // Bucle de lectura hasta timeout o detección
          final startedAt = DateTime.now();
          while (!isCompleted) {
            // timeout manual
            if (DateTime.now().difference(startedAt).inSeconds >= timeout) {
              complete(null);
              break;
            }
            // Dibujar frame actual
            try {
              ctx.drawImage(videoElement, 0, 0);
            } catch (_) {}
            // Obtener píxeles
            final imageData = (ctx.getImageData(0, 0, canvasElement.width!, canvasElement.height!));
            // Llamar a jsQR (expuesta en window.jsQR)
            final qr = (html.window as dynamic).jsQR?.call(
              imageData.data,
              canvasElement.width,
              canvasElement.height,
              {'inversionAttempts': 'dontInvert'},
            );
            if (qr != null && qr.data != null) {
              complete(qr.data as String);
              break;
            }
            // Pequeña espera para no bloquear UI
            await Future.delayed(const Duration(milliseconds: 120));
          }
        } catch (e) {
          print('Error capturando/decodificando QR: $e');
          complete(null);
        }
      });
      
      cancelButton.onClick.listen((_) => complete(null));
      
      // Timeout
      Timer(Duration(seconds: timeout), () => complete(null));
      
      return await _completer.future;
      
    } catch (e) {
      print('Error iniciando cámara: $e');
      return null;
    }
  }
  
  /// Verifica si el código QR es un descuento válido
  static bool _isValidDiscount(String qrCode) {
    try {
      // Patrón: -X o -X.XX donde X son números (por ejemplo: -1, -0.90, -5.50)
      final discountPattern = RegExp(r'^-(\d+(?:\.\d{1,2})?)$');
      if (discountPattern.hasMatch(qrCode)) {
        final amount = double.parse(qrCode);
        return amount < 0 && amount > -10000; // aceptamos descuentos grandes; la UI trunca a 0
      }
      // Códigos VIP/FREE que anulan el total
      final normalized = qrCode.trim().toUpperCase();
      if (normalized == 'FREE' || normalized == 'VIP' || normalized == 'VIP-ALL' || normalized == '-ALL' || normalized == '-100%') {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
  
  /// Verifica si el escáner está conectado
  static Future<bool> checkScanner() async {
    return _isScannerConnected;
  }
  
  /// Obtiene el estado del servicio
  static Map<String, dynamic> getStatus() {
    return {
      'scanner_connected': _isScannerConnected,
      'last_qr_code': _lastQrCode,
      'mode': 'web',
    };
  }
  
  /// Libera recursos
  static void dispose() {
    _qrController.close();
  }
}





