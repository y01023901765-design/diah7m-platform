'use strict';

/**
 * DIAH-7M Alerter — SMS/Webhook 장애 알림
 * ═══════════════════════════════════════════
 *
 * CircuitBreaker escalation 시 관리자에게 SMS 발송.
 * CoolSMS (한국) 우선, Twilio (해외) fallback.
 * env 없으면 console.error만 남김 (graceful degradation).
 *
 * 환경변수:
 *   ALERT_PHONE        — 수신 전화번호 (예: 01012345678)
 *   COOLSMS_API_KEY    — CoolSMS API Key
 *   COOLSMS_API_SECRET — CoolSMS API Secret
 *   COOLSMS_SENDER     — 발신번호 (사전 등록 필수)
 *   TWILIO_ACCOUNT_SID — Twilio SID (CoolSMS fallback)
 *   TWILIO_AUTH_TOKEN  — Twilio Token
 *   TWILIO_PHONE       — Twilio 발신번호
 *   ALERT_WEBHOOK_URL  — Slack/Discord webhook (optional)
 *
 * 중복 방지: 동일 소스 5분 내 재발송 안함
 */

var https = require('https');

// 중복 방지: { source: lastSentTs }
var _lastSent = {};
var COOLDOWN_MS = 5 * 60 * 1000; // 5분

// ── SMS 발송 (CoolSMS SDK — coolsms-node-sdk) ──

function sendCoolSMS(phone, message) {
  var apiKey = process.env.COOLSMS_API_KEY;
  var apiSecret = process.env.COOLSMS_API_SECRET;
  var sender = process.env.COOLSMS_SENDER;
  if (!apiKey || !apiSecret || !sender) {
    return Promise.reject(new Error('CoolSMS env not configured'));
  }

  try {
    var CoolSMS = require('coolsms-node-sdk').default;
    var sms = new CoolSMS(apiKey, apiSecret);
    return sms.sendOne({
      to: phone,
      from: sender,
      text: message,
    }).then(function(res) {
      return { provider: 'CoolSMS', status: 200, body: JSON.stringify(res) };
    });
  } catch (e) {
    return Promise.reject(new Error('CoolSMS SDK error: ' + e.message));
  }
}

// ── SMS 발송 (Twilio fallback) ──

function sendTwilioSMS(phone, message) {
  var sid = process.env.TWILIO_ACCOUNT_SID;
  var token = process.env.TWILIO_AUTH_TOKEN;
  var from = process.env.TWILIO_PHONE;
  if (!sid || !token || !from) {
    return Promise.reject(new Error('Twilio env not configured'));
  }

  // +82 변환: 01012345678 → +8201012345678
  var toPhone = phone.startsWith('+') ? phone : '+82' + phone.replace(/^0/, '');

  var body = 'To=' + encodeURIComponent(toPhone) +
    '&From=' + encodeURIComponent(from) +
    '&Body=' + encodeURIComponent(message);

  var auth = Buffer.from(sid + ':' + token).toString('base64');

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: 'api.twilio.com',
      path: '/2010-04-01/Accounts/' + sid + '/Messages.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + auth,
      },
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ provider: 'Twilio', status: res.statusCode, body: data });
        } else {
          reject(new Error('Twilio ' + res.statusCode + ': ' + data));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Webhook (Slack/Discord) ──

function sendWebhook(message) {
  var url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return Promise.resolve(null);

  var parsed;
  try { parsed = new (require('url').URL)(url); } catch(e) {
    return Promise.reject(new Error('Invalid ALERT_WEBHOOK_URL'));
  }

  var body = JSON.stringify({ text: message, content: message }); // text=Slack, content=Discord

  return new Promise(function(resolve, reject) {
    var req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() { resolve({ provider: 'Webhook', status: res.statusCode }); });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── 통합 알림 함수 ──
// CoolSMS → Twilio fallback → Webhook
// 어느 것도 설정 안 되어 있으면 console.error만

async function sendAlert(source, cbStatus) {
  // 중복 방지
  var now = Date.now();
  if (_lastSent[source] && (now - _lastSent[source] < COOLDOWN_MS)) {
    console.log('[Alerter] ' + source + ' cooldown — skip (' +
      Math.round((COOLDOWN_MS - (now - _lastSent[source])) / 1000) + '초 남음)');
    return { sent: false, reason: 'cooldown' };
  }

  var phone = process.env.ALERT_PHONE;
  var message = '[DIAH-7M] API 장애: ' + source +
    ' 자동복구 ' + (cbStatus.reopenCount || '?') + '회 실패. ' +
    '마지막 에러: ' + (cbStatus.stats && cbStatus.stats.lastFailure ? cbStatus.stats.lastFailure.error : 'unknown').slice(0, 50) +
    ' (' + new Date().toISOString().slice(0, 16) + ')';

  console.error('[Alerter] ' + message);
  _lastSent[source] = now;

  var results = [];

  // SMS 발송 시도
  if (phone) {
    // 1차: CoolSMS
    try {
      var r = await sendCoolSMS(phone, message);
      results.push(r);
      console.log('[Alerter] CoolSMS sent to', phone);
    } catch (e1) {
      console.warn('[Alerter] CoolSMS failed:', e1.message);
      // 2차: Twilio fallback
      try {
        var r2 = await sendTwilioSMS(phone, message);
        results.push(r2);
        console.log('[Alerter] Twilio sent to', phone);
      } catch (e2) {
        console.warn('[Alerter] Twilio failed:', e2.message);
      }
    }
  }

  // Webhook (SMS와 별개, 동시 발송)
  try {
    var r3 = await sendWebhook(message);
    if (r3) results.push(r3);
  } catch (e3) {
    console.warn('[Alerter] Webhook failed:', e3.message);
  }

  return {
    sent: results.length > 0,
    providers: results.map(function(r) { return r.provider; }),
    message: message,
  };
}

// ── CircuitBreaker onEscalate 콜백 (바로 사용 가능) ──
function onCBEscalate(sourceName, cbStatus) {
  sendAlert(sourceName, cbStatus).catch(function(e) {
    console.error('[Alerter] sendAlert error:', e.message);
  });
}

module.exports = {
  sendAlert: sendAlert,
  sendCoolSMS: sendCoolSMS,
  sendTwilioSMS: sendTwilioSMS,
  sendWebhook: sendWebhook,
  onCBEscalate: onCBEscalate,
};
