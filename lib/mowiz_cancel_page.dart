import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:http/http.dart' as http;

// Base URL configuration for API calls
import 'config_service.dart';

import 'l10n/app_localizations.dart';
import 'mowiz/mowiz_scaffold.dart';
import 'styles/mowiz_buttons.dart';
import 'sound_helper.dart';

class MowizCancelPage extends StatefulWidget {
  const MowizCancelPage({super.key});

  @override
  State<MowizCancelPage> createState() => _MowizCancelPageState();
}

class _MowizCancelPageState extends State<MowizCancelPage> {
  final _plateCtrl = TextEditingController();
  bool _loading = false;

  bool get _validateDisabled => _plateCtrl.text.trim().isEmpty || _loading;

  @override
  void dispose() {
    _plateCtrl.dispose();
    super.dispose();
  }

  Future<void> _validate() async {
    final l = AppLocalizations.of(context);
    final t = l.t; // i18n
    final plate = _plateCtrl.text.trim().toUpperCase();
    setState(() => _loading = true);
    try {
      // API call
      final res = await http.get(
        // Use the base URL constant here
        Uri.parse('${ConfigService.apiBaseUrl}/v1/onstreet-service/validate-ticket/$plate'),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final valid = data['valid'] == true;
        final msg = data['message'] as String?;
        // SnackBar
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(valid
                ? (msg?.isNotEmpty == true
                    ? msg!
                    : t('ticketValid'))
                : t('ticketNotFound')),
            backgroundColor: valid ? Colors.green : Colors.red,
          ),
        );
        if (valid) {
          SoundHelper.playSuccess();
          await Future.delayed(const Duration(seconds: 2));
          if (mounted) Navigator.of(context).pop();
        } else {
          SoundHelper.playError();
        }
      } else {
        debugPrint('HTTP ${res.statusCode}: ${res.body}');
        // SnackBar
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(t('networkError')),
            backgroundColor: Colors.red,
          ),
        );
        SoundHelper.playError();
      }
    } catch (e) {
      debugPrint('Error: $e');
      // SnackBar
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(t('networkError')),
          backgroundColor: Colors.red,
        ),
      );
      SoundHelper.playError();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).t; // i18n
    return MowizScaffold(
      title: t('cancelFine'),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final isLargeTablet = width >= 900;
          final isTablet = width >= 600 && width < 900;
          final padding = EdgeInsets.all(width * 0.05);
          final double gap = width * 0.04;
          final double fontSize =
              isLargeTablet ? 28 : isTablet ? 24 : 20;

          return Center(
            child: Padding(
              padding: padding,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _plateCtrl,
                    textCapitalization: TextCapitalization.characters,
                    decoration: InputDecoration(hintText: t('enterPlate')),
                    style: TextStyle(fontSize: fontSize),
                    onChanged: (_) => setState(() {}),
                  ),
                  SizedBox(height: gap * 1.2),
                  FilledButton(
                    onPressed: _validateDisabled
                        ? null
                        : () {
                            SoundHelper.playTap();
                            _validate();
                          },
                    style: kMowizFilledButtonStyle.copyWith(
                      textStyle:
                          MaterialStatePropertyAll(TextStyle(fontSize: fontSize)),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : AutoSizeText(t('validate'), maxLines: 1),
                  ),
                  SizedBox(height: gap),
                  FilledButton(
                    onPressed: () {
                      SoundHelper.playTap();
                      Navigator.of(context).pop();
                    },
                    style: kMowizFilledButtonStyle.copyWith(
                      backgroundColor:
                          const MaterialStatePropertyAll(Color(0xFFA7A7A7)),
                      textStyle:
                          MaterialStatePropertyAll(TextStyle(fontSize: fontSize)),
                    ),
                    child: AutoSizeText(t('cancel'), maxLines: 1),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
