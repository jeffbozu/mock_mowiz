import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:intl/intl.dart';
import 'package:lottie/lottie.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:confetti/confetti.dart';

import 'l10n/app_localizations.dart';
import 'mowiz_page.dart';
import 'mowiz/mowiz_scaffold.dart';
// Estilo de botones grandes reutilizable para toda la app
import 'styles/mowiz_buttons.dart';
import 'sound_helper.dart';
import 'services/unified_service.dart';
import 'services/email_service.dart';
import 'services/whatsapp_service.dart';

class MowizSuccessPage extends StatefulWidget {
  final String plate;
  final String zone;
  final DateTime start;
  final int minutes;
  final double price;
  final String method;
  final double? discount;

  const MowizSuccessPage({
    super.key,
    required this.plate,
    required this.zone,
    required this.start,
    required this.minutes,
    required this.price,
    required this.method,
    this.discount,
  });

  @override
  State<MowizSuccessPage> createState() => _MowizSuccessPageState();
}

class _MowizSuccessPageState extends State<MowizSuccessPage> {
  int _seconds = 30;
  Timer? _timer;
  late final ConfettiController _confettiController;

  @override
  void initState() {
    super.initState();
    _confettiController =
        ConfettiController(duration: const Duration(seconds: 3))..play();
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds > 1) {
        setState(() => _seconds--);
      } else {
        t.cancel();
        _goHome();
      }
    });
  }

  void _pauseTimer() {
    _timer?.cancel();
  }

  void _goHome() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const MowizPage()),
      (route) => false,
    );
  }

  /// Imprime el ticket usando la impresora térmica conectada
  Future<void> _printTicket() async {
    try {
      // Pausar el temporizador mientras se imprime
      _pauseTimer();
      
      // Mostrar indicador de impresión
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Imprimiendo ticket...'),
          duration: Duration(seconds: 2),
        ),
      );
      
      // Calcular fecha de fin basada en los minutos
      final endTime = widget.start.add(Duration(minutes: widget.minutes));
      
      // Generar datos QR para el ticket
      final qrData = jsonEncode({
        'plate': widget.plate,
        'zone': widget.zone,
        'start': widget.start.toIso8601String(),
        'end': endTime.toIso8601String(),
        'price': widget.price,
        'method': widget.method,
        if (widget.discount != null && widget.discount != 0) 'discount': widget.discount,
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      // Imprimir ticket usando el servicio unificado
      final success = await UnifiedService.printTicket(
        plate: widget.plate,
        zone: widget.zone,
        start: widget.start,
        end: endTime,
        price: widget.price,
        method: widget.method,
        qrData: qrData,
        discount: widget.discount,
        locale: AppLocalizations.of(context).locale.languageCode,
      );
      
      if (success) {
        // Ticket impreso exitosamente
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Ticket impreso correctamente'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 3),
          ),
        );
      } else {
        // Error al imprimir
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Error al imprimir el ticket'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
      }
      
    } catch (e) {
      // Error inesperado
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: $e'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
    } finally {
      // Reanudar el temporizador
      _startTimer();
    }
  }

  Future<void> _showEmailDialog() async {
    _pauseTimer();
    final email = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _EmailDialog(),
    );
    if (!mounted) return;
    if (email != null) {
      // Enviar email usando el servicio
      await _sendTicketEmail(email);
    } else {
      _startTimer();
    }
  }
  
  /// Envía el ticket por email
  Future<void> _sendTicketEmail(String email) async {
    try {
      // Mostrar indicador de envío
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enviando ticket por email...'),
          duration: Duration(seconds: 2),
        ),
      );
      
      // Calcular fecha de fin
      final endTime = widget.start.add(Duration(minutes: widget.minutes));
      
      // Generar datos QR para el ticket
      final qrData = jsonEncode({
        'plate': widget.plate,
        'zone': widget.zone,
        'start': widget.start.toIso8601String(),
        'end': endTime.toIso8601String(),
        'price': widget.price,
        'method': widget.method,
        if (widget.discount != null && widget.discount != 0) 'discount': widget.discount,
        'timestamp': DateTime.now().toIso8601String(),
      });
      
      // Enviar email
      final success = await EmailService.sendTicketEmail(
        recipientEmail: email,
        plate: widget.plate,
        zone: widget.zone,
        start: widget.start,
        end: endTime,
        price: widget.price,
        method: widget.method,
        qrData: qrData,
        customSubject: 'Tu Ticket de Estacionamiento - ${widget.plate}',
        customMessage: 'Hemos procesado tu pago exitosamente. Adjunto encontrarás tu ticket de estacionamiento.',
      );
      
      if (success) {
        // Email enviado exitosamente
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (_) => _EmailSentDialog(onClose: _startTimer),
        );
      } else {
        // Error al enviar email
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Error al enviar el email'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 3),
          ),
        );
        _startTimer();
      }
      
    } catch (e) {
      // Error inesperado
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('❌ Error: $e'),
          backgroundColor: Colors.red,
          duration: Duration(seconds: 3),
        ),
      );
      _startTimer();
    }
  }

  Future<void> _showSmsDialog() async {
    _pauseTimer();
    final phone = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const _SmsDialog(),
    );
    if (!mounted) return;
    if (phone != null) {
      try {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Enviando ticket por WhatsApp...'),
            duration: Duration(seconds: 2),
          ),
        );

        final endTime = widget.start.add(Duration(minutes: widget.minutes));
        final success = await WhatsAppService.sendTicketWhatsApp(
          phone: phone,
          plate: widget.plate,
          zone: widget.zone,
          start: widget.start,
          end: endTime,
          price: widget.price,
          method: widget.method,
          discount: widget.discount,
          qrData:
              'ticket|plate:${widget.plate}|zone:${widget.zone}|start:${widget.start.toIso8601String()}|end:${endTime.toIso8601String()}|price:${widget.price}${widget.discount != null && widget.discount != 0 ? '|discount:${widget.discount}' : ''}',
          localeCode: AppLocalizations.of(context).locale.toString(),
        );

        if (success) {
          await showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => _SmsSentDialog(onClose: _startTimer),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('❌ Error al enviar por WhatsApp'),
              backgroundColor: Colors.red,
              duration: Duration(seconds: 3),
            ),
          );
          _startTimer();
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('❌ Error: $e'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
        _startTimer();
      }
    } else {
      _startTimer();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _confettiController.dispose();
    super.dispose();
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
            : 'en_US';
    final timeFormat = l.locale.languageCode == 'en'
        ? DateFormat('MMM d, yyyy – HH:mm', localeCode)
        : DateFormat('d MMM yyyy – HH:mm', localeCode);
    final currencyFormat = NumberFormat.currency(locale: localeCode, symbol: '€');
    final methodMap = {
      'card': t('card'),
      'qr': t('qrPay'),
      'mobile': t('mobilePay'),
      'cash': l.locale.languageCode == 'es'
          ? 'Efectivo'
          : l.locale.languageCode == 'ca'
              ? 'Efectiu'
              : 'Cash',
      'bizum': 'Bizum',
    };
    final ticketJson =
        'ticket|plate:${widget.plate}|zone:${widget.zone}|start:${widget.start.toIso8601String()}|end:${finish.toIso8601String()}|price:${widget.price}${widget.discount != null && widget.discount != 0 ? '|discount:${widget.discount}' : ''}';
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Contenido principal, centralizado y con ancho máx fijo
    Widget mainContent(double width, double height) {
      final isMobile = width < 500;
      final safeWidth = width > 550 ? 500.0 : width * 0.97;
      final qrSize = safeWidth * (isMobile ? 0.6 : 0.38);
      final titleFont = safeWidth * (isMobile ? 0.065 : 0.055);
      final subFont = safeWidth * (isMobile ? 0.055 : 0.038);
      final gap = safeWidth * (isMobile ? 0.03 : 0.035);

      return Center(
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: safeWidth,
            minWidth: 220,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Lottie.asset(
                'assets/success.json',
                height: qrSize * 0.5,
                repeat: false,
              ),
              SizedBox(height: gap / 2),
              AutoSizeText(
                t('paymentSuccess'),
                maxLines: 1,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: titleFont,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: gap / 2),
              Center(
                child: QrImageView(
                  data: ticketJson,
                  size: qrSize,
                  foregroundColor: isDark ? Colors.white : Colors.black,
                ),
              ),
              SizedBox(height: gap),
              // Tarjeta resumen
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                elevation: 4,
                child: Padding(
                  padding: EdgeInsets.all(gap * 0.9),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AutoSizeText(
                        t('ticketSummary'),
                        maxLines: 1,
                        style: TextStyle(
                          fontSize: subFont,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      AutoSizeText(
                        "${t('plate')}: ${widget.plate}",
                        maxLines: 1,
                        style: TextStyle(fontSize: subFont - 2),
                      ),
                      AutoSizeText(
                        "${t('zone')}: ${widget.zone == 'green' ? t('zoneGreen') : t('zoneBlue')}",
                        maxLines: 1,
                        style: TextStyle(fontSize: subFont - 3),
                      ),
                      AutoSizeText(
                        "${t('startTime')}: ${timeFormat.format(widget.start)}",
                        maxLines: 1,
                        style: TextStyle(fontSize: subFont - 4),
                      ),
                      AutoSizeText(
                        "${t('endTime')}: ${timeFormat.format(finish)}",
                        maxLines: 1,
                        style: TextStyle(fontSize: subFont - 4),
                      ),
                      AutoSizeText(
                        "${t('totalPrice')}: ${currencyFormat.format(widget.price)}",
                        maxLines: 1,
                        style: TextStyle(
                          fontSize: subFont - 3,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if ((widget.discount ?? 0) != 0) ...[
                        AutoSizeText(
                          "${t('discount')}: ${currencyFormat.format(widget.discount!)}",
                          maxLines: 1,
                          style: TextStyle(fontSize: subFont - 3, color: Colors.green),
                        ),
                      ],
                      AutoSizeText(
                        "${t('paymentMethod')}: ${methodMap[widget.method] ?? widget.method}",
                        maxLines: 1,
                        style: TextStyle(fontSize: subFont - 3),
                      ),
                    ],
                  ),
                ),
              ),
              SizedBox(height: gap),
              // Botones de acción
              Wrap(
                spacing: gap,
                runSpacing: gap / 2,
                alignment: WrapAlignment.center,
                children: [
                  SizedBox(
                    width: (safeWidth - gap * 1.5) / 2,
                    child: FilledButton(
                      onPressed: () async {
                        SoundHelper.playTap();
                        await _printTicket();
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        textStyle: MaterialStatePropertyAll(
                          TextStyle(fontSize: subFont - 5),
                        ),
                      ),
                      child: AutoSizeText(t('printTicket'), maxLines: 1),
                    ),
                  ),
                  SizedBox(
                    width: (safeWidth - gap * 1.5) / 2,
                    child: FilledButton(
                      onPressed: () {
                        SoundHelper.playTap();
                        _showSmsDialog();
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        textStyle: MaterialStatePropertyAll(
                          TextStyle(fontSize: subFont - 5),
                        ),
                      ),
                      child: AutoSizeText(t('sendBySms'), maxLines: 1),
                    ),
                  ),
                  SizedBox(
                    width: (safeWidth - gap * 1.5) / 2,
                    child: FilledButton(
                      onPressed: () {
                        SoundHelper.playTap();
                        _showEmailDialog();
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        textStyle: MaterialStatePropertyAll(
                          TextStyle(fontSize: subFont - 5),
                        ),
                      ),
                      child: AutoSizeText(t('sendByEmail'), maxLines: 1),
                    ),
                  ),
                  SizedBox(
                    width: (safeWidth - gap * 1.5) / 2,
                    child: FilledButton(
                      onPressed: () {
                        SoundHelper.playTap();
                        _goHome();
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        textStyle: MaterialStatePropertyAll(
                          TextStyle(fontSize: subFont - 5),
                        ),
                      ),
                      child: AutoSizeText(t('home'), maxLines: 1),
                    ),
                  ),
                ],
              ),
              SizedBox(height: gap * 1.2),
              // Temporizador de retorno
              AutoSizeText(
                t('returningIn', params: {'seconds': '$_seconds'}),
                maxLines: 1,
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: subFont - 3),
              ),
            ],
          ),
        ),
      );
    }

    return MowizScaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight;

          // Detecta si necesita scroll: si el contenido es mayor que la ventana
          final main = mainContent(width, height);
          // Estimamos la altura mínima que requiere el contenido principal
          final minMainHeight = 800.0; // puedes ajustar este valor a tu caso
          final needsScroll = height < minMainHeight;

          return Stack(
            children: [
              Align(
                alignment: Alignment.topCenter,
                child: ConfettiWidget(
                  confettiController: _confettiController,
                  blastDirectionality: BlastDirectionality.explosive,
                  shouldLoop: false,
                  numberOfParticles: 25,
                  maxBlastForce: 20,
                  minBlastForce: 5,
                  emissionFrequency: 0.15,
                  gravity: 0.14,
                ),
              ),
              if (needsScroll)
                SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: main,
                  ),
                )
              else
                main,
            ],
          );
        },
      ),
    );
  }
}

// Diálogo para ingresar el email
class _EmailDialog extends StatefulWidget {
  const _EmailDialog();

  @override
  State<_EmailDialog> createState() => _EmailDialogState();
}

class _EmailDialogState extends State<_EmailDialog> {
  String _email = '';

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(l.t('enterEmail')),
      content: TextField(
        autofocus: true,
        keyboardType: TextInputType.emailAddress,
        onChanged: (v) => _email = v,
      ),
      actions: [
        TextButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.pop(context);
          },
          child: Text(l.t('close')),
        ),
        ElevatedButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.pop(context, _email.trim());
          },
          child: Text(l.t('send')),
        ),
      ],
    );
  }
}

// Diálogo para ingresar el teléfono
class _SmsDialog extends StatefulWidget {
  const _SmsDialog();

  @override
  State<_SmsDialog> createState() => _SmsDialogState();
}

class _SmsDialogState extends State<_SmsDialog> {
  String _phone = '';

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(l.t('enterPhone')),
      content: TextField(
        autofocus: true,
        keyboardType: TextInputType.phone,
        onChanged: (v) => _phone = v,
      ),
      actions: [
        TextButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.pop(context);
          },
          child: Text(l.t('close')),
        ),
        ElevatedButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.pop(context, _phone.trim());
          },
          child: Text(l.t('send')),
        ),
      ],
    );
  }
}

// Diálogo de confirmación de email enviado
class _EmailSentDialog extends StatefulWidget {
  final VoidCallback onClose;
  const _EmailSentDialog({required this.onClose});

  @override
  State<_EmailSentDialog> createState() => _EmailSentDialogState();
}

class _EmailSentDialogState extends State<_EmailSentDialog> {
  int _seconds = 10;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds > 1) {
        setState(() => _seconds--);
      } else {
        t.cancel();
        if (mounted) {
          Navigator.of(context).pop();
          widget.onClose();
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l.t('emailSent')),
          const SizedBox(height: 8),
          Text(l.t('returningIn', params: {'seconds': '$_seconds'})),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.of(context).pop();
            widget.onClose();
          },
          child: Text(l.t('close')),
        ),
      ],
    );
  }
}

// Diálogo de confirmación de SMS enviado
class _SmsSentDialog extends StatefulWidget {
  final VoidCallback onClose;
  const _SmsSentDialog({required this.onClose});

  @override
  State<_SmsSentDialog> createState() => _SmsSentDialogState();
}

class _SmsSentDialogState extends State<_SmsSentDialog> {
  int _seconds = 10;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds > 1) {
        setState(() => _seconds--);
      } else {
        t.cancel();
        if (mounted) {
          Navigator.of(context).pop();
          widget.onClose();
        }
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return AlertDialog(
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l.t('smsSent')),
          const SizedBox(height: 8),
          Text(l.t('returningIn', params: {'seconds': '$_seconds'})),
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () {
            SoundHelper.playTap();
            Navigator.of(context).pop();
            widget.onClose();
          },
          child: Text(l.t('close')),
        ),
      ],
    );
  }
}
