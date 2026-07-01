'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const GOLD = '#e0a85a';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col" style={{ background: '#081528' }}>

      {/* ===== Background layers ===== */}
      <div className="absolute inset-0">
        {/* deep navy, warmed toward the emblem (right, RTL) */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(1100px 760px at 74% 44%, #17325a 0%, #0e2445 42%, #081528 100%)',
        }} />
        {/* warm gold halo behind the emblem */}
        <div className="absolute rounded-full blur-3xl" style={{
          width: 620, height: 620, top: '14%', right: '6%',
          background: 'radial-gradient(circle, rgba(224,168,90,0.20) 0%, rgba(224,168,90,0.06) 42%, transparent 70%)',
        }} />
        {/* faint concentric rings centered on the emblem */}
        <svg className="absolute hidden lg:block" style={{ top: '-8%', right: '2%', width: 760, height: 760, opacity: 0.06 }} viewBox="0 0 760 760" fill="none">
          <circle cx="380" cy="380" r="360" stroke={GOLD} strokeWidth="1" />
          <circle cx="380" cy="380" r="290" stroke="white" strokeWidth="0.5" />
          <circle cx="380" cy="380" r="215" stroke={GOLD} strokeWidth="0.5" />
        </svg>
        {/* vignette for depth */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 46%, transparent 52%, rgba(0,0,0,0.42) 100%)' }} />
      </div>

      {/* ===== Top bar ===== */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={399} height={466} className="w-9 h-auto object-contain" priority />
          <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>ד״ר פיתה</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>
          <span>מערכת ניהול המאפייה</span>
          <span style={{ color: 'rgba(224,168,90,0.5)' }}>•</span>
          <span>ניסיון של איכות, מסורת של טעם</span>
        </div>
      </header>

      {/* ===== Main ===== */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-4">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">

          {/* Branding — the emblem */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3">
              {/* soft gold glow so the emblem reads as premium, not pasted */}
              <div className="absolute inset-0 rounded-full blur-2xl" style={{
                background: 'radial-gradient(circle, rgba(224,168,90,0.30) 0%, transparent 62%)',
                transform: 'scale(0.9)',
              }} />
              <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={399} height={466} priority
                className="relative z-10 w-56 lg:w-[19rem] h-auto object-contain"
                style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.55))' }} />
            </div>

            <h1 className="text-3xl lg:text-[2.6rem] font-extrabold text-white leading-[1.15]"
              style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif', textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
              פיתות טריות
              <br />
              <span style={{ color: GOLD }}>כל יום, בכל מקום</span>
            </h1>
            <p className="mt-4 text-sm lg:text-base max-w-md" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
              מערכת ד״ר פיתה מנהלת את כל שרשרת האספקה — מקליטת ההזמנה, דרך תכנון הייצור, ועד המשלוח ללקוח.
            </p>

            {/* small gold divider */}
            <div className="mt-5 h-px w-24" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          </div>

          {/* Login card */}
          <div className="w-full max-w-sm mx-auto">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 30px 70px rgba(0,0,0,0.45)' }}>
              {/* gold accent strip */}
              <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${GOLD}, #c98a3a)` }} />
              <div className="p-7" style={{ background: 'var(--ht-surface)' }}>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--ht-primary)' }}>שלום, ברוך הבא</h2>
                <p className="text-sm mb-6 opacity-50">יש להזדהות כדי להיכנס למערכת</p>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium mb-1" style={{ color: 'var(--ht-on-surface)' }}>שם משתמש</label>
                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-sm transition-all"
                      style={{ background: 'var(--ht-surface-container)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; }}
                      placeholder="הזינו שם משתמש" required autoComplete="username" />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--ht-on-surface)' }}>סיסמה</label>
                    <div className="relative">
                      <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full pe-16 px-4 py-2.5 rounded-xl text-sm transition-all"
                        style={{ background: 'var(--ht-surface-container)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                        onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; }}
                        onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; }}
                        placeholder="הזינו סיסמה" required autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-xs px-2 py-0.5 rounded"
                        style={{ color: 'var(--ht-accent)', background: 'var(--ht-surface)' }}>
                        {showPassword ? 'הסתר' : 'הצג'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="px-3 py-2 rounded-xl text-sm" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 btn-primary">
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
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--ht-border)' }}>
                  <p className="text-xs text-center opacity-40 mb-2.5">כניסה מהירה לדמו</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {demoUsers.map(u => (
                      <button key={u.name} onClick={() => quickLogin(u.name)}
                        className="py-2 px-2.5 rounded-lg text-xs transition-all text-start"
                        style={{ background: 'var(--ht-surface-container)', border: '1px solid transparent' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--ht-accent)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; }}>
                        <span className="font-bold" dir="ltr">{u.name}</span>
                        <span className="opacity-40 me-1"> — {u.role}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-center opacity-25 mt-2">סיסמה: <span dir="ltr">1234</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ===== Bottom bar ===== */}
      <footer className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span>© 2026 ד״ר פיתה — מערכת ניהול המאפייה</span>
        <span>מאז 1998</span>
      </footer>
    </div>
  );
}
