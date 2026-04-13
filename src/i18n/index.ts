import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import vi from './locales/vi.json';
import ko from './locales/ko.json';

const STORAGE_KEY = 'flow_language';

/** Read persisted language, fall back to English */
const savedLang = localStorage.getItem(STORAGE_KEY);
const defaultLang = ['en', 'vi', 'ko'].includes(savedLang ?? '') ? savedLang! : 'en';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        vi: { translation: vi },
        ko: { translation: ko },
    },
    lng: defaultLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

/** Persist language change to localStorage whenever it changes */
i18n.on('languageChanged', (lang: string) => {
    localStorage.setItem(STORAGE_KEY, lang);
});

export default i18n;
