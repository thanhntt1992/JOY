"""
JoyGames HR Portal - Local SPA Development Server
Hỗ trợ HTML5 History API Routing và Telegram 2FA OTP Authentication API
"""

import os
import sys
import json
import time
import random
import urllib.request
import urllib.parse
from http.server import SimpleHTTPRequestHandler, HTTPServer

# Bộ nhớ đệm lưu trữ mã OTP tạm thời (hiệu lực 5 phút)
ACTIVE_OTPS = {}

class SPARequestHandler(SimpleHTTPRequestHandler):
    def send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        # 1. API GỬI MÃ OTP QUA TELEGRAM BOT
        if self.path == '/api/send-telegram-otp':
            email = payload.get('email', 'admin@joygames.vn').strip()
            bot_token = payload.get('botToken', '').strip()
            chat_id = payload.get('chatId', '').strip()

            # Sinh ngẫu nhiên mã OTP 6 số
            otp = f"{random.randint(100000, 999999)}"
            ACTIVE_OTPS[email] = {
                'otp': otp,
                'expires': time.time() + 300 # 5 phút
            }

            telegram_status = "Chưa kết nối Telegram (Sử dụng mã hiển thị)"
            sent_to_telegram = False

            if bot_token and chat_id:
                try:
                    msg_text = (
                        f"🎮 *JOYGAMES HR PORTAL - MÃ XÁC THỰC 2FA*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━\n"
                        f"Xin chào Quản trị viên,\n"
                        f"Mã OTP đăng nhập hệ thống của bạn là:\n\n"
                        f"👉 *{otp}*\n\n"
                        f"⏰ Hiệu lực trong 5 phút.\n"
                        f"🔒 Tuyệt đối không chia sẻ mã OTP này cho người khác!"
                    )
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    data = urllib.parse.urlencode({
                        'chat_id': chat_id,
                        'text': msg_text,
                        'parse_mode': 'Markdown'
                    }).encode('utf-8')
                    req = urllib.request.Request(url, data=data, method='POST')
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        res_data = json.loads(resp.read().decode('utf-8'))
                        if res_data.get('ok'):
                            telegram_status = "Đã gửi mã xác thực tới Telegram của bạn!"
                            sent_to_telegram = True
                        else:
                            telegram_status = f"Lỗi Telegram: {res_data.get('description')}"
                except Exception as e:
                    telegram_status = f"Lỗi gửi Telegram: {str(e)}"

            return self.send_json(200, {
                'success': True,
                'message': telegram_status,
                'sentToTelegram': sent_to_telegram,
                'demoOtp': otp # Hỗ trợ xem ngay nếu chưa cấu hình bot
            })

        # 2. API XÁC THỰC MÃ OTP
        elif self.path == '/api/verify-otp':
            email = payload.get('email', 'admin@joygames.vn').strip()
            otp = payload.get('otp', '').strip()

            # Cho phép mã dự phòng master '888888' hoặc '123456'
            if otp in ('888888', '123456'):
                return self.send_json(200, {
                    'success': True,
                    'message': 'Xác thực OTP thành công!',
                    'token': f"token-{int(time.time())}"
                })

            cached = ACTIVE_OTPS.get(email)
            if not cached:
                return self.send_json(400, {
                    'success': False,
                    'message': 'Không tìm thấy yêu cầu OTP hoặc mã đã hết hạn. Vui lòng gửi lại mã!'
                })

            if time.time() > cached['expires']:
                del ACTIVE_OTPS[email]
                return self.send_json(400, {
                    'success': False,
                    'message': 'Mã OTP đã hết thời hạn hiệu lực (5 phút). Vui lòng gửi lại mã mới!'
                })

            if cached['otp'] == otp:
                del ACTIVE_OTPS[email]
                return self.send_json(200, {
                    'success': True,
                    'message': 'Đăng nhập thành công!',
                    'token': f"token-{int(time.time())}"
                })
            else:
                return self.send_json(400, {
                    'success': False,
                    'message': 'Mã OTP không chính xác. Vui lòng kiểm tra lại!'
                })

        # 3. API TEST KẾT NỐI TELEGRAM BOT
        elif self.path == '/api/test-telegram':
            bot_token = payload.get('botToken', '').strip()
            chat_id = payload.get('chatId', '').strip()

            if not bot_token or not chat_id:
                return self.send_json(400, {
                    'success': False,
                    'message': 'Vui lòng điền đầy đủ Bot Token và Chat ID!'
                })

            try:
                msg_text = (
                    f"🎉 *JOYGAMES HR PORTAL - KẾT NỐI THÀNH CÔNG*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"Hệ thống quản lý nhân sự JoyGames đã liên kết thành công với tài khoản Telegram này để gửi mã OTP bảo mật 2 lớp (2FA)!"
                )
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                data = urllib.parse.urlencode({
                    'chat_id': chat_id,
                    'text': msg_text,
                    'parse_mode': 'Markdown'
                }).encode('utf-8')
                req = urllib.request.Request(url, data=data, method='POST')
                with urllib.request.urlopen(req, timeout=10) as resp:
                    res_data = json.loads(resp.read().decode('utf-8'))
                    if res_data.get('ok'):
                        return self.send_json(200, {
                            'success': True,
                            'message': 'Đã gửi tin nhắn kiểm tra thành công tới Telegram!'
                        })
                    else:
                        return self.send_json(400, {
                            'success': False,
                            'message': f"Telegram từ chối: {res_data.get('description')}"
                        })
            except Exception as e:
                return self.send_json(500, {
                    'success': False,
                    'message': f"Không thể gửi tin nhắn tới Telegram: {str(e)}"
                })

        return self.send_json(404, {'error': 'Endpoint not found'})

    def do_GET(self):
        clean_path = self.path.split('?')[0].split('#')[0]
        local_path = os.path.join(os.getcwd(), clean_path.lstrip('/'))
        
        # Nếu là file tĩnh thực tế trên ổ đĩa
        if clean_path in ('/', '') or os.path.exists(local_path):
            return super().do_GET()
        
        # SPA URL fallback
        self.path = '/index.html'
        return super().do_GET()

def run_server(port=8088):
    server_address = ('', port)
    httpd = HTTPServer(server_address, SPARequestHandler)
    print(f"JoyGames HR 2FA SPA Server running at http://localhost:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
    run_server(port)
