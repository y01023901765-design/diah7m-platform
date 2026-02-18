/**
 * DIAH-7M Hash Utilities
 * 
 * GPT 피드백 반영:
 * - 안정적 JSON 문자열화 (키 순서 고정)
 * - SHA1 해시 (캐시 키 생성)
 */

const crypto = require('crypto');

/**
 * stableStringify: key 순서를 고정해서 같은 데이터는 같은 문자열
 */
function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const entries = keys.map(k => 
    JSON.stringify(k) + ':' + stableStringify(obj[k])
  );
  
  return '{' + entries.join(',') + '}';
}

/**
 * SHA1 해시 생성
 */
function sha1Of(obj) {
  const s = stableStringify(obj);
  return crypto.createHash('sha1').update(s).digest('hex');
}

module.exports = { stableStringify, sha1Of };
