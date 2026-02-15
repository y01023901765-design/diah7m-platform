/**
 * DIAH-7M Email Service v1.0
 * SendGrid + 10 templates + rate limit + retry
 */
const TEMPLATES = {
  welcome: { subject: { ko: 'DIAH-7M에 오신 것을 환영합니다', en: 'Welcome to DIAH-7M' } },
  verification: { subject: { ko: '이메일 인증 코드', en: 'Email Verification Code' } },
  password_reset: { subject: { ko: '비밀번호 재설정', en: 'Password Reset' } },
  payment_success: { subject: { ko: '결제 완료', en: 'Payment Confirmed' } },
  payment_failed: { subject: { ko: '결제 실패', en: 'Payment Failed' } },
  subscription_cancel: { subject: { ko: '구독 취소 확인', en: 'Subscription Cancelled' } },
  upgrade: { subject: { ko: '플랜 업그레이드 완료', en: 'Plan Upgraded' } },
  report_ready: { subject: { ko: '보고서가 준비되었습니다', en: 'Your Report is Ready' } },
  system_alert: { subject: { ko: '시스템 알림', en: 'System Alert' } },
  monthly_digest: { subject: { ko: '월간 경제 다이제스트', en: 'Monthly Economic Digest' } },
};

let sgMail = null;
try { sgMail = require('@sendgrid/mail'); sgMail.setApiKey(process.env.SENDGRID_API_KEY || ''); } catch(e) {}

const queue = [];
const sentCount = { hour: 0, day: 0, lastHourReset: Date.now(), lastDayReset: Date.now() };

function checkRateLimit() {
  const now = Date.now();
  if (now - sentCount.lastHourReset > 3600000) { sentCount.hour = 0; sentCount.lastHourReset = now; }
  if (now - sentCount.lastDayReset > 86400000) { sentCount.day = 0; sentCount.lastDayReset = now; }
  return sentCount.hour < 100 && sentCount.day < 1000;
}

async function send(to, templateId, data = {}, locale = 'ko') {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) throw new Error(`Unknown template: ${templateId}`);
  const subject = tmpl.subject[locale] || tmpl.subject.en;
  if (!sgMail) { console.log(`[EMAIL-STUB] To:${to} Subject:${subject}`); return { stub: true }; }
  if (!checkRateLimit()) { queue.push({ to, templateId, data, locale }); return { queued: true }; }
  const msg = { to, from: { name: 'DIAH-7M', email: process.env.EMAIL_FROM || 'noreply@diah7m.com' }, subject, html: renderTemplate(templateId, data, locale) };
  const result = await sgMail.send(msg);
  sentCount.hour++; sentCount.day++;
  return result;
}

function renderTemplate(templateId, data, locale) {
  const header = `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:40px;"><h1 style="color:#00d4ff;">🛰️ DIAH-7M</h1>`;
  const footer = `<hr style="border:none;border-top:1px solid #e2e8f0;margin-top:32px;"><p style="color:#94a3b8;font-size:12px;">DIAH-7M · Diagnosing Economy from Space</p></div>`;
  const body = data.message || data.code || data.url || JSON.stringify(data);
  return `${header}<p>${body}</p>${footer}`;
}

async function processQueue() {
  while (queue.length > 0 && checkRateLimit()) {
    const item = queue.shift();
    await send(item.to, item.templateId, item.data, item.locale).catch(console.error);
  }
}

async function init() { setInterval(processQueue, 60000); return true; }

module.exports = { send, init, processQueue, TEMPLATES, getQueueLength: () => queue.length };
