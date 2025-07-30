const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());

// ---- Configuración de zonas y bloques ----
const zonas = {
  'playa': {
    name: 'Zona Playa',
    color: '#FFD600', // Amarillo
    bloques: [
      { minutos: 8,  timeInSeconds: 480,  priceInCents: 19 },
      { minutos: 16, timeInSeconds: 960,  priceInCents: 34 },
      { minutos: 32, timeInSeconds: 1920, priceInCents: 65 },
      { minutos: 60, timeInSeconds: 3600, priceInCents: 110 }
    ],
    maxDurationSeconds: 7200 // 2 horas
  },
  'costa': {
    name: 'Zona Costa',
    color: '#1891FF', // Azul
    bloques: [
      { minutos: 10, timeInSeconds: 600,  priceInCents: 24 },
      { minutos: 20, timeInSeconds: 1200, priceInCents: 40 },
      { minutos: 45, timeInSeconds: 2700, priceInCents: 85 },
      { minutos: 90, timeInSeconds: 5400, priceInCents: 170 }
    ],
    maxDurationSeconds: 10800 // 3 horas
  },
  'parque': {
    name: 'Zona Parque',
    color: '#9C27B0', // Morado
    bloques: [
      { minutos: 15, timeInSeconds: 900,  priceInCents: 20 },
      { minutos: 30, timeInSeconds: 1800, priceInCents: 36 },
      { minutos: 60, timeInSeconds: 3600, priceInCents: 65 },
      { minutos: 120, timeInSeconds: 7200, priceInCents: 120 }
    ],
    maxDurationSeconds: 14400 // 4 horas
  }
};

// ---- ENDPOINT: listado de zonas (con color) ----
app.get('/v1/onstreet-service/zones', (req, res) => {
  const allZones = Object.entries(zonas).map(([id, zona]) => ({
    id,
    name: zona.name,
    color: zona.color
  }));
  res.json(allZones);
});

// --- Endpoint de productos/tarifas por zona ---
app.get('/v1/onstreet-service/product/by-zone/:zoneId&plate=:plate', (req, res) => {
  const { zoneId, plate } = req.params;
  const zona = zonas[zoneId];

  if (!zona) return res.json([]);

  const steps = zona.bloques.map(bloque => ({
    ...bloque,
    endDateTime: new Date(new Date().getTime() + bloque.timeInSeconds * 1000).toISOString()
  }));

  const mockResponse = [
    {
      id: zoneId,
      vehicleType: "CAR",
      productType: "STANDARD",
      averageStayDuration: 30,
      canDriveOff: true,
      extensible: true,
      coldDownTime: 120,
      name: zona.name,
      color: zona.color, // Campo para la app Flutter
      description: `${zona.name} - Tarifa por bloques`,
      rateSteps: {
        steps: steps,
        firstStepStartsAt: new Date().toISOString(),
        startTimeInSeconds: 0,
        minEndTimeInSeconds: Math.min(...zona.bloques.map(b => b.timeInSeconds)),
        ticketId: 1,
        priceRequestedAt: new Date().toISOString(),
        timeZone: "Europe/Madrid",
        currency: "EUR",
        errorMsgList: [],
        paymentMethods: ["CASH", "BIZUM", "CARD"],
        maxDurationSeconds: zona.maxDurationSeconds
      }
    }
  ];

  res.json(mockResponse);
});

// =========================
// Array de tickets pagados
// =========================
let ticketsPagados = [
  { plate: "ABCD123", ticketId: 1 }
];

// =====================================
// Endpoint para guardar pagos en memoria
// =====================================
app.post('/v1/onstreet-service/pay-ticket', express.json(), (req, res) => {
  const { plate } = req.body;
  if (!plate) return res.status(400).json({ error: "Falta matrícula" });
  if (ticketsPagados.some(t => t.plate === plate)) {
    return res.json({ success: false, message: "Ticket ya existe" });
  }
  ticketsPagados.push({ plate, ticketId: ticketsPagados.length + 1 });
  res.json({ success: true, message: "Ticket guardado" });
});

// ============================
// Endpoint de validación ticket
// ============================
app.get('/v1/onstreet-service/validate-ticket/:plate', (req, res) => {
  const { plate } = req.params;
  const ticket = ticketsPagados.find(t => t.plate === plate);
  if (ticket) {
    res.json({ valid: true, message: "Ticket pagado y válido", ticketId: ticket.ticketId });
  } else {
    res.json({ valid: false, message: "Ticket no encontrado o no pagado" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Mock Express Server funcionando en http://localhost:${PORT}`);
});
