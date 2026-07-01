'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8" style={{ background: 'var(--ht-surface-container)' }}>
      <div className="w-full max-w-5xl grid md:grid-cols-2 rounded-3xl overflow-hidden bg-white" style={{ boxShadow: '0 30px 70px rgba(10,26,47,0.14)' }}>

        {/* ===== Left: form ===== */}
        <div className="p-8 md:p-14 flex flex-col justify-center" dir="rtl">
          <div className="flex items-center gap-2.5 mb-10">
            <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={399} height={466} className="w-9 h-auto object-contain" priority />
            <span className="text-lg font-bold" style={{ color: 'var(--ht-primary)', fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>ד״ר פיתה</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-1.5" style={{ color: 'var(--ht-primary)' }}>התחברות לחשבון</h1>
          <p className="text-sm mb-8 opacity-55">ברוכים השבים! הזינו את הפרטים שלכם כדי להיכנס:</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>שם משתמש</label>
              <div className="relative">
                <svg className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4.5 h-4.5 opacity-40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
                </svg>
                <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full ps-11 px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: 'var(--ht-surface-container)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="הזינו שם משתמש" required autoComplete="username" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>סיסמה</label>
              <div className="relative">
                <svg className="absolute top-1/2 -translate-y-1/2 right-3.5 w-4.5 h-4.5 opacity-40" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pe-11 ps-14 px-4 py-2.5 rounded-xl text-sm transition-all"
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none" style={{ color: 'var(--ht-on-surface)' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded" style={{ accentColor: 'var(--ht-accent)' }} />
                זכור אותי
              </label>
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
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--ht-border)' }}>
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

        {/* ===== Right: brand panel ===== */}
        <div className="hidden md:flex relative flex-col items-center justify-center p-10 overflow-hidden" style={{
          background: 'radial-gradient(120% 120% at 30% 20%, #3a6bf0 0%, var(--ht-accent) 45%, #16357e 100%)',
        }}>
          {/* decorative rings */}
          <div className="absolute rounded-full" style={{ width: 520, height: 520, top: '-12%', right: '-16%', border: '1px solid rgba(255,255,255,0.12)' }} />
          <div className="absolute rounded-full" style={{ width: 340, height: 340, bottom: '-8%', left: '-10%', border: '1px solid rgba(255,255,255,0.10)' }} />

          {/* connector graphic: 3 nodes -> emblem -> floating card */}
          <div className="relative w-full max-w-sm mb-8" style={{ height: 210 }}>
            {/* connecting lines */}
            <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 360 210" fill="none">
              <path d="M60 40 H150" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              <path d="M60 105 H150" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              <path d="M60 170 H150" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
              <path d="M180 105 H260" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
            </svg>

            {/* left nodes: orders / production / delivery */}
            <div className="absolute rounded-full flex items-center justify-center bg-white" style={{ width: 56, height: 56, top: 12, right: '76%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ht-accent)" strokeWidth="1.8"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
            </div>
            <div className="absolute rounded-full flex items-center justify-center bg-white" style={{ width: 56, height: 56, top: 77, right: '76%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ht-accent)" strokeWidth="1.8"><path d="M4 19V7a2 2 0 0 1 2-2h4l2 3h6a2 2 0 0 1 2 2v9" /><path d="M4 19h16" /></svg>
            </div>
            <div className="absolute rounded-full flex items-center justify-center bg-white" style={{ width: 56, height: 56, top: 142, right: '76%' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ht-accent)" strokeWidth="1.8"><path d="M3 16V6h11v10" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" /></svg>
            </div>

            {/* center emblem */}
            <div className="absolute rounded-full bg-white flex items-center justify-center p-2" style={{ width: 68, height: 68, top: 71, right: '42%' }}>
              <Image src="/logo-nobg.png" alt="" width={399} height={466} className="w-11 h-auto object-contain" />
            </div>

            {/* floating card mock */}
            <div className="absolute rounded-2xl bg-white p-3.5" style={{ width: 148, top: 46, right: '2%', boxShadow: '0 16px 30px rgba(9,25,60,0.35)' }}>
              <div className="flex gap-1 mb-2.5">
                <span className="w-2 h-2 rounded-full" style={{ background: '#f0645c' }} />
                <span className="w-2 h-2 rounded-full" style={{ background: '#f4bd4f' }} />
                <span className="w-2 h-2 rounded-full" style={{ background: '#61c454' }} />
              </div>
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
                  <span className="w-6 h-6 rounded-full shrink-0" style={{ background: 'var(--ht-accent-soft)' }} />
                  <span className="h-2 rounded-full flex-1" style={{ background: 'var(--ht-border)' }} />
                </div>
              ))}
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-extrabold text-white text-center leading-snug">כל שרשרת האספקה, במקום אחד</h2>
          <p className="text-sm text-white text-center mt-2 max-w-xs" style={{ opacity: 0.8 }}>מקליטת ההזמנה, דרך תכנון הייצור, ועד המשלוח ללקוח.</p>
        </div>
      </div>
    </div>
  );
}
