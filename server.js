/******************************************************************
 *  MOCK MOWIZ – Servidor Express (rama main) con “config remota”
 *  --------------------------------------------------------------
 *  • La app Flutter arranca en el bootstrap - llama a /v1/config.
 *  • /v1/config responde con apiBaseUrl (aquí mismo) y la app ya
 *    sabe dónde hacer el resto de peticiones sin recompilar.
 ******************************************************************/
const express = require('express');
const cors    = require('cors');
const app     = express();
const PORT    = process.env.PORT || 3001;

/* ---- 1. URL por defecto para este servicio ------------------- */
const PUBLIC_URL_DEFAULT = 'https://mock-mowiz.onrender.com';

/* ---- 2. Middleware ------------------------------------------- */
app.use(cors());
app.use(express.json());     // para POST /pay-ticket

/* ---- 3. Datos mock (zonas) ----------------------------------- */
const zonas = {
  playa: {
    name : 'Zona Coche',
    color: '#FFD600',
    bloques: [
      { minutos: 8,  timeInSeconds:  480, priceInCents:  19 },
      { minutos: 16, timeInSeconds:  960, priceInCents:  34 },
      { minutos: 32, timeInSeconds: 1920, priceInCents:  65 },
      { minutos: 60, timeInSeconds: 3600, priceInCents: 110 },
    ],
    maxDurationSeconds: 7200,     // 2 h
  },
  costa: {
    name : 'Zona Moto',
    color: '#1891FF',
    bloques: [
      { minutos: 10, timeInSeconds:  600, priceInCents:  24 },
      { minutos: 20, timeInSeconds: 1200, priceInCents:  40 },
      { minutos: 45, timeInSeconds: 2700, priceInCents:  85 },
      { minutos: 90, timeInSeconds: 5400, priceInCents: 170 },
    ],
    maxDurationSeconds: 10800,    // 3 h
  },
  parque: {
    name : 'Zona Camión',
    color: '#9C27B0',
    bloques: [
      { minutos: 15,  timeInSeconds:  900, priceInCents:  20 },
      { minutos: 30,  timeInSeconds: 1800, priceInCents:  36 },
      { minutos: 60,  timeInSeconds: 3600, priceInCents:  65 },
      { minutos: 120, timeInSeconds: 7200, priceInCents: 120 },
    ],
    maxDurationSeconds: 14400,    // 4 h
  },
};

/* ---- 4. Endpoint de configuración remota --------------------- */
app.get('/v1/config', (req, res) => {
  const apiBaseUrl =
    process.env.PUBLIC_URL        // 1º variable Render (si existe)
      || PUBLIC_URL_DEFAULT       // 2º constante fija
      || `https://${req.headers.host}`; // 3º local fallback
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
app.get('/v1/onstreet-service/product/by-zone/:zoneId&plate=:plate',
        (req, res) => {
  const zona = zonas[req.params.zoneId];
  if (!zona) return res.json([]);

  const steps = zona.bloques.map(b => ({
    ...b,
    endDateTime: new Date(Date.now() + b.timeInSeconds * 1000).toISOString(),
  }));

  res.json([{
    id                : req.params.zoneId,
    vehicleType       : 'CAR',
    productType       : 'STANDARD',
    averageStayDuration: 30,
    canDriveOff       : true,
    extensible        : true,
    coldDownTime      : 120,
    name              : zona.name,
    color             : zona.color,
    description       : `${zona.name} - Tarifa por bloques`,
    rateSteps: {
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
});

/* ---- 7. Mock pago / validación ------------------------------- */
let ticketsPagados = [{ plate: 'ABCD123', ticketId: 1 }];

app.post('/v1/onstreet-service/pay-ticket', (req, res) => {
  const { plate } = req.body;
  if (!plate) return res.status(400).json({ error: 'Falta matrícula' });
  if (ticketsPagados.some(t => t.plate === plate))
    return res.json({ success: false, message: 'Ticket ya existe' });

  ticketsPagados.push({ plate, ticketId: ticketsPagados.length + 1 });
  res.json({ success: true, message: 'Ticket guardado' });
});

app.get('/v1/onstreet-service/validate-ticket/:plate', (req, res) => {
  const t = ticketsPagados.find(x => x.plate === req.params.plate);
  res.json(
    t ? { valid: true,  ticketId: t.ticketId }
      : { valid: false, message: 'Ticket no encontrado' },
  );
});

/* ---- 8. Arranque --------------------------------------------- */
app.listen(PORT, () =>
  console.log(`✅ Mock MOWIZ (main) corriendo en http://localhost:${PORT}`),
);
