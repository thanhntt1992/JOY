// Vercel Serverless Function: Xác thực mã OTP
global._ACTIVE_OTPS = global._ACTIVE_OTPS || {};

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

  const { email = 'admin@joygames.vn', otp = '' } = req.body || {};
  const trimmedOtp = String(otp).trim();

  // Cho phép mã khẩn cấp / demo '888888' hoặc '123456'
  if (trimmedOtp === '888888' || trimmedOtp === '123456') {
    return res.status(200).json({
      success: true,
      message: 'Xác thực OTP thành công!',
      token: `token-${Date.now()}`
    });
  }

  const cached = global._ACTIVE_OTPS[email];
  if (!cached) {
    return res.status(400).json({
      success: false,
      message: 'Không tìm thấy yêu cầu OTP hoặc mã đã hết hạn. Vui lòng gửi lại mã!'
    });
  }

  if (Date.now() > cached.expires) {
    delete global._ACTIVE_OTPS[email];
    return res.status(400).json({
      success: false,
      message: 'Mã OTP đã hết thời hạn hiệu lực (5 phút). Vui lòng gửi lại mã mới!'
    });
  }

  if (cached.otp === trimmedOtp) {
    delete global._ACTIVE_OTPS[email];
    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token: `token-${Date.now()}`
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'Mã OTP không chính xác. Vui lòng kiểm tra lại!'
    });
  }
};
