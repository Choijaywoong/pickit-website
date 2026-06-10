// 다국어 지원 — LanguageProvider + useLanguage 훅
// 지원 언어: ko, en, ja, zh-CN, zh-TW, id, th, vi, ms, fil
import { createContext, useContext, useState, useCallback } from 'react';

import ko    from './locales/ko';
import en    from './locales/en';
import ja    from './locales/ja';
import zhCN  from './locales/zh-CN';
import zhTW  from './locales/zh-TW';
import id    from './locales/id';
import th    from './locales/th';
import vi    from './locales/vi';
import ms    from './locales/ms';
import fil   from './locales/fil';

const TRANSLATIONS = { ko, en, ja, 'zh-CN': zhCN, 'zh-TW': zhTW, id, th, vi, ms, fil };

// 브라우저 언어 코드 → 앱 언어 코드 변환
function detectLang() {
  const sys = (navigator.language || 'en').toLowerCase();
  if (sys.startsWith('ko'))              return 'ko';
  if (sys.startsWith('ja'))              return 'ja';
  if (sys === 'zh-tw' || sys === 'zh-hk' || sys === 'zh-hant') return 'zh-TW';
  if (sys.startsWith('zh'))             return 'zh-CN';
  if (sys.startsWith('id'))             return 'id';
  if (sys.startsWith('th'))             return 'th';
  if (sys.startsWith('vi'))             return 'vi';
  if (sys.startsWith('ms'))             return 'ms';
  if (sys.startsWith('fil') || sys.startsWith('tl')) return 'fil';
  return 'en';
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('pickit_lang') || detectLang();
  });

  const setLang = useCallback((l) => {
    localStorage.setItem('pickit_lang', l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, ...args) => {
      const val = TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.ko[key] ?? key;
      return typeof val === 'function' ? val(...args) : val;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// 설정 화면에서 언어 목록 표시에 사용
export const SUPPORTED_LANGS = [
  { code: 'ko',    flag: '🇰🇷', name: '한국어',            nativeName: '한국어' },
  { code: 'en',    flag: '🇺🇸', name: 'English',           nativeName: 'English' },
  { code: 'ja',    flag: '🇯🇵', name: '日本語',             nativeName: '日本語' },
  { code: 'zh-CN', flag: '🇨🇳', name: '简体中文',           nativeName: '简体中文' },
  { code: 'zh-TW', flag: '🇹🇼', name: '繁體中文',           nativeName: '繁體中文' },
  { code: 'id',    flag: '🇮🇩', name: 'Bahasa Indonesia',  nativeName: 'Bahasa Indonesia' },
  { code: 'th',    flag: '🇹🇭', name: 'ภาษาไทย',           nativeName: 'ภาษาไทย' },
  { code: 'vi',    flag: '🇻🇳', name: 'Tiếng Việt',        nativeName: 'Tiếng Việt' },
  { code: 'ms',    flag: '🇲🇾', name: 'Bahasa Melayu',     nativeName: 'Bahasa Melayu' },
  { code: 'fil',   flag: '🇵🇭', name: 'Filipino',          nativeName: 'Filipino' },
];
