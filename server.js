/******************************************************************
 *  MOCK MOWIZ  –  Servidor Express con “config remota” (opción B)
 *  --------------------------------------------------------------
 *  • La app Flutter arranca apuntando a PUBLIC_URL_DEFAULT.
 *  • Hace GET  /v1/config  ➜ recibe { apiBaseUrl: '...' } y
 *    actualiza la URL base al vuelo.                         
 *  • Puedes sobreescribir la URL en Render ➜ ENV PUBLIC_URL.
 ******************************************************************/
const express  = require('express');
const cors     = require('cors');
const app      = express();
const PORT     = process.env.PORT || 3000;

/* ---- 1. URL por defecto (cambia y haz git push si quieres) ----- */
const PUBLIC_URL_DEFAULT = 'https://mock-mowiz.onrender.com';

/* ---- 2. Middleware ------------------------------------------- */
app.use(cors({
  origin: [
    'https://jeffbozu.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());  // para POST /pay-ticket

/* ---- 3. Datos mock ------------------------------------------- */
const zonas = {
  blue: {
    name  : 'Zona rosa',
    color : '#FF0080',
    bloques: [
      { minutos: 3,  timeInSeconds:  180, priceInCents:  80 },
      { minutos: 10, timeInSeconds:  600, priceInCents:  90 },
      { minutos: 25, timeInSeconds:  1500, priceInCents:  65 },
      { minutos: 120, timeInSeconds: 7200, priceInCents:  90 },
      { minutos: 180, timeInSeconds: 10800, priceInCents: 250 },
    ],
    maxDurationSeconds: 3600,   // 1 h
  },
  green: {
    name  : 'Zona verde',
    color : '#01AE00',
    bloques: [
      { minutos: 5,  timeInSeconds:  300, priceInCents:  25 },
      { minutos: 10, timeInSeconds:  600, priceInCents:  40 },
      { minutos: 15, timeInSeconds:  900, priceInCents:  60 },
      { minutos: 30, timeInSeconds: 1800, priceInCents: 100 },
      { minutos: 60, timeInSeconds: 3600, priceInCents: 180 },
    ],
    maxDurationSeconds: 5400,   // 1 h 30
  },
};

/* ---- 4. Endpoint “config” ------------------------------------ */
app.get('/v1/config', (req, res) => {
  const apiBaseUrl =
    process.env.PUBLIC_URL        // 1º variable de entorno (Render)
      || PUBLIC_URL_DEFAULT       // 2º constante compilada
      || `https://${req.headers.host}`; // 3º fallback local

  res.json({ version: 1, apiBaseUrl });
});

/* ---- 5. Zonas disponibles ------------------------------------ */
app.get('/v1/onstreet-service/zones', (_req, res) => {
  const data = Object.entries(zonas).map(([id, z]) => ({
    id,
    name : z.name,
    color: z.color,
  }));
  res.json(data);
});

/* ---- 6. Tarifas por zona ------------------------------------- */
app.get(
  '/v1/onstreet-service/product/by-zone/:zoneId&plate=:plate',
  (req, res) => {
    const zona = zonas[req.params.zoneId];
    if (!zona) return res.json([]);

    const steps = zona.bloques.map(b => ({
      ...b,
      endDateTime: new Date(Date.now() + b.timeInSeconds * 1000).toISOString(),
    }));

    res.json([{
      id          : req.params.zoneId,
      vehicleType : 'CAR',
      productType : 'STANDARD',
      averageStayDuration: 30,
      canDriveOff : true,
      extensible  : true,
      coldDownTime: 120,
      name        : zona.name,
      color       : zona.color,
      description : `${zona.name} - Tarifa por bloques`,
      rateSteps   : {
        steps,
        firstStepStartsAt : new Date().toISOString(),
        startTimeInSeconds: 0,
        minEndTimeInSeconds:
          Math.min(...zona.bloques.map(b => b.timeInSeconds)),
        ticketId          : 1,
        priceRequestedAt  : new Date().toISOString(),
        timeZone          : 'Europe/Madrid',
        currency          : 'EUR',
        errorMsgList      : [],
        paymentMethods    : ['CASH', 'BIZUM', 'CARD'],
        maxDurationSeconds: zona.maxDurationSeconds,
      },
    }]);
  },
);

/* ---- 7. Mock pago y validación ------------------------------- */
let ticketsPagados = [{ plate: '1234ABC', ticketId: 1 }];

app.post('/v1/onstreet-service/pay-ticket', (req, res) => {
  const { plate } = req.body || {};
  if (!plate) return res.status(400).json({ error: 'Falta matrícula' });

  if (ticketsPagados.some(t => t.plate === plate))
    return res.json({ success: false, message: 'Ticket ya existe' });

  ticketsPagados.push({ plate, ticketId: ticketsPagados.length + 1 });
  res.json({ success: true, message: 'Ticket guardado' });
});

app.get('/v1/onstreet-service/validate-ticket/:plate', (req, res) => {
  const t = ticketsPagados.find(x => x.plate === req.params.plate);
  res.json(
    t
      ? { valid: true,  ticketId: t.ticketId }
      : { valid: false, message: 'Ticket no encontrado' },
  );
});

/* ---- 8. Arranque -------------------------------------------- */
app.listen(PORT, () =>
  console.log(`✅ Mock MOWIZ corriendo en http://localhost:${PORT}`),
);
