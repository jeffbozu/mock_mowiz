import 'package:flutter/material.dart';

class MowizScaffold extends StatelessWidget {
  final Widget body;
  final String? title;
  final List<Widget>? actions;
  const MowizScaffold({
    required this.body,
    this.title,
    this.actions,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    // Clona el tema actual y sólo activa Material 3
    final mowizTheme = theme.copyWith(
      useMaterial3: true,
      colorScheme: theme.colorScheme.copyWith(
        // NO cambies los colores corporativos existentes
        primary: theme.colorScheme.primary,
        secondary: theme.colorScheme.secondary,
      ),
    );
    return Theme(
      data: mowizTheme,
      child: Scaffold(
        appBar: title == null
            ? null
            : AppBar(
                title: Text(title!),
                actions: actions,
              ),
        body: body,
      ),
    );
  }
}
