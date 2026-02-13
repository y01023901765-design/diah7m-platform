// DIAH-7M Locale Loader
// KO = 원본 (source of truth), EN/JA/ZH = 완전 번역
// 나머지 22개 언어 = EN fallback + 핵심 UI만 번역

import ko from './ko';
import en from './en';
import ja from './ja';
import zh from './zh';

// ── 22개 추가 언어: 핵심 UI 번역 ──
// 게이지명·시스템명은 EN fallback, 사용자 대면 UI만 번역
const es={login:'Iniciar sesión',signup:'Empezar gratis',logout:'Cerrar sesión',dashboard:'Panel',mypage:'Mi página',admin:'Administrador',heroSub:'DIAGNÓSTICO ECONÓMICO SATELITAL',heroTitle1:'Diagnosticando',heroTitle2:'economías desde el espacio',heroCta:'Iniciar diagnóstico gratis',free:'Empezar gratis',trial:'14 días gratis',perMonth:'/mes',email:'Correo',password:'Contraseña',name:'Nombre',next:'Siguiente',save:'Guardar',cancel:'Cancelar',good:'Bueno',caution:'Precaución',alert:'Alerta',profile:'Perfil',settings:'Configuración',locked:'Bloqueado',upgradeBtn:'Suscribirse'};
const ar={login:'تسجيل الدخول',signup:'ابدأ مجاناً',logout:'تسجيل الخروج',dashboard:'لوحة التحكم',mypage:'صفحتي',admin:'المسؤول',heroSub:'التشخيص الاقتصادي بالأقمار الصناعية',heroTitle1:'تشخيص',heroTitle2:'الاقتصادات من الفضاء',heroCta:'ابدأ التشخيص المجاني',free:'ابدأ مجاناً',trial:'14 يوم مجاني',perMonth:'/شهر',email:'البريد الإلكتروني',password:'كلمة المرور',name:'الاسم',next:'التالي',save:'حفظ',cancel:'إلغاء',good:'جيد',caution:'تحذير',alert:'تنبيه',profile:'الملف الشخصي',settings:'الإعدادات',locked:'مقفل',upgradeBtn:'اشترك'};
const fr={login:'Connexion',signup:'Commencer',logout:'Déconnexion',dashboard:'Tableau de bord',mypage:'Ma page',admin:'Admin',heroCta:'Diagnostic gratuit',free:'Gratuit',trial:'14 jours gratuits',perMonth:'/mois',email:'E-mail',password:'Mot de passe',name:'Nom',next:'Suivant',save:'Enregistrer',cancel:'Annuler',good:'Bon',caution:'Attention',alert:'Alerte',profile:'Profil',settings:'Paramètres',locked:'Verrouillé',upgradeBtn:"S'abonner"};
const de={login:'Anmelden',signup:'Kostenlos starten',logout:'Abmelden',dashboard:'Dashboard',mypage:'Meine Seite',admin:'Admin',heroCta:'Kostenlose Diagnose',free:'Kostenlos',trial:'14 Tage gratis',perMonth:'/Monat',email:'E-Mail',password:'Passwort',name:'Name',next:'Weiter',save:'Speichern',cancel:'Abbrechen',good:'Gut',caution:'Vorsicht',alert:'Warnung',profile:'Profil',settings:'Einstellungen',locked:'Gesperrt',upgradeBtn:'Abonnieren'};
const pt={login:'Entrar',signup:'Começar grátis',logout:'Sair',dashboard:'Painel',mypage:'Minha página',admin:'Admin',heroCta:'Diagnóstico gratuito',free:'Grátis',trial:'14 dias grátis',perMonth:'/mês',email:'E-mail',password:'Senha',name:'Nome',next:'Próximo',save:'Salvar',cancel:'Cancelar',good:'Bom',caution:'Atenção',alert:'Alerta',profile:'Perfil',settings:'Configurações',locked:'Bloqueado',upgradeBtn:'Assinar'};
const vi={login:'Đăng nhập',signup:'Bắt đầu miễn phí',logout:'Đăng xuất',dashboard:'Bảng điều khiển',heroCta:'Chẩn đoán miễn phí',free:'Miễn phí',email:'Email',password:'Mật khẩu',name:'Tên',save:'Lưu',cancel:'Hủy',good:'Tốt',caution:'Chú ý',alert:'Cảnh báo',locked:'Đã khóa',upgradeBtn:'Đăng ký'};
const th={login:'เข้าสู่ระบบ',signup:'เริ่มฟรี',logout:'ออกจากระบบ',dashboard:'แดชบอร์ด',heroCta:'วินิจฉัยฟรี',free:'ฟรี',email:'อีเมล',password:'รหัสผ่าน',name:'ชื่อ',save:'บันทึก',cancel:'ยกเลิก',good:'ดี',caution:'ระวัง',alert:'แจ้งเตือน',locked:'ล็อค',upgradeBtn:'สมัครสมาชิก'};
const id={login:'Masuk',signup:'Mulai gratis',logout:'Keluar',dashboard:'Dasbor',heroCta:'Diagnosis gratis',free:'Gratis',email:'Email',password:'Kata sandi',name:'Nama',save:'Simpan',cancel:'Batal',good:'Baik',caution:'Perhatian',alert:'Peringatan',locked:'Terkunci',upgradeBtn:'Berlangganan'};
const hi={login:'लॉग इन',signup:'मुफ़्त शुरू करें',logout:'लॉग आउट',dashboard:'डैशबोर्ड',heroCta:'मुफ़्त निदान शुरू करें',free:'मुफ़्त',email:'ईमेल',password:'पासवर्ड',name:'नाम',save:'सहेजें',cancel:'रद्द करें',good:'अच्छा',caution:'सावधानी',alert:'चेतावनी',locked:'लॉक',upgradeBtn:'सदस्यता लें'};
const ru={login:'Войти',signup:'Начать бесплатно',logout:'Выйти',dashboard:'Панель',heroCta:'Бесплатная диагностика',free:'Бесплатно',email:'Эл. почта',password:'Пароль',name:'Имя',save:'Сохранить',cancel:'Отмена',good:'Хорошо',caution:'Внимание',alert:'Тревога',locked:'Заблокировано',upgradeBtn:'Подписаться'};
const it={login:'Accedi',signup:'Inizia gratis',logout:'Esci',dashboard:'Dashboard',heroCta:'Diagnosi gratuita',free:'Gratis',email:'Email',password:'Password',name:'Nome',save:'Salva',cancel:'Annulla',good:'Buono',caution:'Attenzione',alert:'Allerta',locked:'Bloccato',upgradeBtn:'Abbonati'};
const nl={login:'Inloggen',signup:'Gratis starten',logout:'Uitloggen',dashboard:'Dashboard',heroCta:'Gratis diagnose',free:'Gratis',email:'E-mail',password:'Wachtwoord',name:'Naam',save:'Opslaan',cancel:'Annuleren',good:'Goed',caution:'Voorzichtig',alert:'Waarschuwing',locked:'Vergrendeld',upgradeBtn:'Abonneren'};
const pl={login:'Zaloguj',signup:'Zacznij za darmo',logout:'Wyloguj',dashboard:'Panel',heroCta:'Darmowa diagnoza',free:'Za darmo',email:'E-mail',password:'Hasło',name:'Imię',save:'Zapisz',cancel:'Anuluj',good:'Dobry',caution:'Uwaga',alert:'Alert',locked:'Zablokowany',upgradeBtn:'Subskrybuj'};
const tr={login:'Giriş',signup:'Ücretsiz başla',logout:'Çıkış',dashboard:'Panel',heroCta:'Ücretsiz tanı',free:'Ücretsiz',email:'E-posta',password:'Şifre',name:'İsim',save:'Kaydet',cancel:'İptal',good:'İyi',caution:'Dikkat',alert:'Uyarı',locked:'Kilitli',upgradeBtn:'Abone ol'};
const sv={login:'Logga in',signup:'Börja gratis',logout:'Logga ut',dashboard:'Panel',free:'Gratis',email:'E-post',password:'Lösenord',name:'Namn',save:'Spara',cancel:'Avbryt',good:'Bra',caution:'Varning',alert:'Larm',locked:'Låst',upgradeBtn:'Prenumerera'};
const da={login:'Log ind',signup:'Start gratis',logout:'Log ud',dashboard:'Dashboard',free:'Gratis',email:'E-mail',password:'Adgangskode',name:'Navn',save:'Gem',cancel:'Annuller',locked:'Låst',upgradeBtn:'Abonner'};
const no={login:'Logg inn',signup:'Start gratis',logout:'Logg ut',dashboard:'Dashbord',free:'Gratis',email:'E-post',password:'Passord',name:'Navn',save:'Lagre',cancel:'Avbryt',locked:'Låst',upgradeBtn:'Abonner'};
const fi={login:'Kirjaudu',signup:'Aloita ilmaiseksi',logout:'Kirjaudu ulos',dashboard:'Hallintapaneeli',free:'Ilmainen',email:'Sähköposti',password:'Salasana',name:'Nimi',save:'Tallenna',cancel:'Peruuta',locked:'Lukittu',upgradeBtn:'Tilaa'};
const cs={login:'Přihlásit',signup:'Začít zdarma',logout:'Odhlásit',dashboard:'Panel',free:'Zdarma',email:'E-mail',password:'Heslo',name:'Jméno',save:'Uložit',cancel:'Zrušit',locked:'Zamčeno',upgradeBtn:'Předplatit'};
const hu={login:'Bejelentkezés',signup:'Ingyenes kezdés',logout:'Kijelentkezés',dashboard:'Irányítópult',free:'Ingyenes',email:'E-mail',password:'Jelszó',name:'Név',save:'Mentés',cancel:'Mégse',locked:'Zárolva',upgradeBtn:'Feliratkozás'};
const ro={login:'Autentificare',signup:'Începe gratuit',logout:'Deconectare',dashboard:'Panou',free:'Gratuit',email:'E-mail',password:'Parolă',name:'Nume',save:'Salvare',cancel:'Anulare',locked:'Blocat',upgradeBtn:'Abonare'};
const uk={login:'Увійти',signup:'Почати безкоштовно',logout:'Вийти',dashboard:'Панель',free:'Безкоштовно',email:'Ел. пошта',password:'Пароль',name:"Ім'я",save:'Зберегти',cancel:'Скасувати',locked:'Заблоковано',upgradeBtn:'Підписатися'};
const he={login:'התחבר',signup:'התחל בחינם',logout:'התנתק',dashboard:'לוח בקרה',free:'חינם',email:'אימייל',password:'סיסמה',name:'שם',save:'שמור',cancel:'ביטול',locked:'נעול',upgradeBtn:'הירשם'};

const LOCALES = { ko, en, ja, zh, es, ar, fr, de, pt, vi, th, id, hi, ru, it, nl, pl, tr, sv, da, no, fi, cs, hu, ro, uk, he };

export default LOCALES;
