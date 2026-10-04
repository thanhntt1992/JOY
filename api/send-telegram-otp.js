// Vercel Serverless Function: Gửi mã OTP qua Telegram Bot
const https = require('https');

// Bộ nhớ đệm tạm thời cho OTP (hết hạn sau 5 phút)
global._ACTIVE_OTPS = global._ACTIVE_OTPS || {};

function sendTelegramMessage(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${botToken}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ ok: false, description: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email = 'admin@joygames.vn', botToken = '', chatId = '' } = req.body || {};

  // Tạo mã OTP ngẫu nhiên 6 chữ số
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  global._ACTIVE_OTPS[email] = {
    otp: otp,
    expires: Date.now() + 5 * 60 * 1000
  };

  let sentToTelegram = false;
  let telegramStatus = "Đã tạo mã xác thực!";

  if (botToken && chatId) {
    try {
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const msg = `🎮 *JOYGAMES HR PORTAL - MÃ XÁC THỰC OTP (2FA)*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `Mã OTP bảo mật của bạn là: \`${otp}\`\n\n` +
                  `⏰ Thời gian: *${now}*\n` +
                  `⏳ Hiệu lực: *5 phút*\n` +
                  `⚠️ _Tuyệt đối không chia sẻ mã này cho bất kỳ ai!_`;

      const tgRes = await sendTelegramMessage(botToken, chatId, msg);
      if (tgRes && tgRes.ok) {
        sentToTelegram = true;
        telegramStatus = "Đã gửi mã xác thực tới Telegram của bạn!";
      } else {
        telegramStatus = `Lỗi Telegram: ${tgRes ? tgRes.description : 'Không phản hồi'}`;
      }
    } catch (err) {
      telegramStatus = `Lỗi gửi Telegram: ${err.message}`;
    }
  }

  return res.status(200).json({
    success: true,
    message: telegramStatus,
    sentToTelegram: sentToTelegram,
    demoOtp: otp
  });
};
