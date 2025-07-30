const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());

const zonas = {
  'blue': {
    name: 'Zona azul',
    bloques: [
      { minutos: 3, timeInSeconds: 180, priceInCents: 20, commissionPriceInCents: 5 },
      { minutos: 5, timeInSeconds: 300, priceInCents: 25, commissionPriceInCents: 10 },
      { minutos: 15, timeInSeconds: 900, priceInCents: 250, commissionPriceInCents: 20 }
    ],
    maxDurationSeconds: 7200 // 2 horas
  },
  'green': {
    name: 'Zona verde',
    bloques: [
      { minutos: 3, timeInSeconds: 180, priceInCents: 30, commissionPriceInCents: 4 },
      { minutos: 5, timeInSeconds: 300, priceInCents: 35, commissionPriceInCents: 8 },
      { minutos: 15, timeInSeconds: 900, priceInCents: 350, commissionPriceInCents: 18 }
    ],
    maxDurationSeconds: 5400 // 1 hora y media
  }
};

app.get('/v1/onstreet-service/product/by-zone/:zoneId&plate=:plate', (req, res) => {
  const { zoneId, plate } = req.params;
  const zona = zonas[zoneId];

  if (!zona) {
    return res.json([]);
  }

  // Los steps son los bloques de tiempo/precio unitario
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
      description: `${zona.name} - Tarifa por bloques`,
      rateSteps: {
        steps: steps,
        firstStepStartsAt: new Date().toISOString(),
        startTimeInSeconds: 0,
        minEndTimeInSeconds: 180,
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
  { plate: "1234ABC", ticketId: 1 },
  { plate: "5678DEF", ticketId: 2 }
];

// =====================================
// Endpoint para guardar pagos en memoria
// =====================================
app.post('/v1/onstreet-service/pay-ticket', express.json(), (req, res) => {
  const { plate } = req.body;
  if (!plate) return res.status(400).json({ error: "Falta matrícula" });
  // Evita duplicados
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
  console.log(`✅ Mock Express MOWIZ funcionando en http://localhost:${PORT}`);
});
