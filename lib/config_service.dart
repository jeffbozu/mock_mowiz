import 'dart:convert';
import 'package:http/http.dart' as http;

import 'api_config.dart';

/// Service that loads configuration from the backend at runtime.
class ConfigService {
  /// The API base URL currently in use.
  static String apiBaseUrl = defaultApiBaseUrl;

  /// Initializes the service by requesting `/v1/config` from
  /// [defaultApiBaseUrl]. If the request succeeds and returns a JSON
  /// object with the `apiBaseUrl` field, the value is stored and used by
  /// the app.
  static Future<void> init() async {
    try {
      final uri = Uri.parse('${defaultApiBaseUrl}/v1/config');
      final res =
          await http.get(uri).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final url = data['apiBaseUrl'];
        if (url is String && url.isNotEmpty) {
          apiBaseUrl = url;
        }
      }
    } catch (_) {
      // Ignore errors and keep the default base URL
    }
  }
}

