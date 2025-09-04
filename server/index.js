require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.json());

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = (process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886');

const client = (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)
  ? new Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

function toE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  return `+34${digits}`; // por defecto ES
}

function formatMessage(ticket = {}) {
  const lines = [];
  lines.push('🎫 *Ticket de Estacionamiento*');
  lines.push('');
  if (ticket.plate) lines.push(`🚙 Matrícula: *${ticket.plate}*`);
  if (ticket.zone) lines.push(`📍 Zona: ${ticket.zone}`);
  if (ticket.start) lines.push(`🕐 Inicio: ${ticket.start}`);
  if (ticket.end) lines.push(`🕙 Fin: ${ticket.end}`);
  if (ticket.duration) lines.push(`⏱️ Duración: ${ticket.duration}`);
  if (ticket.method) lines.push(`💳 Pago: ${ticket.method}`);
  if (typeof ticket.price === 'number') lines.push(`💰 Importe: ${ticket.price.toFixed(2)} €`);
  if (typeof ticket.discount === 'number' && ticket.discount > 0) {
    lines.push(`🏷️ Descuento: -${ticket.discount.toFixed(2)} €`);
  }
  if (ticket.qrData) {
    lines.push('');
    lines.push('📱 QR / Verificación:');
    lines.push('```');
    lines.push(String(ticket.qrData));
    lines.push('```');
  }
  lines.push('');
  lines.push('✅ Gracias por su compra.');
  return lines.join('\n');
}

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/whatsapp/send', async (req, res) => {
  try {
    if (!client) return res.status(500).json({ ok: false, error: 'Twilio no configurado' });
    const { phone, message, ticket } = req.body || {};
    const to = toE164(phone);
    if (!to) return res.status(400).json({ ok: false, error: 'Teléfono inválido' });
    const body = message || formatMessage(ticket || {});
    const result = await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body,
    });
    res.json({ ok: true, sid: result.sid, status: result.status });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 WhatsApp server on :${PORT}`));


