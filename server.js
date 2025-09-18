/******************************************************************
 *  MOCK MOWIZ  –  Servidor Express con “config remota” (opción B)
 *  --------------------------------------------------------------
 *  • La app Flutter arranca con defaultApiBaseUrl (compilado).
 *  • Hace GET  /v1/config  ➜ recibe { apiBaseUrl } y “salta” aquí.
 *  • Cambiar PUBLIC_URL_DEFAULT o la env var PUBLIC_URL ➜
 *    no hace falta tocar la app, solo push + deploy.
 ******************************************************************/
const express  = require('express');
const cors     = require('cors');
const compression = require('compression');
const app      = express();
const PORT     = process.env.PORT || 3001;

/* ---- 1. URL por defecto de ESTA rama ------------------------- */
const PUBLIC_URL_DEFAULT = 'https://mock-mowiz.onrender.com';

/* ---- 2. Middleware ------------------------------------------- */
// Compresión gzip para reducir el tamaño de las respuestas
app.use(compression());

// Cache headers para respuestas estáticas
app.use((req, res, next) => {
  // Cache por 5 minutos para endpoints de datos
  if (req.path.includes('/v1/onstreet-service/')) {
    res.set('Cache-Control', 'public, max-age=300');
  }
  // Cache por 1 hora para configuración
  if (req.path === '/v1/config') {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  next();
});

app.use(cors({
  origin: [
    'https://jeffbozu.github.io',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:9001',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8081',
    'http://127.0.0.1:9001'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));          // body-parser para /pay-ticket

/* ---- 3. Datos mock (Zonas + bloques + colores) ---------------- */
const zonas = {
  coche: {                       /*  Zona COCHE  */
    name  : 'Zona Coche',
    color : '#FFD600',
    bloques: [
      { minutos:  8, timeInSeconds:  480, priceInCents:  55 },
      { minutos: 16, timeInSeconds:  960, priceInCents:  34 },
      { minutos: 32, timeInSeconds: 1920, priceInCents:  65 },
      { minutos: 60, timeInSeconds: 3600, priceInCents: 110 },
    ],
    maxDurationSeconds: 7200,        // 2 h
  },
  moto: {                        /*  Zona MOTO  */
    name  : 'Zona Moto',
    color : '#1891FF',
    bloques: [
      { minutos: 10, timeInSeconds:  600, priceInCents:  24 },
      { minutos: 20, timeInSeconds: 1200, priceInCents:  40 },
      { minutos: 45, timeInSeconds: 2700, priceInCents:  85 },
      { minutos: 90, timeInSeconds: 5400, priceInCents: 170 },
    ],
    maxDurationSeconds: 10800,       // 3 h
  },
  camion: {                       /*  Zona CAMIÓN  */
    name  : 'Zona Camión',
    color : '#9C27B0',
    bloques: [
      { minutos: 15, timeInSeconds:  900, priceInCents:  20 },
      { minutos: 30, timeInSeconds: 1800, priceInCents:  36 },
      { minutos: 60, timeInSeconds: 3600, priceInCents:  65 },
      { minutos:120, timeInSeconds: 7200, priceInCents: 120 },
    ],
    maxDurationSeconds: 14400,       // 4 h
  },
};

/* ---- 4.  /v1/config  → URL dinámica para la app --------------- */
// Cache de configuración para evitar procesamiento repetido
const configApiBaseUrl = process.env.PUBLIC_URL || PUBLIC_URL_DEFAULT;
const configResponse = JSON.stringify({ version: 1, apiBaseUrl: configApiBaseUrl });

app.get('/v1/config', (req, res) => {
  res.set('Content-Type', 'application/json');
  res.send(configResponse);
});

/* ---- 5.  /zones (id, name, color) ----------------------------- */
// Cache de zonas para evitar procesamiento repetido
const zonesData = Object.entries(zonas).map(([id, z]) => ({
  id, name: z.name, color: z.color,
}));
const zonesResponse = JSON.stringify(zonesData);

app.get('/v1/onstreet-service/zones', (_req, res) => {
  res.set('Content-Type', 'application/json');
  res.send(zonesResponse);
});

/* ---- 6.  /product/by-zone  (tarifa completa) ----------------- */
// Cache de productos por zona para evitar procesamiento repetido
const productCache = new Map();

app.get('/v1/onstreet-service/product/by-zone/:zoneId&plate=:plate',
  (req, res) => {
    const zoneId = req.params.zoneId;
    const zona = zonas[zoneId];
    if (!zona) return res.json([]);

    // Verificar cache primero
    if (productCache.has(zoneId)) {
      const cached = productCache.get(zoneId);
      // Actualizar solo las fechas dinámicas
      const now = Date.now();
      const steps = zona.bloques.map(b => ({
        ...b,
        endDateTime: new Date(now + b.timeInSeconds * 1000).toISOString(),
      }));
      
      cached[0].rateSteps.steps = steps;
      cached[0].rateSteps.firstStepStartsAt = new Date(now).toISOString();
      cached[0].rateSteps.priceRequestedAt = new Date(now).toISOString();
      
      res.set('Content-Type', 'application/json');
      res.send(JSON.stringify(cached));
      return;
    }

    // Generar respuesta y cachear
    const steps = zona.bloques.map(b => ({
      ...b,
      endDateTime: new Date(Date.now() + b.timeInSeconds * 1000).toISOString(),
    }));

    const response = [{
      id              : zoneId,
      vehicleType     : 'CAR',
      productType     : 'STANDARD',
      averageStayDuration: 30,
      canDriveOff     : true,
      extensible      : true,
      coldDownTime    : 120,
      name            : zona.name,
      color           : zona.color,
      description     : `${zona.name} – Tarifa por bloques`,
      rateSteps       : {
        steps,
        firstStepStartsAt : new Date().toISOString(),
        startTimeInSeconds: 0,
        minEndTimeInSeconds: Math.min(...zona.bloques.map(b => b.timeInSeconds)),
        ticketId          : 1,
        priceRequestedAt  : new Date().toISOString(),
        timeZone          : 'Europe/Madrid',
        currency          : 'EUR',
        errorMsgList      : [],
        paymentMethods    : ['CASH', 'BIZUM', 'CARD'],
        maxDurationSeconds: zona.maxDurationSeconds,
      },
    }];

    // Cachear la respuesta base (sin fechas dinámicas)
    productCache.set(zoneId, JSON.parse(JSON.stringify(response)));
    
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(response));
});

/* ---- 7.  Pago & validación (demo en memoria) ----------------- */
let ticketsPagados = [{ plate: 'ABCD123', ticketId: 1 }];

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
    t ? { valid: true, ticketId: t.ticketId }
      : { valid: false, message: 'Ticket no encontrado' },
  );
});

/* ---- 8.  Arranque ------------------------------------------- */
app.listen(PORT, () =>
  console.log(`✅ Mock MOWIZ (main) corriendo en http://localhost:${PORT}`),
);
