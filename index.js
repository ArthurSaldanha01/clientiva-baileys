import express from 'express';
import { create } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

const app = express();
app.use(express.json());

let sock;

async function connectToWhatsApp() {
  sock = await create({ printQRInTerminal: true });

  sock.ev.on('connection.update', ({ connection, qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === 'open') console.log('✅ Conectado!');
    if (connection === 'close') console.log('❌ Desconectado!');
  });
}

app.post('/enviar', async (req, res) => {
  const { phone, message } = req.body;

  if (!sock) return res.status(500).send({ error: 'WhatsApp não conectado' });

  try {
    await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: message });
    res.send({ status: 'ok', to: phone });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

app.get('/', (req, res) => res.send('Baileys rodando!'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  connectToWhatsApp();
});
