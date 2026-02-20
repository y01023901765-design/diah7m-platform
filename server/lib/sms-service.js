'use strict';

/**
 * DIAH-7M SMS Service — 아이코드(국내) + AWS SNS(해외) 2채널
 * ═══════════════════════════════════════════════════════════
 *
 * 발송 라우팅:
 *   한국번호(+82/01x) → 아이코드 소켓 → CoolSMS fallback
 *   해외번호(+1,+44 등) → AWS SNS → Twilio fallback
 *
 * 기능:
 *   - sendSMS(phone, message, opts) — 자동 라우팅
 *   - sendTemplate(phone, templateCode, vars, opts) — 템플릿 발송
 *   - sendVerification(phone) — 6자리 인증코드 발송
 *   - checkVerification(phone, code) — 인증코드 확인
 *   - getBalance() — 아이코드 잔액 조회
 *
 * 환경변수:
 *   ICODE_TOKEN_KEY   — 아이코드 발송전용 토큰키
 *   ICODE_SENDER      — 아이코드 발신번호 (예: 01091258843)
 *   AWS_ACCESS_KEY_ID — AWS SNS용
 *   AWS_SECRET_ACCESS_KEY
 *   AWS_REGION        — ap-northeast-2
 *   COOLSMS_API_KEY/SECRET/SENDER — CoolSMS fallback
 *   TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE — Twilio fallback
 */

var net = require('net');
var https = require('https');
var crypto = require('crypto');

// DB 참조 (서버 부팅 시 setSmsDB로 등록)
var _db = null;
function setSmsDB(db) { _db = db; }

// ── 한국번호 판별 ──
function isKoreanPhone(phone) {
  if (!phone) return false;
  var p = phone.replace(/[\s\-]/g, '');
  if (p.startsWith('+82')) return true;
  if (p.startsWith('01')) return true;
  return false;
}

// ── 아이코드 소켓 발송 (국내, 16원/건) ──
function sendIcode(phone, message) {
  var tokenKey = process.env.ICODE_TOKEN_KEY;
  var sender = process.env.ICODE_SENDER;
  if (!tokenKey || !sender) {
    return Promise.reject(new Error('icode env not configured'));
  }

  var tel = phone.replace(/[\s\-]/g, '');
  if (tel.startsWith('+82')) tel = '0' + tel.slice(3);
  var cb = sender.replace(/[\s\-]/g, '');

  var packet = JSON.stringify({
    key: tokenKey,
    tel: tel,
    cb: cb,
    msg: message,
  });

  return new Promise(function(resolve, reject) {
    var client = net.connect({ host: '211.172.232.124', port: 9201 }, function() {
      client.write(packet);
    });

    var data = '';
    client.on('data', function(chunk) { data += chunk.toString(); });

    client.on('end', function() {
      var code = (data || '').trim().slice(0, 2);
      if (code === '00' || code === '17') {
        resolve({ provider: 'icode', status: code, body: data });
      } else {
        reject(new Error('icode error ' + code + ': ' + data));
      }
    });

    client.on('error', function(err) {
      reject(new Error('icode socket error: ' + err.message));
    });

    // 5초 타임아웃
    client.setTimeout(5000, function() {
      client.destroy();
      reject(new Error('icode timeout'));
    });
  });
}

// ── AWS SNS 발송 (해외, ~8원/건) ──
function sendAwsSns(phone, message) {
  var accessKey = process.env.AWS_ACCESS_KEY_ID;
  var secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  var region = process.env.AWS_REGION || 'ap-northeast-2';
  if (!accessKey || !secretKey) {
    return Promise.reject(new Error('AWS SNS env not configured'));
  }

  // E.164 형식 보장
  var e164 = phone.replace(/[\s\-]/g, '');
  if (!e164.startsWith('+')) e164 = '+' + e164;

  // AWS SNS REST API (SDK 없이 직접 호출 — 의존성 최소화)
  var host = 'sns.' + region + '.amazonaws.com';
  var body = 'Action=Publish&PhoneNumber=' + encodeURIComponent(e164) +
    '&Message=' + encodeURIComponent(message) + '&Version=2010-03-31';

  // AWS Signature V4
  var now = new Date();
  var dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  var amzDate = dateStamp + 'T' + now.toISOString().replace(/[-:]/g, '').slice(9, 15) + 'Z';

  var credScope = dateStamp + '/' + region + '/sns/aws4_request';
  var canonReq = 'POST\n/\n\ncontent-type:application/x-www-form-urlencoded\nhost:' + host +
    '\nx-amz-date:' + amzDate + '\n\ncontent-type;host;x-amz-date\n' +
    crypto.createHash('sha256').update(body).digest('hex');
  var strToSign = 'AWS4-HMAC-SHA256\n' + amzDate + '\n' + credScope + '\n' +
    crypto.createHash('sha256').update(canonReq).digest('hex');

  function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
  var kDate = hmac('AWS4' + secretKey, dateStamp);
  var kRegion = hmac(kDate, region);
  var kService = hmac(kRegion, 'sns');
  var kSigning = hmac(kService, 'aws4_request');
  var signature = crypto.createHmac('sha256', kSigning).update(strToSign).digest('hex');

  var authHeader = 'AWS4-HMAC-SHA256 Credential=' + accessKey + '/' + credScope +
    ',SignedHeaders=content-type;host;x-amz-date,Signature=' + signature;

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: host,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Host': host,
        'X-Amz-Date': amzDate,
        'Authorization': authHeader,
      },
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ provider: 'aws_sns', status: res.statusCode, body: data });
        } else {
          reject(new Error('AWS SNS ' + res.statusCode + ': ' + data.slice(0, 200)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── CoolSMS fallback (국내) ──
function sendCoolSMS(phone, message) {
  try {
    var alerter = require('./alerter');
    return alerter.sendCoolSMS(phone, message);
  } catch (e) {
    return Promise.reject(new Error('CoolSMS unavailable: ' + e.message));
  }
}

// ── Twilio fallback (해외) ──
function sendTwilio(phone, message) {
  try {
    var alerter = require('./alerter');
    return alerter.sendTwilioSMS(phone, message);
  } catch (e) {
    return Promise.reject(new Error('Twilio unavailable: ' + e.message));
  }
}

// ══════════════════════════════════════════════
// 통합 발송 함수 — 자동 라우팅
// ══════════════════════════════════════════════

async function sendSMS(phone, message, opts) {
  opts = opts || {};
  var provider = null;
  var cost = 0;

  if (isKoreanPhone(phone)) {
    // 국내: 아이코드 → CoolSMS fallback
    try {
      var r = await sendIcode(phone, message);
      provider = 'icode';
      cost = message.length <= 90 ? 16 : 48;
      _logSMS(opts.userId, phone, message, opts.type || 'general', provider, 'sent', cost);
      return { ok: true, provider: provider, cost: cost, detail: r };
    } catch (e1) {
      console.warn('[SMS] icode failed:', e1.message);
      try {
        var r2 = await sendCoolSMS(phone, message);
        provider = 'coolsms';
        cost = message.length <= 90 ? 20 : 50;
        _logSMS(opts.userId, phone, message, opts.type || 'general', provider, 'sent', cost);
        return { ok: true, provider: provider, cost: cost, detail: r2 };
      } catch (e2) {
        console.warn('[SMS] CoolSMS fallback failed:', e2.message);
        _logSMS(opts.userId, phone, message, opts.type || 'general', 'none', 'failed', 0);
        return { ok: false, error: e2.message };
      }
    }
  } else {
    // 해외: AWS SNS → Twilio fallback
    try {
      var r3 = await sendAwsSns(phone, message);
      provider = 'aws_sns';
      cost = 8;
      _logSMS(opts.userId, phone, message, opts.type || 'general', provider, 'sent', cost);
      return { ok: true, provider: provider, cost: cost, detail: r3 };
    } catch (e3) {
      console.warn('[SMS] AWS SNS failed:', e3.message);
      try {
        var r4 = await sendTwilio(phone, message);
        provider = 'twilio';
        cost = 80;
        _logSMS(opts.userId, phone, message, opts.type || 'general', provider, 'sent', cost);
        return { ok: true, provider: provider, cost: cost, detail: r4 };
      } catch (e4) {
        console.warn('[SMS] Twilio fallback failed:', e4.message);
        _logSMS(opts.userId, phone, message, opts.type || 'general', 'none', 'failed', 0);
        return { ok: false, error: e4.message };
      }
    }
  }
}

// ── 발송 로그 기록 ──
function _logSMS(userId, phone, message, type, provider, status, cost) {
  if (!_db) return;
  try {
    _db.run(
      'INSERT INTO sms_log (user_id, phone, message, type, provider, status, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId || null, phone, message.slice(0, 200), type, provider, status, cost]
    );
  } catch (e) { /* ignore log errors */ }
}

// ══════════════════════════════════════════════
// 템플릿 발송
// ══════════════════════════════════════════════

async function sendTemplate(phone, templateCode, vars, opts) {
  opts = opts || {};
  var tmpl = null;

  if (_db) {
    try {
      tmpl = await _db.get('SELECT * FROM sms_templates WHERE code = ? AND active = 1', [templateCode]);
    } catch (e) { /* ignore */ }
  }

  if (!tmpl) {
    return { ok: false, error: 'Template not found: ' + templateCode };
  }

  var message = tmpl.body;
  for (var key in vars) {
    message = message.replace(new RegExp('\\{' + key + '\\}', 'g'), vars[key] || '');
  }

  return sendSMS(phone, message, { ...opts, type: templateCode });
}

// ══════════════════════════════════════════════
// SMS 인증코드
// ══════════════════════════════════════════════

async function sendVerification(phone, purpose) {
  purpose = purpose || 'signup';
  var code = String(Math.floor(100000 + Math.random() * 900000)); // 6자리
  var expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3분

  if (_db) {
    try {
      await _db.run(
        'INSERT INTO sms_verifications (phone, code, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [phone, code, purpose, expiresAt]
      );
    } catch (e) {
      return { ok: false, error: 'DB error: ' + e.message };
    }
  }

  var result = await sendTemplate(phone, 'verify', { code: code }, { type: 'verify' });
  return { ...result, expiresAt: expiresAt };
}

async function checkVerification(phone, code, purpose) {
  purpose = purpose || 'signup';
  if (!_db) return { ok: false, error: 'DB not available' };

  try {
    var record = await _db.get(
      'SELECT * FROM sms_verifications WHERE phone = ? AND purpose = ? AND verified = 0 ORDER BY created_at DESC LIMIT 1',
      [phone, purpose]
    );

    if (!record) return { ok: false, error: '인증 요청을 찾을 수 없습니다' };
    if (record.attempts >= 5) return { ok: false, error: '인증 시도 횟수 초과 (최대 5회)' };
    if (new Date(record.expires_at) < new Date()) return { ok: false, error: '인증코드가 만료되었습니다' };

    // 시도 횟수 증가
    await _db.run('UPDATE sms_verifications SET attempts = attempts + 1 WHERE id = ?', [record.id]);

    if (record.code !== code) {
      return { ok: false, error: '인증코드가 일치하지 않습니다', remaining: 5 - record.attempts - 1 };
    }

    // 인증 성공
    await _db.run('UPDATE sms_verifications SET verified = 1 WHERE id = ?', [record.id]);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'DB error: ' + e.message };
  }
}

// ══════════════════════════════════════════════
// 아이코드 잔액 조회
// ══════════════════════════════════════════════

function getIcodeBalance() {
  var tokenKey = process.env.ICODE_TOKEN_KEY;
  if (!tokenKey) return Promise.resolve({ available: false, reason: 'ICODE_TOKEN_KEY not set' });

  // 아이코드 userinfo API (HTTP)
  return new Promise(function(resolve) {
    var http = require('http');
    var url = 'http://www.icodekorea.com/res/userinfo.php?token=' + encodeURIComponent(tokenKey);
    http.get(url, { timeout: 5000 }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          resolve({ available: true, coin: parsed.coin || 0, payment: parsed.payment || 'unknown' });
        } catch (e) {
          resolve({ available: true, raw: data.trim() });
        }
      });
    }).on('error', function(e) {
      resolve({ available: false, reason: e.message });
    });
  });
}

// ══════════════════════════════════════════════
// 발송 통계
// ══════════════════════════════════════════════

async function getStats(days) {
  days = days || 30;
  if (!_db) return { total: 0, sent: 0, failed: 0, cost: 0 };

  try {
    var cutoff = new Date(Date.now() - days * 86400000).toISOString();
    var stats = await _db.get(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status=\'sent\' THEN 1 ELSE 0 END) as sent, SUM(CASE WHEN status=\'failed\' THEN 1 ELSE 0 END) as failed, SUM(cost) as cost FROM sms_log WHERE created_at > ?',
      [cutoff]
    );
    return stats || { total: 0, sent: 0, failed: 0, cost: 0 };
  } catch (e) {
    return { total: 0, sent: 0, failed: 0, cost: 0 };
  }
}

module.exports = {
  setSmsDB: setSmsDB,
  sendSMS: sendSMS,
  sendTemplate: sendTemplate,
  sendVerification: sendVerification,
  checkVerification: checkVerification,
  getIcodeBalance: getIcodeBalance,
  getStats: getStats,
  isKoreanPhone: isKoreanPhone,
};
