'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const GOLD = 'var(--brand-gold)';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'שם משתמש או סיסמה שגויים'); return; }
      if (remember) localStorage.setItem('drpita_last_user', username);
      localStorage.setItem('user', JSON.stringify(data));
      router.push('/dashboard');
    } catch { setError('שגיאת חיבור לשרת'); }
    finally { setLoading(false); }
  };

  const quickLogin = (name: string) => {
    setUsername(name);
    setPassword('1234');
  };

  const demoUsers = [
    { name: 'avi', role: 'מנהל' },
    { name: 'mohamad', role: 'נהג' },
    { name: 'ahmad', role: 'ייצור' },
    { name: 'ronen', role: 'מחסנאי' },
  ];

  const values = [
    { title: 'קליטת הזמנות', sub: 'בדיקת מלאי ואשראי בזמן אמת' },
    { title: 'תכנון ייצור לילי', sub: 'תוכנית אוטומטית לכל ליל אפייה' },
    { title: 'משלוחים חכמים', sub: 'איחוד קווי חלוקה וחתימה דיגיטלית' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2" dir="rtl" style={{ background: 'var(--ht-surface)' }}>

      {/* =================== Brand panel (right in RTL) =================== */}
      <aside className="hidden lg:flex relative flex-col items-center justify-center overflow-hidden px-12 py-10"
        style={{ background: 'radial-gradient(120% 100% at 68% 30%, #16335f 0%, #0c2140 50%, #081528 100%)' }}>

        {/* warm gold halo behind the emblem */}
        <div className="absolute rounded-full blur-3xl" style={{
          width: 560, height: 560, top: '6%',
          background: 'radial-gradient(circle, rgba(224,168,90,0.20) 0%, rgba(224,168,90,0.05) 45%, transparent 70%)',
        }} />
        {/* faint concentric rings */}
        <svg className="absolute" style={{ top: '-14%', width: 720, height: 720, opacity: 0.07 }} viewBox="0 0 720 720" fill="none">
          <circle cx="360" cy="360" r="340" stroke={GOLD} strokeWidth="1" />
          <circle cx="360" cy="360" r="264" stroke="white" strokeWidth="0.6" />
          <circle cx="360" cy="360" r="190" stroke={GOLD} strokeWidth="0.6" />
        </svg>
        {/* bottom vignette */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 36%)' }} />

        {/* emblem */}
        <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={399} height={466} priority
          className="relative z-10 w-60 xl:w-72 h-auto object-contain"
          style={{ filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.55))' }} />

        <h2 className="relative z-10 mt-7 text-2xl xl:text-3xl font-extrabold text-white text-center leading-snug"
          style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
          כל שרשרת האספקה, <span style={{ color: GOLD }}>במקום אחד</span>
        </h2>

        {/* gold divider */}
        <div className="relative z-10 mt-5 mb-6 h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

        {/* value rows */}
        <ul className="relative z-10 space-y-3.5 w-full max-w-xs">
          {values.map(v => (
            <li key={v.title} className="flex items-start gap-3">
              <span className="mt-1.5 w-5 h-px shrink-0" style={{ background: GOLD }} />
              <div>
                <p className="text-sm font-bold text-white leading-tight">{v.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{v.sub}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="absolute bottom-6 text-[11px] tracking-wide" style={{ color: 'rgba(255,255,255,0.28)' }}>
          מאפייה משפחתית · מאז 1998
        </p>
      </aside>

      {/* =================== Form column =================== */}
      <div className="flex flex-col min-h-screen">

        {/* mobile brand band */}
        <div className="lg:hidden flex items-center justify-center gap-3 py-6"
          style={{ background: 'radial-gradient(140% 160% at 50% 0%, #16335f 0%, #081528 100%)' }}>
          <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={399} height={466} priority className="w-14 h-auto object-contain" />
          <div>
            <p className="text-white font-extrabold text-lg leading-tight">ד״ר פיתה</p>
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>מערכת ניהול המאפייה</p>
          </div>
        </div>

        <main className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">

            {/* desktop mini-wordmark */}
            <div className="hidden lg:flex items-center gap-2 mb-9">
              <span className="w-8 h-px" style={{ background: GOLD }} />
              <span className="text-xs font-bold tracking-widest" style={{ color: 'var(--ht-primary)', opacity: 0.55 }}>
                מערכת ניהול המאפייה
              </span>
            </div>

            <h1 className="text-2xl md:text-[1.75rem] font-extrabold mb-1.5" style={{ color: 'var(--ht-primary)' }}>
              ברוכים השבים 👋
            </h1>
            <p className="text-sm mb-8 opacity-55">הזינו את הפרטים שלכם כדי להיכנס למערכת:</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>שם משתמש</label>
                <div className="relative">
                  <svg className="absolute top-1/2 -translate-y-1/2 right-3.5 opacity-40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                  </svg>
                  <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    className="w-full ps-4 pe-11 py-3 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--ht-surface-container)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; e.target.style.background = 'var(--ht-surface)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--ht-surface-container)'; }}
                    placeholder="הזינו שם משתמש" required autoComplete="username" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>סיסמה</label>
                <div className="relative">
                  <svg className="absolute top-1/2 -translate-y-1/2 right-3.5 opacity-40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full ps-14 pe-11 py-3 rounded-xl text-sm transition-all"
                    style={{ background: 'var(--ht-surface-container)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; e.target.style.background = 'var(--ht-surface)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--ht-surface-container)'; }}
                    placeholder="הזינו סיסמה" required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 left-3 -translate-y-1/2 text-xs px-2 py-1 rounded-md"
                    style={{ color: 'var(--ht-accent)', background: 'var(--ht-surface)' }}>
                    {showPassword ? 'הסתר' : 'הצג'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--ht-on-surface)' }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded" style={{ accentColor: 'var(--ht-accent)' }} />
                  זכור אותי
                </label>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 btn-primary"
                style={{ boxShadow: '0 10px 24px rgba(36,86,232,0.28)' }}>
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    מתחבר...
                  </>
                ) : (
                  <>כניסה למערכת <span className="opacity-60">←</span></>
                )}
              </button>
            </form>

            {/* Quick login */}
            <div className="mt-7 pt-5" style={{ borderTop: '1px solid var(--ht-border)' }}>
              <p className="text-[11px] font-bold tracking-wide text-center opacity-40 mb-3">כניסה מהירה לדמו · סיסמה <span dir="ltr">1234</span></p>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.map(u => (
                  <button key={u.name} onClick={() => quickLogin(u.name)}
                    className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs transition-all text-start"
                    style={{ background: 'var(--ht-surface-container)', border: '1px solid transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ht-accent)'; e.currentTarget.style.background = 'var(--ht-info-bg)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--ht-surface-container)'; }}>
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                      style={{ background: 'var(--ht-primary)', color: '#fff', border: '1.5px solid rgba(224,168,90,0.55)' }} dir="ltr">
                      {u.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-bold truncate" dir="ltr">{u.name}</span>
                      <span className="block opacity-45">{u.role}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>

        <footer className="px-6 py-4 flex items-center justify-between text-[11px]" style={{ color: 'var(--ht-on-surface)', opacity: 0.3 }}>
          <span>© 2026 ד״ר פיתה — מערכת ניהול המאפייה</span>
          <span>טעם. איכות. חיוך.</span>
        </footer>
      </div>
    </div>
  );
}
