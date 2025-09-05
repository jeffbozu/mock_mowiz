import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'locale_provider.dart';
import 'flag_images.dart';

class LanguageSelector extends StatelessWidget {
  const LanguageSelector({super.key});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<LocaleProvider>(context);
    return Row(
      children: [
        _flagButton(context, prov, 'es', flagEs, 'ESP'),
        const SizedBox(width: 8),
        _flagButton(context, prov, 'ca', flagCt, 'CAT'),
        const SizedBox(width: 8),
        _flagButton(context, prov, 'en', flagUk, 'ENG'),
      ],
    );
  }

  Widget _flagButton(BuildContext context, LocaleProvider prov, String code, Uint8List bytes, String label) {
    final selected = prov.locale.languageCode == code;
    return InkWell(
      onTap: () => prov.setLocale(Locale(code)),
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        padding: const EdgeInsets.all(2),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? Theme.of(context).colorScheme.primary : Colors.transparent,
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Image.memory(bytes, width: 32, height: 24),
            Text(label, style: const TextStyle(fontSize: 10)),
          ],
        ),
      ),
    );
  }
}
