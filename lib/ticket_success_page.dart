import 'dart:async';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'l10n/app_localizations.dart';
import 'language_selector.dart';
import 'theme_mode_button.dart';

class TicketSuccessPage extends StatefulWidget {
  final String ticketId;
  const TicketSuccessPage({super.key, required this.ticketId});

  @override
  State<TicketSuccessPage> createState() => _TicketSuccessPageState();
}

class _TicketSuccessPageState extends State<TicketSuccessPage> {
  int _seconds = 20;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown(20);
  }

  void _startCountdown(int secs) {
    _timer?.cancel();
    _seconds = secs;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_seconds > 1) {
        setState(() => _seconds--);
      } else {
        t.cancel();
        _goHome();
      }
    });
  }

  void _goHome() {
    Navigator.of(context).popUntil((r) => r.isFirst);
  }

  Future<void> _showEmailDialog() async {
    _timer?.cancel();
    final email = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const EmailDialog(),
    );
    if (!mounted) return;
    if (email != null) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => EmailSentDialog(onClose: _goHome),
      );
    } else {
      _startCountdown(20);
    }
  }

  Future<void> _showSmsDialog() async {
    _timer?.cancel();
    final phone = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (_) => const SmsDialog(),
    );
    if (!mounted) return;
    if (phone != null) {
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => SmsSentDialog(onClose: _goHome),
      );
    } else {
      _startCountdown(20);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        actions: const [
          LanguageSelector(),
          SizedBox(width: 8),
          ThemeModeButton(),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              l.t('paymentDone'),
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Expanded(
              child: Center(
                child: Builder(
                  builder: (context) {
                    final isDark = Theme.of(context).brightness == Brightness.dark;
                    return Container(
                      color: isDark ? Colors.white : Colors.transparent,
                      child: QrImageView(
                        data: widget.ticketId,
                        version: QrVersions.auto,
                        size: 250,
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              l.t('saveTicketQr'),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              l.t('returningIn', params: {'seconds': '$_seconds'}),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _goHome,
              child: Text(l.t('goHome')),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _showEmailDialog,
              child: Text(l.t('sendByEmail')),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _showSmsDialog,
              child: Text(l.t('sendBySms')),
            ),
          ],
        ),
      ),
    );
  }
}

class EmailDialog extends StatefulWidget {
  const EmailDialog({super.key});

  @override
  State<EmailDialog> createState() => _EmailDialogState();
}

class _EmailDialogState extends State<EmailDialog> {
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
          onPressed: () => Navigator.pop(context),
          child: Text(l.t('cancel')),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _email.trim()),
          child: Text(l.t('send')),
        ),
      ],
    );
  }
}

class EmailSentDialog extends StatefulWidget {
  final VoidCallback onClose;
  const EmailSentDialog({super.key, required this.onClose});

  @override
  State<EmailSentDialog> createState() => _EmailSentDialogState();
}

class SmsDialog extends StatefulWidget {
  const SmsDialog({super.key});

  @override
  State<SmsDialog> createState() => _SmsDialogState();
}

class _SmsDialogState extends State<SmsDialog> {
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
          onPressed: () => Navigator.pop(context),
          child: Text(l.t('cancel')),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _phone.trim()),
          child: Text(l.t('send')),
        ),
      ],
    );
  }
}

class SmsSentDialog extends StatefulWidget {
  final VoidCallback onClose;
  const SmsSentDialog({super.key, required this.onClose});

  @override
  State<SmsSentDialog> createState() => _SmsSentDialogState();
}

class _SmsSentDialogState extends State<SmsSentDialog> {
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
        widget.onClose();
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
          onPressed: widget.onClose,
          child: Text(l.t('close')),
        ),
      ],
    );
  }
}

class _EmailSentDialogState extends State<EmailSentDialog> {
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
        widget.onClose();
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
          onPressed: widget.onClose,
          child: Text(l.t('close')),
        ),
      ],
    );
  }
}
