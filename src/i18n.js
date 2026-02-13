// DIAH-7M i18n System — 28 languages, zero API calls
// KO = source of truth (locales/ko.js)
// EN/JA/ZH = 완전 번역 (260 keys)
// 22 languages = 핵심 UI + EN fallback
import T from './theme';
import LOCALES from './locales';

const LANG_LIST=[
  {code:'ko',flag:'🇰🇷',name:'한국어'},
  {code:'en',flag:'🇺🇸',name:'English'},
  {code:'ja',flag:'🇯🇵',name:'日本語'},
  {code:'zh',flag:'🇨🇳',name:'中文'},
  {code:'es',flag:'🇪🇸',name:'Español'},
  {code:'ar',flag:'🇸🇦',name:'العربية'},
  {code:'fr',flag:'🇫🇷',name:'Français'},
  {code:'de',flag:'🇩🇪',name:'Deutsch'},
  {code:'pt',flag:'🇧🇷',name:'Português'},
  {code:'vi',flag:'🇻🇳',name:'Tiếng Việt'},
  {code:'th',flag:'🇹🇭',name:'ไทย'},
  {code:'id',flag:'🇮🇩',name:'Bahasa'},
  {code:'hi',flag:'🇮🇳',name:'हिन्दी'},
  {code:'ru',flag:'🇷🇺',name:'Русский'},
  {code:'it',flag:'🇮🇹',name:'Italiano'},
  {code:'nl',flag:'🇳🇱',name:'Nederlands'},
  {code:'pl',flag:'🇵🇱',name:'Polski'},
  {code:'tr',flag:'🇹🇷',name:'Türkçe'},
  {code:'sv',flag:'🇸🇪',name:'Svenska'},
  {code:'da',flag:'🇩🇰',name:'Dansk'},
  {code:'no',flag:'🇳🇴',name:'Norsk'},
  {code:'fi',flag:'🇫🇮',name:'Suomi'},
  {code:'cs',flag:'🇨🇿',name:'Čeština'},
  {code:'hu',flag:'🇭🇺',name:'Magyar'},
  {code:'ro',flag:'🇷🇴',name:'Română'},
  {code:'uk',flag:'🇺🇦',name:'Українська'},
  {code:'he',flag:'🇮🇱',name:'עברית'},
];

let _cachedLang=null;
const detectLang=()=>{
  if(_cachedLang)return _cachedLang;
  const saved=typeof localStorage!=='undefined'&&localStorage.getItem('diah7m-lang');
  if(saved){_cachedLang=saved;return saved;}
  const nav=typeof navigator!=='undefined'?navigator.language?.slice(0,2):'ko';
  _cachedLang=LOCALES[nav]?nav:'en';
  return _cachedLang;
};

// Source of truth
const KO = LOCALES.ko;
const EN = LOCALES.en;

// Translation: KO → target lang → EN fallback → KO fallback → key
const t=(key,lang)=>{
  if(!lang||lang==='ko')return KO[key]||key;
  return LOCALES[lang]?.[key]||EN[key]||KO[key]||key;
};

// Gauge color/icon helpers
const gc = g => g==="양호"?T.good:g==="주의"?T.warn:T.danger;
const gi = g => g==="양호"?"●":g==="주의"?"●":"●";

export { LANG_LIST, detectLang, KO, EN, LOCALES, t, gc, gi };
