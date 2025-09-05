import 'dart:async';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

/// Servicio para interactuar con el agente de escáner QR
class QrScannerService {
  static const String _baseUrl = 'http://127.0.0.1:9102';
  
  /// Verifica si el escáner QR está conectado
  static Future<bool> isScannerConnected() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/v1/check-scanner'),
      ).timeout(const Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['scanner_connected'] as bool? ?? false;
      }
      return false;
    } catch (e) {
      print('Error verificando escáner QR: $e');
      return false;
    }
  }
  
  /// Escanea un código QR y retorna el descuento
  static Future<double?> scanQrCode({int timeout = 30}) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/v1/scan'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'timeout': timeout}),
      ).timeout(Duration(seconds: timeout + 5));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final discountAmount = data['discount_amount'] as double?;
        return discountAmount;
      } else {
        final errorData = jsonDecode(response.body) as Map<String, dynamic>;
        print('Error escaneando QR: ${errorData['error']}');
        return null;
      }
    } catch (e) {
      print('Error escaneando código QR: $e');
      return null;
    }
  }
  
  /// Obtiene el descuento actual
  static Future<double?> getCurrentDiscount() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/v1/current-discount'),
      ).timeout(const Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['current_discount'] as double?;
      }
      return null;
    } catch (e) {
      print('Error obteniendo descuento actual: $e');
      return null;
    }
  }
  
  /// Limpia el descuento actual
  static Future<bool> clearDiscount() async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/v1/clear-discount'),
      ).timeout(const Duration(seconds: 5));
      
      return response.statusCode == 200;
    } catch (e) {
      print('Error limpiando descuento: $e');
      return false;
    }
  }
  
  /// Obtiene el estado del servicio
  static Future<Map<String, dynamic>?> getServiceStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/v1/status'),
      ).timeout(const Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return data['status'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      print('Error obteniendo estado del servicio: $e');
      return null;
    }
  }
}
