import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:barcode/barcode.dart';
import 'package:universal_html/html.dart' as html;

/// Servicio de impresión web que genera y descarga tickets como PDF
class PrinterServiceWeb {
  /// Genera y descarga un ticket como PDF
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
    try {
      // Generar PDF del ticket
      final pdfBytes = await _generateTicketPDF(
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
      
      // Crear blob y descargar
      final blob = html.Blob([pdfBytes]);
      final url = html.Url.createObjectUrlFromBlob(blob);
      
      // Crear enlace de descarga
      final anchor = html.AnchorElement(href: url)
        ..setAttribute('download', 'ticket_${plate}_${start.millisecondsSinceEpoch}.pdf')
        ..click();
      
      // Limpiar URL
      html.Url.revokeObjectUrl(url);
      
      return true;
    } catch (e) {
      print('Error generando PDF del ticket: $e');
      return false;
    }
  }
  
  /// Genera el PDF del ticket
  static Future<Uint8List> _generateTicketPDF({
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
    final pdf = pw.Document();

    final lang = (locale ?? 'es').toLowerCase();
    String t(String key) {
      switch (lang) {
        case 'ca':
          switch (key) {
            case 'title': return 'Tiquet d\'aparcament';
            case 'plate': return 'Matrícula:';
            case 'zone': return 'Zona:';
            case 'start': return 'Data d\'inici:';
            case 'end': return 'Data de fi:';
            case 'duration': return 'Durada:';
            case 'total': return 'Preu total:';
            case 'method': return 'Mètode de pagament:';
            case 'discount': return 'Descompte:';
            case 'scan': return 'Escaneja per verificar';
            case 'generated': return 'Tiquet generat el';
          }
          return key;
        case 'en':
          switch (key) {
            case 'title': return 'Parking Ticket';
            case 'plate': return 'Plate:';
            case 'zone': return 'Zone:';
            case 'start': return 'Start time:';
            case 'end': return 'End time:';
            case 'duration': return 'Duration:';
            case 'total': return 'Total price:';
            case 'method': return 'Payment method:';
            case 'discount': return 'Discount:';
            case 'scan': return 'Scan to verify';
            case 'generated': return 'Ticket generated on';
          }
          return key;
        default:
          switch (key) {
            case 'title': return 'TICKET DE ESTACIONAMIENTO';
            case 'plate': return 'Matrícula:';
            case 'zone': return 'Zona:';
            case 'start': return 'Fecha de inicio:';
            case 'end': return 'Fecha de fin:';
            case 'duration': return 'Duración:';
            case 'total': return 'Precio total:';
            case 'method': return 'Método de pago:';
            case 'discount': return 'Descuento:';
            case 'scan': return 'Escanea para verificar';
            case 'generated': return 'Ticket generado el';
          }
          return key;
      }
    }
    
    // Crear página del ticket
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (context) => pw.Container(
          padding: const pw.EdgeInsets.all(20),
          child: pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Encabezado
              pw.Center(
                child: pw.Text(
                  t('title'),
                  style: pw.TextStyle(
                    fontSize: 24,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
              ),
              pw.SizedBox(height: 20),
              
              // Información del ticket
              _buildInfoRow(t('plate'), plate),
              _buildInfoRow(t('zone'), _getZoneName(zone, lang)),
              _buildInfoRow(t('start'), _formatDateTime(start, lang)),
              _buildInfoRow(t('end'), _formatDateTime(end, lang)),
              _buildInfoRow(t('duration'), _formatDuration(start, end, lang)),
              pw.Divider(),
              if ((discount ?? 0) != 0)
                _buildInfoRow(t('discount'), '${(discount!).toStringAsFixed(2)} €'),
              _buildInfoRow(t('total'), '${price.toStringAsFixed(2)} €', isBold: true),
              _buildInfoRow(t('method'), _getMethodName(method, lang)),
              
              pw.SizedBox(height: 30),
              
              if ((qrData ?? '').isNotEmpty) ...[
                pw.Center(
                  child: pw.BarcodeWidget(
                    barcode: Barcode.qrCode(),
                    data: qrData!,
                    width: 150,
                    height: 150,
                  ),
                ),
                pw.SizedBox(height: 10),
                pw.Center(
                  child: pw.Text(
                    t('scan'),
                    style: pw.TextStyle(
                      fontSize: 12,
                      color: PdfColors.grey,
                    ),
                  ),
                ),
              ],
              
              pw.SizedBox(height: 20),
              
              // Pie de página
              pw.Center(
                child: pw.Text(
                  '${t('generated')} ${_formatDateTime(DateTime.now(), lang)}',
                  style: pw.TextStyle(
                    fontSize: 10,
                    color: PdfColors.grey,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    
    return pdf.save();
  }
  
  /// Construye una fila de información
  static pw.Widget _buildInfoRow(String label, String value, {bool isBold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.symmetric(vertical: 4),
      child: pw.Row(
        crossAxisAlignment: pw.CrossAxisAlignment.start,
        children: [
          pw.SizedBox(
            width: 120,
            child: pw.Text(
              label,
              style: pw.TextStyle(
                fontSize: 12,
                fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
              ),
            ),
          ),
          pw.Expanded(
            child: pw.Text(
              value,
              style: pw.TextStyle(
                fontSize: 12,
                fontWeight: isBold ? pw.FontWeight.bold : pw.FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }
  
  /// Obtiene nombre de zona
  static String _getZoneName(String zone, String lang) {
    switch (zone.toLowerCase()) {
      case 'green':
        return lang == 'ca' ? 'Zona Verda' : (lang == 'en' ? 'Green Zone' : 'Zona Verde');
      case 'blue':
        return lang == 'ca' ? 'Zona Blava' : (lang == 'en' ? 'Blue Zone' : 'Zona Azul');
      default:
        return zone;
    }
  }
  
  /// Obtiene nombre del método de pago
  static String _getMethodName(String method, String lang) {
    switch (method.toLowerCase()) {
      case 'card':
        return lang == 'ca' ? 'Targeta' : (lang == 'en' ? 'Card' : 'Tarjeta');
      case 'qr':
        return 'QR Pay';
      case 'mobile':
        return 'Apple/Google Pay';
      case 'cash':
        return lang == 'ca' ? 'Efectiu' : (lang == 'en' ? 'Cash' : 'Efectivo');
      case 'bizum':
        return 'Bizum';
      default:
        return method;
    }
  }
  
  /// Formatea fecha y hora
  static String _formatDateTime(DateTime dateTime, String lang) {
    String two(int v) => v.toString().padLeft(2, '0');
    switch (lang) {
      case 'en':
        return '${two(dateTime.day)}-${two(dateTime.month)}-${dateTime.year} ${two(dateTime.hour)}:${two(dateTime.minute)}';
      case 'ca':
        return '${two(dateTime.day)}/${two(dateTime.month)}/${dateTime.year} ${two(dateTime.hour)}:${two(dateTime.minute)}';
      default:
        return '${two(dateTime.day)}/${two(dateTime.month)}/${dateTime.year} ${two(dateTime.hour)}:${two(dateTime.minute)}';
    }
  }
  
  /// Formatea duración
  static String _formatDuration(DateTime start, DateTime end, String lang) {
    final duration = end.difference(start);
    final hours = duration.inHours;
    final minutes = duration.inMinutes % 60;
    
    if (hours > 0) {
      return lang == 'en' ? '${hours}h ${minutes}min' : '${hours}h ${minutes}min';
    } else {
      return '${minutes}min';
    }
  }
}
