import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'config_service.dart';
import 'dart:convert';

import 'l10n/app_localizations.dart';
import 'mowiz_page.dart';
import 'mowiz_time_page.dart';
import 'mowiz_success_page.dart';
import 'mowiz/mowiz_scaffold.dart';
import 'styles/mowiz_buttons.dart';
import 'sound_helper.dart';

class MowizSummaryPage extends StatefulWidget {
  final String plate;
  final String zone;
  final DateTime start;
  final int minutes;
  final double price;
  final double? discount;
  const MowizSummaryPage({
    super.key,
    required this.plate,
    required this.zone,
    required this.start,
    required this.minutes,
    required this.price,
    this.discount,
  });

  @override
  State<MowizSummaryPage> createState() => _MowizSummaryPageState();
}

class _MowizSummaryPageState extends State<MowizSummaryPage> {
  String? _method;

  Future<void> _pay() async {
    if (_method == null) return;
    final plate = widget.plate.toUpperCase();
    try {
      final res = await http.post(
        Uri.parse('${ConfigService.apiBaseUrl}/v1/onstreet-service/pay-ticket'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'plate': plate}),
      );
      if (res.statusCode != 200) {
        debugPrint('HTTP ${res.statusCode}: ${res.body}');
      }
    } catch (e) {
      debugPrint('Error: $e');
    }
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MowizSuccessPage(
          plate: widget.plate,
          zone: widget.zone,
          start: widget.start,
          minutes: widget.minutes,
          price: widget.price,
          method: _method!,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final t = l.t;
    final finish = widget.start.add(Duration(minutes: widget.minutes));
    final localeCode = l.locale.languageCode == 'es'
        ? 'es_ES'
        : l.locale.languageCode == 'ca'
            ? 'ca_ES'
            : 'en_GB';
    final timeFormat = DateFormat('EEE, d MMM yyyy - HH:mm', localeCode);

    Widget paymentButton(String value, IconData icon, String text, double fSize) {
      final selected = _method == value;
      final scheme = Theme.of(context).colorScheme;
      return SizedBox(
        width: double.infinity,
        child: FilledButton.icon(
          onPressed: () async {
            SoundHelper.playTap();
            setState(() => _method = value);
            await _pay();
          },
          icon: Icon(icon, size: fSize + 10),
          label: AutoSizeText(text, maxLines: 1),
          style: kMowizFilledButtonStyle.copyWith(
            textStyle: MaterialStatePropertyAll(TextStyle(fontSize: fSize)),
            backgroundColor: MaterialStatePropertyAll(
              selected ? scheme.primary : scheme.secondary,
            ),
          ),
        ),
      );
    }

    return MowizScaffold(
      title: t('summaryPay'),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final double width = constraints.maxWidth;
          final double height = constraints.maxHeight;

          // Responsividad: limitar a 400px máximo para el contenido principal
          final double contentWidth = width < 420 ? width * 0.98 : 400;
          final bool isCompact = width < 400 || height < 600;
          final double gap = isCompact ? 12 : 22;
          final double titleFont = isCompact ? 20 : 26;
          final double mainFont = isCompact ? 16 : 22;

          Widget resumenCard = Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
            ),
            elevation: 4,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  AutoSizeText(
                    t('totalTime'),
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: titleFont,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 8),
                  AutoSizeText(
                    '${widget.minutes ~/ 60}h ${widget.minutes % 60}m',
                    maxLines: 1,
                    style: TextStyle(fontSize: titleFont + 8),
                  ),
                  SizedBox(height: 16),
                  AutoSizeText(
                    "${t('startTime')}: ${timeFormat.format(widget.start)}",
                    maxLines: 1,
                    style: TextStyle(fontSize: mainFont),
                  ),
                  SizedBox(height: 8),
                  AutoSizeText(
                    "${t('endTime')}: ${timeFormat.format(finish)}",
                    maxLines: 1,
                    style: TextStyle(fontSize: mainFont),
                  ),
                  SizedBox(height: 16),
                  AutoSizeText(
                    "${t('totalPrice')}: ${widget.price.toStringAsFixed(2)} €",
                    maxLines: 1,
                    style: TextStyle(
                      fontSize: mainFont,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          );

          Widget contenido = ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: contentWidth,
              minWidth: 200,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                resumenCard,
                SizedBox(height: gap * 1.2),
                paymentButton('card', Icons.credit_card, t('card'), mainFont),
                SizedBox(height: gap),
                paymentButton('qr', Icons.qr_code_2, t('qrPay'), mainFont),
                SizedBox(height: gap),
                paymentButton('mobile', Icons.phone_iphone, t('mobilePay'), mainFont),
                SizedBox(height: gap * 1.3),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      SoundHelper.playTap();
                      Navigator.of(context).pushAndRemoveUntil(
                        MaterialPageRoute(
                          builder: (_) => MowizTimePage(
                            zone: widget.zone,
                            plate: widget.plate,
                          ),
                        ),
                        (route) => false,
                      );
                    },
                    style: kMowizFilledButtonStyle.copyWith(
                      backgroundColor: MaterialStatePropertyAll(
                        Theme.of(context).colorScheme.secondary,
                      ),
                      textStyle: MaterialStatePropertyAll(
                        TextStyle(fontSize: mainFont),
                      ),
                    ),
                    child: AutoSizeText(t('back'), maxLines: 1),
                  ),
                ),
              ],
            ),
          );

          // SCROLL SOLO SI ES NECESARIO (pantallas muy pequeñas)
          return Center(
            child: SingleChildScrollView(
              padding: EdgeInsets.symmetric(vertical: gap * 2),
              child: contenido,
            ),
          );
        },
      ),
    );
  }
}
