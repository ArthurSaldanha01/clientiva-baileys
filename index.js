import express from 'express';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

const app = express();
app.use(express.json());

let sock;

// 🔁 Apaga sessão anterior para forçar novo QR se necessário
if (fs.existsSync('./auth')) {
  fs.rmSync('./auth', { recursive: true, force: true });
  console.log('🧹 Sessão antiga removida. Será gerado novo QR.');
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr, lastDisconnect }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
    } else if (connection === 'close') {
      console.log('❌ Desconectado do WhatsApp!');
      if (lastDisconnect?.error?.output?.statusCode !== 401) {
        console.log('🔁 Tentando reconectar...');
        connectToWhatsApp(); // reconecta automaticamente
      }
    }
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

app.get('/', (req, res) => {
  res.send('✅ Clientiva Baileys API rodando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  connectToWhatsApp();
});
