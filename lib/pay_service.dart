// lib/pay_service.dart

import 'package:cloud_firestore/cloud_firestore.dart';

/// Función que crea un ticket en Firestore
Future<void> payTicket({
  required String zoneId,
  required String plate,
  required int durationMinutes,
}) async {
  // Referencia a Firestore
  final firestore = FirebaseFirestore.instance;

  // Calculamos paidUntil
  final now = DateTime.now();
  final paidUntil = now.add(Duration(minutes: durationMinutes));

  // Creamos el documento en 'tickets'
  await firestore.collection('tickets').add({
    'zoneId': zoneId,
    'plate': plate,
    'paidUntil': Timestamp.fromDate(paidUntil),
    'status': 'paid',
    'duration': durationMinutes,
  });
}
