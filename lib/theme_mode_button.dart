import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'theme_provider.dart';

class ThemeModeButton extends StatelessWidget {
  const ThemeModeButton({super.key});

  @override
  Widget build(BuildContext context) {
    final prov = Provider.of<ThemeProvider>(context);
    final isDark = prov.mode == ThemeMode.dark;
    return IconButton(
      iconSize: 32,
      color: Theme.of(context).colorScheme.primary,
      icon: Icon(isDark ? Icons.light_mode : Icons.dark_mode),
      onPressed: prov.toggle,
    );
  }
}
