import 'package:flutter/material.dart';

/// Common big button style used across MOWIZ screens.
/// Estilo reutilizable para los botones grandes de las pantallas MOWIZ.
/// Se ha definido aquí para mantener consistencia en alturas y tipografías.
/// Modifica `padding`, `minimumSize` o `textStyle` si necesitas
/// personalizar la apariencia global de los botones.
final ButtonStyle kMowizFilledButtonStyle = FilledButton.styleFrom(
  padding: const EdgeInsets.symmetric(vertical: 20),
  minimumSize: const Size.fromHeight(60),
  textStyle: const TextStyle(
    fontSize: 24,
    fontWeight: FontWeight.bold,
  ),
);
