import 'dart:convert';
import 'package:http/http.dart' as http;

/// Simple client to talk to a local printing service running on Linux.
///
/// Expected local service (example):
///   POST http://127.0.0.1:9101/v1/print-ticket
///   Body: { "title": "...", "lines": ["..."], "qrData": "..." }
///   Response: 200 OK on success
class PrinterService {
  /// Base URL of the local print service. Adjust per deployment if needed.
  static String baseUrl = 'http://127.0.0.1:9101';

  /// Sends a ticket to the local printer service.
  /// Returns true if the service acknowledges printing (HTTP 200-299).
  static Future<bool> printTicket({
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    String? qrData,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/v1/print-ticket');
      final payload = <String, dynamic>{
        'title': 'Ticket de estacionamiento',
        'lines': [
          'Matrícula: $plate',
          'Zona: $zone',
          'Inicio: ${start.toIso8601String()}',
          'Fin: ${end.toIso8601String()}',
          'Precio: ${price.toStringAsFixed(2)} €',
          'Método: $method',
        ],
        if (qrData != null && qrData.isNotEmpty) 'qrData': qrData,
      };
      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 5));
      return res.statusCode >= 200 && res.statusCode < 300;
    } catch (_) {
      return false;
    }
  }
}



