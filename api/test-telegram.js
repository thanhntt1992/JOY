// Vercel Serverless Function: Kiểm tra kết nối Telegram Bot
const https = require('https');

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

  const { botToken = '', chatId = '' } = req.body || {};

  if (!botToken || !chatId) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ Bot Token và Chat ID!'
    });
  }

  try {
    const msg = `🎉 *JOYGAMES HR PORTAL - KẾT NỐI THÀNH CÔNG*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Hệ thống quản lý nhân sự JoyGames đã liên kết thành công với tài khoản Telegram này để gửi mã OTP bảo mật 2 lớp (2FA)!`;

    const tgRes = await sendTelegramMessage(botToken, chatId, msg);
    if (tgRes && tgRes.ok) {
      return res.status(200).json({
        success: true,
        message: 'Kết nối thành công! Đã gửi tin nhắn test tới Telegram của bạn.'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `Lỗi kết nối Telegram: ${tgRes ? tgRes.description : 'Không có phản hồi'}`
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Lỗi máy chủ kết nối Telegram: ${err.message}`
    });
  }
};
