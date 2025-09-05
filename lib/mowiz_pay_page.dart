import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:http/http.dart' as http;

import 'config_service.dart';
import 'l10n/app_localizations.dart';
import 'mowiz_time_page.dart';
import 'mowiz/mowiz_scaffold.dart';
import 'mowiz_page.dart';
import 'styles/mowiz_buttons.dart';
import 'sound_helper.dart';

class _ZoneData {
  const _ZoneData({required this.id, required this.name, required this.color});
  final String id;
  final String name;
  final Color color;
}

class MowizPayPage extends StatefulWidget {
  const MowizPayPage({super.key});

  @override
  State<MowizPayPage> createState() => _MowizPayPageState();
}

class _MowizPayPageState extends State<MowizPayPage> {
  String? _selectedZone;
  final _plateCtrl = TextEditingController();

  List<_ZoneData> _zones = [];
  bool _loadingZones = true;

  Color _parseColor(String hex) {
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  Future<void> _loadZones() async {
    setState(() {
      _zones = [];
      _selectedZone = null;
      _loadingZones = true;
    });
    try {
      final res = await http.get(
        Uri.parse('${ConfigService.apiBaseUrl}/v1/onstreet-service/zones'),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as List;
        _zones = data
            .map((e) => _ZoneData(
                  id: e['id'] as String,
                  name: e['name'] as String,
                  color: _parseColor(e['color'] as String),
                ))
            .toList();
      } else {
        debugPrint('HTTP ${res.statusCode}');
      }
    } catch (e) {
      debugPrint('Error: $e');
    }
    if (mounted) setState(() => _loadingZones = false);
  }

  bool get _confirmEnabled =>
      _selectedZone != null && _plateCtrl.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    _loadZones();
  }

  @override
  void dispose() {
    _plateCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context).t;
    final colorScheme = Theme.of(context).colorScheme;

    return MowizScaffold(
      title: 'MeyPark - ${t('selectZone')}',
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final width = constraints.maxWidth;
            final height = constraints.maxHeight;

            // 🔵 Ancho máximo profesional para evitar botones gigantes
            const double maxContentWidth = 500;
            final double contentWidth = width > maxContentWidth ? maxContentWidth : width;
            final EdgeInsets padding = EdgeInsets.symmetric(horizontal: contentWidth * 0.05);

            final bool isWide = contentWidth >= 700;
            final double gap = isWide ? 32 : 20;
            final double titleFont = isWide ? 28 : 22;
            final double inputFont = isWide ? 22 : 17;
            final double buttonHeight = isWide ? 60 : 48;

            Widget zoneButton(String value, String text, Color color) {
              return FilledButton(
                onPressed: () {
                  SoundHelper.playTap();
                  setState(() => _selectedZone = value);
                },
                style: kMowizFilledButtonStyle.copyWith(
                  minimumSize: MaterialStatePropertyAll(
                    Size(double.infinity, buttonHeight),
                  ),
                  backgroundColor: MaterialStatePropertyAll(
                    _selectedZone == value ? color : colorScheme.secondary,
                  ),
                  textStyle: MaterialStatePropertyAll(
                    TextStyle(fontSize: inputFont),
                  ),
                ),
                child: AutoSizeText(
                  text,
                  maxLines: 1,
                  minFontSize: 13,
                ),
              );
            }

            // 🟣 Distribución vertical y centralizada sin scroll
            return Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: maxContentWidth,
                  minWidth: 260,
                  minHeight: height,
                ),
                child: Padding(
                  padding: padding,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AutoSizeText(
                        t('selectZone'),
                        maxLines: 1,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: titleFont,
                        ),
                      ),
                      SizedBox(height: gap),
                      if (_loadingZones)
                        const Center(child: CircularProgressIndicator())
                      else
                        Builder(
                          builder: (context) {
                            final count = _zones.length.clamp(1, 3);
                            final btnWidth =
                                (contentWidth - gap * (count - 1)) / count;
                            return Wrap(
                              spacing: gap,
                              runSpacing: gap,
                              alignment: WrapAlignment.center,
                              children: _zones
                                  .map(
                                    (z) => SizedBox(
                                      width: btnWidth,
                                      child: zoneButton(z.id, z.name, z.color),
                                    ),
                                  )
                                  .toList(),
                            );
                          },
                        ),
                      SizedBox(height: gap),
                      TextField(
                        controller: _plateCtrl,
                        enabled: _selectedZone != null,
                        decoration: InputDecoration(
                          labelText: t('plate'),
                          hintText: t('enterPlate'),
                        ),
                        style: TextStyle(fontSize: inputFont),
                        onChanged: (_) => setState(() {}),
                      ),
                      SizedBox(height: gap * 1.5),
                      FilledButton(
                        onPressed: _confirmEnabled
                            ? () {
                                SoundHelper.playTap();
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => MowizTimePage(
                                      zone: _selectedZone!,
                                      plate: _plateCtrl.text.trim(),
                                    ),
                                  ),
                                );
                              }
                            : null,
                        style: kMowizFilledButtonStyle.copyWith(
                          minimumSize: MaterialStatePropertyAll(Size(double.infinity, buttonHeight)),
                          textStyle: MaterialStatePropertyAll(
                            TextStyle(fontSize: titleFont),
                          ),
                        ),
                        child: AutoSizeText(
                          t('confirm'),
                          maxLines: 1,
                          minFontSize: 13,
                        ),
                      ),
                      SizedBox(height: gap),
                      FilledButton(
                        onPressed: () {
                          SoundHelper.playTap();
                          Navigator.of(context).pushAndRemoveUntil(
                            MaterialPageRoute(builder: (_) => const MowizPage()),
                            (route) => false,
                          );
                        },
                        style: kMowizFilledButtonStyle.copyWith(
                          minimumSize: MaterialStatePropertyAll(Size(double.infinity, buttonHeight)),
                          textStyle: MaterialStatePropertyAll(
                            TextStyle(fontSize: titleFont),
                          ),
                        ),
                        child: AutoSizeText(
                          t('back'),
                          maxLines: 1,
                          minFontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
