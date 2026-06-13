'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--ht-primary)' }}>

      {/* Background illustration layer */}
      <div className="absolute inset-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, var(--ht-primary) 0%, #0f2a50 40%, #1a3a6b 70%, #152d4f 100%)' }}></div>

        {/* Decorative shapes — bakery themed abstract */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1440 900" fill="none">
          {/* Large pita circles */}
          <circle cx="200" cy="450" r="280" stroke="white" strokeWidth="1" />
          <circle cx="200" cy="450" r="220" stroke="white" strokeWidth="0.5" />
          <circle cx="200" cy="450" r="160" stroke="white" strokeWidth="0.5" />
          {/* Wheat stalks */}
          <path d="M100 800 Q150 700 130 600 Q180 650 160 550 Q210 600 190 500" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M500 850 Q520 750 510 650 Q550 700 530 600" stroke="white" strokeWidth="1" fill="none" />
          {/* Factory silhouette */}
          <rect x="300" y="600" width="60" height="150" fill="white" opacity="0.3" />
          <rect x="380" y="650" width="40" height="100" fill="white" opacity="0.2" />
          <rect x="310" y="560" width="15" height="60" fill="white" opacity="0.3" />
          {/* Rolling hills */}
          <path d="M0 750 Q200 680 400 720 Q600 760 800 700 Q1000 640 1200 710 Q1400 780 1440 750 L1440 900 L0 900Z" fill="white" opacity="0.02" />
        </svg>

        {/* Glow effects */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(36,86,232,0.08)' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl" style={{ background: 'rgba(36,86,232,0.06)' }}></div>
      </div>

      {/* Top nav bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={44} height={44} className="object-contain" priority />
          <span className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>ד״ר פיתה</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <span>מערכת ניהול המאפייה</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
          <span>ניסיון של איכות, מסורת של טעם</span>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center px-6" style={{ minHeight: 'calc(100vh - 140px)' }}>
        <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left side — branding */}
          <div className="flex-1 flex flex-col items-center lg:items-start">
            {/* Logo with glow effect */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: 'rgba(218,175,90,0.15)', transform: 'scale(0.7)' }}></div>
              <div className="lg:hidden relative">
                <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={200} height={200} className="object-contain relative z-10" priority />
              </div>
              <div className="hidden lg:block relative">
                <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={280} height={280} className="object-contain relative z-10" priority />
              </div>
            </div>

            {/* Tagline */}
            <h1 className="text-3xl lg:text-5xl font-bold text-white leading-tight text-center lg:text-start"
              style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
              פיתות טריות
              <br />
              <span style={{ color: 'rgba(218,175,90,0.9)' }}>כל יום, בכל מקום</span>
            </h1>
            <p className="mt-4 text-base lg:text-lg text-center lg:text-start max-w-md" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: '1.7' }}>
              מערכת ד״ר פיתה מנהלת את כל שרשרת האספקה — מקליטת ההזמנה, דרך תכנון הייצור, ועד המשלוח ללקוח.
            </p>
          </div>

          {/* Right side — login card */}
          <div className="w-full max-w-sm">
            <div className="rounded-2xl p-7" style={{ background: 'var(--ht-surface)', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
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
                  {[
                    { name: 'avi', role: 'מנהל' },
                    { name: 'mohamad', role: 'נהג' },
                    { name: 'ahmad', role: 'ייצור' },
                    { name: 'ronen', role: 'מחסנאי' },
                  ].map(u => (
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

      {/* Bottom bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
        <span>© 2026 ד״ר פיתה — מערכת ניהול המאפייה</span>
        <span>מאז 1998</span>
      </div>
    </div>
  );
}
