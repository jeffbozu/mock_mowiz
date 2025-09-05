import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

/// Servicio de envío de emails usando AWS SES
class EmailService {
  // Configuración de AWS SES
  static const String _awsRegion = 'eu-west-3';
  static const String _accessKeyId = 'AKIAV7GV7TVYIFYWNCAY';
  static const String _secretAccessKey = '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';
  
  // Endpoint de AWS SES
  static String get _sesEndpoint => 'https://email.$_awsRegion.amazonaws.com';
  
  /// Envía un ticket por email usando plantilla personalizable
  static Future<bool> sendTicketEmail({
    required String recipientEmail,
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    String? qrData,
    String? customSubject,
    String? customMessage,
  }) async {
    try {
      // Generar plantilla HTML del email
      final htmlContent = _generateEmailTemplate(
        plate: plate,
        zone: zone,
        start: start,
        end: end,
        price: price,
        method: method,
        qrData: qrData,
        customMessage: customMessage,
      );
      
      // Generar versión texto plano
      final textContent = _generateTextTemplate(
        plate: plate,
        zone: zone,
        start: start,
        end: end,
        price: price,
        method: method,
        qrData: qrData,
        customMessage: customMessage,
      );
      
      // Preparar datos del email
      final emailData = {
        'Source': 'jbolanos.meypar@gmail.com', // Email verificado en AWS SES
        'Destination': {
          'ToAddresses': [recipientEmail],
        },
        'Message': {
          'Subject': {
            'Data': customSubject ?? 'Tu Ticket de Estacionamiento - KioskApp',
            'Charset': 'UTF-8',
          },
          'Body': {
            'Html': {
              'Data': htmlContent,
              'Charset': 'UTF-8',
            },
            'Text': {
              'Data': textContent,
              'Charset': 'UTF-8',
            },
          },
        },
      };
      
      // Enviar email usando AWS SES
      final response = await http.post(
        Uri.parse(_sesEndpoint),
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AmazonSES.SendEmail',
          'Authorization': _generateAwsSignature(emailData),
        },
        body: jsonEncode(emailData),
      );
      
      if (response.statusCode == 200) {
        print('✅ Email enviado exitosamente a: $recipientEmail');
        return true;
      } else {
        print('❌ Error enviando email: ${response.statusCode} - ${response.body}');
        return false;
      }
      
    } catch (e) {
      print('❌ Error en EmailService: $e');
      return false;
    }
  }
  
  /// Genera la plantilla HTML del email
  static String _generateEmailTemplate({
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    String? qrData,
    String? customMessage,
  }) {
    final zoneName = _getZoneName(zone);
    final methodName = _getMethodName(method);
    final startFormatted = _formatDateTime(start);
    final endFormatted = _formatDateTime(end);
    final duration = _formatDuration(start, end);
    final priceFormatted = '${price.toStringAsFixed(2)} €';
    
    return '''
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket de Estacionamiento - KioskApp</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #E62144;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #E62144;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
        }
        .ticket-info {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #495057;
        }
        .value {
            color: #212529;
        }
        .price-highlight {
            background-color: #E62144;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
        }
        .qr-section {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .qr-placeholder {
            width: 150px;
            height: 150px;
            background-color: #e9ecef;
            border: 2px dashed #6c757d;
            border-radius: 8px;
            margin: 0 auto 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6c757d;
            font-size: 12px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 14px;
        }
        .custom-message {
            background-color: #e3f2fd;
            border-left: 4px solid #2196f3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .legal-notice {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            font-size: 12px;
            color: #856404;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .email-container {
                padding: 20px;
            }
            .info-row {
                flex-direction: column;
            }
            .value {
                margin-top: 5px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🚗 KioskApp</div>
            <div class="subtitle">Sistema de Estacionamiento Inteligente</div>
        </div>
        
        <h1 style="color: #E62144; text-align: center; margin-bottom: 30px;">
            🎫 Ticket de Estacionamiento
        </h1>
        
        ${customMessage != null ? '''
        <div class="custom-message">
            <strong>💬 Mensaje Personalizado:</strong><br>
            $customMessage
        </div>
        ''' : ''}
        
        <div class="ticket-info">
            <div class="info-row">
                <span class="label">🚙 Matrícula:</span>
                <span class="value"><strong>$plate</strong></span>
            </div>
            <div class="info-row">
                <span class="label">📍 Zona:</span>
                <span class="value">$zoneName</span>
            </div>
            <div class="info-row">
                <span class="label">🕐 Inicio:</span>
                <span class="value">$startFormatted</span>
            </div>
            <div class="info-row">
                <span class="label">🕙 Fin:</span>
                <span class="value">$endFormatted</span>
            </div>
            <div class="info-row">
                <span class="label">⏱️ Duración:</span>
                <span class="value">$duration</span>
            </div>
            <div class="info-row">
                <span class="label">💳 Método de Pago:</span>
                <span class="value">$methodName</span>
            </div>
        </div>
        
        <div class="price-highlight">
            💰 Precio Total: $priceFormatted
        </div>
        
        ${qrData != null ? '''
        <div class="qr-section">
            <h3>📱 Código QR de Verificación</h3>
            <div class="qr-placeholder">
                [Código QR]<br>
                $qrData
            </div>
            <p>Escanea este código para verificar tu ticket</p>
        </div>
        ''' : ''}
        
        <div class="legal-notice">
            <strong>⚠️ Información Legal:</strong><br>
            • Este ticket es válido solo para la fecha y zona especificadas<br>
            • El vehículo debe estar estacionado correctamente en la zona asignada<br>
            • Cualquier infracción será sancionada según la normativa municipal vigente<br>
            • Para consultas, contacta con el servicio de atención al cliente
        </div>
        
        <div class="footer">
            <p>📧 Generado automáticamente por KioskApp</p>
            <p>🕐 Enviado el ${_formatDateTime(DateTime.now())}</p>
            <p>© 2024 KioskApp - Sistema de Gestión de Estacionamiento</p>
        </div>
    </div>
</body>
</html>
    ''';
  }
  
  /// Genera la versión texto plano del email
  static String _generateTextTemplate({
    required String plate,
    required String zone,
    required DateTime start,
    required DateTime end,
    required double price,
    required String method,
    String? qrData,
    String? customMessage,
  }) {
    final zoneName = _getZoneName(zone);
    final methodName = _getMethodName(method);
    final startFormatted = _formatDateTime(start);
    final endFormatted = _formatDateTime(end);
    final duration = _formatDuration(start, end);
    final priceFormatted = '${price.toStringAsFixed(2)} €';
    
    return '''
TICKET DE ESTACIONAMIENTO - KioskApp
=====================================

${customMessage != null ? 'MENSAJE PERSONALIZADO: $customMessage\n' : ''}

INFORMACIÓN DEL TICKET:
- Matrícula: $plate
- Zona: $zoneName
- Inicio: $startFormatted
- Fin: $endFormatted
- Duración: $duration
- Método de Pago: $methodName
- Precio Total: $priceFormatted

${qrData != null ? 'CÓDIGO QR: $qrData\n' : ''}

INFORMACIÓN LEGAL:
- Este ticket es válido solo para la fecha y zona especificadas
- El vehículo debe estar estacionado correctamente en la zona asignada
- Cualquier infracción será sancionada según la normativa municipal vigente
- Para consultas, contacta con el servicio de atención al cliente

Generado automáticamente por KioskApp
Enviado el ${_formatDateTime(DateTime.now())}
© 2024 KioskApp - Sistema de Gestión de Estacionamiento
    ''';
  }
  
  /// Genera la firma de autorización de AWS
  static String _generateAwsSignature(Map<String, dynamic> data) {
    // En producción real, implementar firma AWS v4 completa
    // Por ahora, retornamos una firma básica
    return 'AWS4-HMAC-SHA256 Credential=$_accessKeyId/$_awsRegion/ses/aws4_request';
  }
  
  /// Obtiene nombre de zona
  static String _getZoneName(String zone) {
    switch (zone.toLowerCase()) {
      case 'green':
        return 'Zona Verde';
      case 'blue':
        return 'Zona Azul';
      default:
        return zone;
    }
  }
  
  /// Obtiene nombre del método de pago
  static String _getMethodName(String method) {
    switch (method.toLowerCase()) {
      case 'card':
        return 'Tarjeta';
      case 'qr':
        return 'QR Pay';
      case 'mobile':
        return 'Apple/Google Pay';
      case 'cash':
        return 'Efectivo';
      case 'bizum':
        return 'Bizum';
      default:
        return method;
    }
  }
  
  /// Formatea fecha y hora
  static String _formatDateTime(DateTime dateTime) {
    return DateFormat('dd/MM/yyyy HH:mm').format(dateTime);
  }
  
  /// Formatea duración
  static String _formatDuration(DateTime start, DateTime end) {
    final duration = end.difference(start);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    
    if (hours > 0) {
      return '${hours}h ${minutes}min';
    } else {
      return '${minutes}min';
    }
  }
}
