import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

/// Modelo que representa una tarifa de Firestore
class Tariff {
  Tariff({
    required this.basePrice,
    required this.minDuration,
    required this.maxDuration,
    required this.startTime,
    required this.endTime,
    required this.increment,
    required this.extraBlockPrice,
    required this.validDays,
    required this.emergencyActive,
    required this.emergencyReason,
    required this.zoneId,
    required this.updatedAt,
  });

  final double basePrice;
  final int minDuration;
  final int maxDuration;
  final TimeOfDay startTime;
  final TimeOfDay endTime;
  final int increment;
  final double extraBlockPrice;
  final List<int> validDays;
  final bool emergencyActive;
  final int emergencyReason;
  final String zoneId;
  final DateTime updatedAt;

  factory Tariff.fromFirestore(Map<String, dynamic> data) {
    TimeOfDay parseTime(String s) {
      final parts = s.split(':');
      return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    }

    return Tariff(
      basePrice: (data['basePrice'] as num).toDouble(),
      minDuration: data['minDuration'] as int,
      maxDuration: data['maxDuration'] as int,
      startTime: parseTime(data['startTime'] as String),
      endTime: parseTime(data['endTime'] as String),
      increment: data['increment'] as int,
      extraBlockPrice: (data['extraBlockPrice'] as num).toDouble(),
      validDays: List<int>.from(data['validDays'] as List),
      emergencyActive: data['emergencyActive'] as bool? ?? false,
      emergencyReason: data['emergencyReason'] as int? ?? 0,
      zoneId: data['zoneId'] as String,
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
    );
  }
}

/// Provider que gestiona la tarifa seleccionada y el cálculo de precios
class TariffProvider extends ChangeNotifier {
  TariffProvider();

  final _firestore = FirebaseFirestore.instance;

  Tariff? _tariff;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _sub;
  int _duration = 0;
  double _price = 0;
  bool _loading = false;

  Tariff? get tariff => _tariff;
  int get duration => _duration;
  double get price => _price;
  bool get loading => _loading;

  /// Escucha en tiempo real el documento de tarifa para la zona [zoneId]
  Future<void> selectZone(String zoneId) async {
    _sub?.cancel();
    _loading = true;
    notifyListeners();
    final docRef = _firestore.collection('tariffs').doc('tariff-$zoneId');
    _sub = docRef.snapshots().listen((snapshot) {
      if (!snapshot.exists) return;
      _tariff = Tariff.fromFirestore(snapshot.data()!);
      _duration = _tariff!.minDuration;
      _calculatePrice();
      _loading = false;
      notifyListeners();
    });
  }

  void increase() {
    if (_tariff == null) return;
    final next = _duration + _tariff!.increment;
    _duration = next.clamp(_tariff!.minDuration, _tariff!.maxDuration);
    _calculatePrice();
    notifyListeners();
  }

  void decrease() {
    if (_tariff == null) return;
    final prev = _duration - _tariff!.increment;
    _duration = prev.clamp(_tariff!.minDuration, _tariff!.maxDuration);
    _calculatePrice();
    notifyListeners();
  }

  bool get isAvailable {
    if (_tariff == null) return false;
    final now = DateTime.now();
    if (!_tariff!.validDays.contains(now.weekday)) return false;
    final start = _asToday(_tariff!.startTime);
    final end = _asToday(_tariff!.endTime);
    return now.isAfter(start) && now.isBefore(end);
  }

  void _calculatePrice() {
    if (_tariff == null) {
      _price = 0;
      return;
    }
    // No permitir que la duración exceda la hora de fin
    final now = DateTime.now();
    final end = _asToday(_tariff!.endTime);
    final maxMinutes = end.difference(now).inMinutes;
    if (maxMinutes < _duration) {
      _duration = maxMinutes.clamp(_tariff!.minDuration, _tariff!.maxDuration);
    }

    if (_duration <= _tariff!.minDuration) {
      _price = _tariff!.basePrice;
    } else {
      final increments = ((_duration - _tariff!.minDuration) / _tariff!.increment).ceil();
      _price = _tariff!.basePrice + (increments * _tariff!.extraBlockPrice);
    }
  }

  DateTime _asToday(TimeOfDay t) {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day, t.hour, t.minute);
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}

/// Devuelve un stream con los identificadores de zona disponibles
Stream<List<String>> watchZones() {
  final firestore = FirebaseFirestore.instance;
  return firestore.collection('tariffs').snapshots().map((snap) {
    return snap.docs.map((d) => d.data()['zoneId'] as String).toList();
  });
}
