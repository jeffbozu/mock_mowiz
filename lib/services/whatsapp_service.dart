import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class WhatsAppService {
  static String baseUrl = const String.fromEnvironment(
    'WHATSAPP_BASE_URL',
    defaultValue: 'https://render-whatsapp-tih4.onrender.com',
  );

  static Future<bool> sendTicketWhatsApp({
    required String phone,
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    double? discount,
    String? qrData,
    String? localeCode,
  }) async {
    final l = localeCode ?? 'es_ES';
    final dateFmt = DateFormat('dd/MM/yyyy HH:mm', l);
    final duration = _formatDuration(start, end);

    final ticket = {
      'plate': plate,
      'zone': zone,
      'start': dateFmt.format(start),
      'end': dateFmt.format(end),
      'duration': duration,
      'price': price,
      'discount': discount,
      'method': method,
      'qrData': qrData,
    };

    final uri = Uri.parse('$baseUrl/whatsapp/send');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'ticket': ticket}),
    );
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['success'] == true;
    }
    return false;
  }

  static String _formatDuration(DateTime start, DateTime end) {
    final d = end.difference(start);
    final h = d.inHours;
    final m = d.inMinutes % 60;
    if (h > 0) return '${h}h ${m}m';
    return '${m}m';
  }
}


