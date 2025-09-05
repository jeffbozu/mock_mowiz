import 'package:audioplayers/audioplayers.dart';

/// Helper para reproducir sonidos en la app.
/// Se ha diseñado para ser fácilmente extensible con más efectos de audio.
class SoundHelper {
  // Constructor privado para evitar instancias
  SoundHelper._();

  /// Reproductor para el sonido de tap. Se mantiene en memoria para
  /// reducir la latencia al pulsar un botón.
  static final AudioPlayer _tapPlayer =
      AudioPlayer()..setReleaseMode(ReleaseMode.stop);

  /// Ruta del sonido de tap dentro de assets.
  static const String _tapAsset = 'sound/start.mp3';

  // Utilizamos el mismo sonido para éxito y error por ahora, pero se pueden
  // cambiar estas rutas en el futuro.
  static const String _successAsset = 'sound/start.mp3';
  static const String _errorAsset = 'sound/start.mp3';

  static final AudioPlayer _successPlayer =
      AudioPlayer()..setReleaseMode(ReleaseMode.stop);
  static final AudioPlayer _errorPlayer =
      AudioPlayer()..setReleaseMode(ReleaseMode.stop);

  /// Reproduce el sonido de tap. Se llama al pulsar cualquier botón.
  static Future<void> playTap() async {
    try {
      // Si el sonido estaba sonando, lo reiniciamos para reproducirlo de nuevo
      await _tapPlayer.stop();
    } catch (_) {
      // Ignoramos cualquier error al detener
    }
    await _tapPlayer.play(AssetSource(_tapAsset));
  }

  /// Reproduce el sonido de éxito al validar o guardar un ticket.
  static Future<void> playSuccess() async {
    try {
      await _successPlayer.stop();
    } catch (_) {
      // Ignoramos errores al detener
    }
    await _successPlayer.play(AssetSource(_successAsset));
  }

  /// Reproduce el sonido de error para notificar fallos.
  static Future<void> playError() async {
    try {
      await _errorPlayer.stop();
    } catch (_) {
      // Ignoramos errores al detener
    }
    await _errorPlayer.play(AssetSource(_errorAsset));
  }

  // Se pueden añadir más métodos y reproducir diferentes sonidos en el futuro.
}
