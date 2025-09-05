import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:auto_size_text/auto_size_text.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;

import 'config_service.dart';
import 'l10n/app_localizations.dart';
import 'mowiz_page.dart';
import 'mowiz_pay_page.dart';
import 'mowiz_summary_page.dart';
import 'mowiz/mowiz_scaffold.dart';
import 'styles/mowiz_buttons.dart';
import 'sound_helper.dart';
import 'services/unified_service.dart';

class MowizTimePage extends StatefulWidget {
  final String zone;
  final String plate;
  const MowizTimePage({super.key, required this.zone, required this.plate});

  @override
  State<MowizTimePage> createState() => _MowizTimePageState();
}

class _MowizTimePageState extends State<MowizTimePage> {
  late DateTime _now;
  Timer? _clock;

  /// mapa minutos → céntimos
  final Map<int, int> _steps = {};
  List<int> _blocks = [];

  int? _maxDurationSec;
  bool _loaded = false;

  int _totalSec = 0;
  int _totalCents = 0;
  double _discountEurosApplied = 0.0;

  /* ───────────────  HELPERS  ─────────────── */

  String _fmtMin(int m) {
    if (m % 60 == 0) return '${m ~/ 60}h';
    if (m > 60) return '${m ~/ 60}h ${m % 60}min';
    return '$m min';
  }

  /* ─────────────  LOAD TARIFF  ───────────── */

  Future<void> _load() async {
    setState(() {
      _steps.clear();
      _blocks.clear();
      _totalSec = _totalCents = 0;
      _loaded = false;
    });

    final url =
        '${ConfigService.apiBaseUrl}/v1/onstreet-service/product/by-zone/${widget.zone}&plate=${widget.plate}';
    try {
      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body) as List;
        if (body.isNotEmpty) {
          final rate = body.first['rateSteps'] as Map<String, dynamic>;
          for (final s in List<Map<String, dynamic>>.from(rate['steps'] ?? [])) {
            final min = (s['timeInSeconds'] as int) ~/ 60;
            _steps[min] = s['priceInCents'] as int;
          }
          _blocks = _steps.keys.toList()..sort();
          _maxDurationSec = rate['maxDurationSeconds'] as int?;
        }
      }
    } catch (e) {
      debugPrint('Load tariff error: $e');
    }
    setState(() => _loaded = true);
  }

  /* ───────────────  ADD TIME  ────────────── */

  void _add(int min) {
    if (!_steps.containsKey(min)) return;
    final nextSec   = _totalSec   + min * 60;
    final nextCents = _totalCents + _steps[min]!;

    if (_maxDurationSec != null && nextSec > _maxDurationSec!) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Duración máxima alcanzada')),
      );
      return;
    }
    setState(() {
      _totalSec   = nextSec;
      _totalCents = nextCents;
    });
  }

  void _clear() => setState(() { _totalSec = 0; _totalCents = 0; _discountEurosApplied = 0.0; });

  /* ───────────  LIFE-CYCLE  ─────────── */

  @override
  void initState() {
    super.initState();
    _now = DateTime.now();
    _clock = Timer.periodic(const Duration(seconds: 1),
        (_) => setState(() => _now = DateTime.now()));
    _load();
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  /* ────────────────  UI  ──────────────── */

  @override
  Widget build(BuildContext context) {
    final t      = AppLocalizations.of(context).t;
    final locale = Intl.getCurrentLocale();

    final minutes  = _totalSec ~/ 60;
    final finish   = _now.add(Duration(seconds: _totalSec));
    final effectivePrice = ((_totalCents / 100) + _discountEurosApplied).clamp(0, double.infinity);
    final priceStr = NumberFormat.currency(symbol: '€', locale: locale)
        .format(effectivePrice);

    /* ---- responsive columns ---- */
    int cols;
    switch (_blocks.length) {
      case 0:
      case 1:
      case 2:
        cols = 2;
        break;
      case 3:
        cols = 3;
        break;
      case 4:
        cols = 2;
        break;
      default:
        cols = 3;
    }

    Widget timeButton(int m, double fs, double h, double w) => SizedBox(
          width: w,
          height: h,
          child: ElevatedButton(
            style: kMowizFilledButtonStyle.copyWith(
              minimumSize: const MaterialStatePropertyAll(Size(120, 56)),
              textStyle  : MaterialStatePropertyAll(TextStyle(fontSize: fs)),
            ),
            onPressed: () {
              SoundHelper.playTap();
              _add(m);
            },
            child: AutoSizeText('+${_fmtMin(m)}', maxLines: 1),
          ),
        );

    return MowizScaffold(
      title: 'MeyPark - ${t('selectDuration')}',
      body : LayoutBuilder(
        builder: (context, c) {
          final width   = c.maxWidth;
          const gap     = 18.0;
          final fontSz  = width >= 600 ? 24.0 : 19.0;
          final labelSz = fontSz - 2;
          const btnH    = 56.0;
          final btnW    = math.max(120.0,
              (width - 48 - gap * (cols - 1)) / cols);

          return Center(
            child: ConstrainedBox(
              constraints:
                  const BoxConstraints(maxWidth: 550),
              child: SingleChildScrollView(
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AutoSizeText(
                      DateFormat('EEE, d MMM yyyy - HH:mm', locale)
                          .format(_now),
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      style: TextStyle(
                          fontSize: labelSz,
                          fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 22),

                    if (!_loaded)
                      const Center(child: CircularProgressIndicator())
                    else
                      Wrap(
                        alignment: WrapAlignment.center,
                        spacing: gap,
                        runSpacing: gap,
                        children: _blocks
                            .map((m) => timeButton(
                                m, fontSz, btnH, btnW))
                            .toList(),
                      ),

                    const SizedBox(height: 18),
                    ElevatedButton(
                      onPressed: _totalSec > 0 ? _clear : null,
                      style: kMowizFilledButtonStyle.copyWith(
                        backgroundColor: MaterialStatePropertyAll(
                            Theme.of(context).colorScheme.secondary),
                        foregroundColor: MaterialStatePropertyAll(
                            Theme.of(context).colorScheme.onSecondary),
                        minimumSize:
                            const MaterialStatePropertyAll(Size(150, 44)),
                      ),
                      child: AutoSizeText(t('clear'), maxLines: 1),
                    ),
                    const SizedBox(height: 26),

                    AutoSizeText('${minutes ~/ 60}h ${minutes % 60}m',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        style: TextStyle(
                            fontSize: fontSz + 10,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    AutoSizeText('${t('price')}: $priceStr',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        style: TextStyle(
                            fontSize: labelSz,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    AutoSizeText(
                        '${t('until')}: ${DateFormat('HH:mm', locale).format(finish)}',
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        style: TextStyle(
                            fontSize: labelSz,
                            fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),

                    if (_loaded) ...[
                      const SizedBox(height: 4),
                      Column(
                        children: (() {
                          final sorted = _steps.entries.toList()
                            ..sort((a, b) => a.key.compareTo(b.key));
                          return sorted
                              .map((e) => Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 2),
                                    child: AutoSizeText(
                                      '${_fmtMin(e.key)} - ${(e.value / 100).toStringAsFixed(2)} €',
                                      maxLines: 1,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                          fontSize: fontSz - 4),
                                    ),
                                  ))
                              .toList();
                        })(),
                      ),
                    ],

                    const SizedBox(height: 24),
                    FilledButton(
                      onPressed: _totalSec > 0
                          ? () {
                              SoundHelper.playTap();
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => MowizSummaryPage(
                                    plate   : widget.plate,
                                    zone    : widget.zone,
                                    start   : _now,
                                    minutes : minutes,
                                    price   : _totalCents / 100,
                                  ),
                                ),
                              );
                            }
                          : null,
                      style: kMowizFilledButtonStyle.copyWith(
                        minimumSize: const MaterialStatePropertyAll(
                            Size(double.infinity, 50)),
                        textStyle:
                            MaterialStatePropertyAll(TextStyle(fontSize: fontSz)),
                      ),
                      child: AutoSizeText(t('continue'), maxLines: 1),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () {
                        SoundHelper.playTap();
                        Navigator.of(context).pushAndRemoveUntil(
                          MaterialPageRoute(
                              builder: (_) => const MowizPayPage()),
                          (_) => false,
                        );
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        minimumSize: const MaterialStatePropertyAll(
                            Size(double.infinity, 46)),
                        backgroundColor: MaterialStatePropertyAll(
                            Theme.of(context).colorScheme.secondary),
                      ),
                      child: AutoSizeText(t('back'), maxLines: 1),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () async {
                        SoundHelper.playTap();
                        
                        try {
                          // Verificar si el escáner está conectado
                          final isConnected = await UnifiedService.isScannerConnected();
                          
                          if (!isConnected) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Escáner QR no disponible'),
                                backgroundColor: Colors.red,
                              ),
                            );
                            return;
                          }
                          
                          // Mostrar indicador de escaneo
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Escaneando código QR...'),
                              duration: Duration(seconds: 2),
                            ),
                          );
                          
                          // Escanear código QR
                          final discount = await UnifiedService.scanQrCode(timeout: 30);
                          
                          if (discount != null) {
                            // Aplicar descuento al precio total
                            final newTotal = (_totalCents / 100) + discount;
                            final newTotalCents = (newTotal * 100).round();
                            
                            // Asegurar que el precio no sea negativo
                            if (newTotalCents < 0) {
                              setState(() {
                                _totalCents = 0;
                                _discountEurosApplied = discount;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Descuento aplicado: ${discount.toStringAsFixed(2)}€ - Precio final: 0.00€'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            } else {
                              setState(() {
                                _totalCents = newTotalCents;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Descuento aplicado: ${discount.toStringAsFixed(2)}€ - Precio final: ${(newTotalCents / 100).toStringAsFixed(2)}€'),
                                  backgroundColor: Colors.green,
                                ),
                              );
                            }
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('No se escaneó ningún código QR válido'),
                                backgroundColor: Colors.orange,
                              ),
                            );
                          }
                          
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Error al escanear: $e'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                      style: kMowizFilledButtonStyle.copyWith(
                        minimumSize: const MaterialStatePropertyAll(
                            Size(double.infinity, 46)),
                        backgroundColor: MaterialStatePropertyAll(
                            Theme.of(context).colorScheme.secondary),
                      ),
                      child: AutoSizeText(t('scanQrButton'), maxLines: 1),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
