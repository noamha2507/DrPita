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
    <div className="min-h-screen flex" style={{ background: 'var(--ht-surface-container)' }}>

      {/* Left panel — Hi-Tech branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, var(--ht-primary) 0%, #152d4f 50%, #1a3a6b 100%)' }}>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(36,86,232,0.1)', transform: 'translate(30%,-30%)' }}></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(36,86,232,0.08)', transform: 'translate(-20%,20%)' }}></div>

        {/* Top: tagline */}
        <div className="relative z-10">
          <p className="text-xs tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>מערכת ניהול מאפייה</p>
        </div>

        {/* Center: logo + text */}
        <div className="relative z-10 flex flex-col items-center">
          <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={200} height={200} className="object-contain" priority />
          <p className="text-center text-lg mt-4 font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
            ניסיון של איכות, מסורת של טעם
          </p>
          <p className="text-center text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>מאז 1998</p>
        </div>

        {/* Bottom: features as row */}
        <div className="relative z-10">
          <div className="grid grid-cols-3 gap-3">
            {[
              { num: '01', title: 'הזמנות', desc: 'קליטה ואשראי' },
              { num: '02', title: 'ייצור', desc: 'תוכניות יומיות' },
              { num: '03', title: 'משלוחים', desc: 'מעקב וחתימות' },
            ].map((item) => (
              <div key={item.num} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: 'var(--ht-accent)' }}>{item.num}</p>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile: logo */}
          <div className="lg:hidden flex justify-center mb-6">
            <Image src="/logo-nobg.png" alt="ד״ר פיתה" width={130} height={130} className="object-contain" priority />
          </div>

          {/* Welcome */}
          <div className="mb-6 text-center lg:text-start">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--ht-primary)' }}>שלום, ברוך הבא</h2>
            <p className="text-sm mt-1 opacity-50">יש להזדהות כדי להיכנס למערכת</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>שם משתמש</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-base transition-all"
                style={{ background: 'var(--ht-surface)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; }}
                placeholder="הזינו שם משתמש" required autoComplete="username" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--ht-on-surface)' }}>סיסמה</label>
              <div className="relative">
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full pe-20 px-4 py-3 rounded-xl text-base transition-all"
                  style={{ background: 'var(--ht-surface)', border: '1.5px solid var(--ht-border)', color: 'var(--ht-on-surface)', textAlign: 'right' }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--ht-accent)'; e.target.style.boxShadow = '0 0 0 3px var(--ht-accent-soft)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'var(--ht-border)'; e.target.style.boxShadow = 'none'; }}
                  placeholder="הזינו סיסמה" required autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 left-4 -translate-y-1/2 text-xs px-2 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--ht-accent)', background: 'var(--ht-surface-container)' }}>
                  {showPassword ? 'הסתר' : 'הצג'}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--ht-danger-bg)', color: 'var(--ht-danger)' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-base btn-primary">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  מתחבר...
                </span>
              ) : 'כניסה למערכת'}
            </button>
          </form>

          {/* Quick demo */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px" style={{ background: 'var(--ht-border)' }}></div>
              <span className="text-xs opacity-40">כניסה מהירה</span>
              <div className="flex-1 h-px" style={{ background: 'var(--ht-border)' }}></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'avi', role: 'מנהל' },
                { name: 'mohamad', role: 'נהג' },
                { name: 'ahmad', role: 'עובד ייצור' },
                { name: 'ronen', role: 'מחסנאי' },
              ].map(u => (
                <button key={u.name} onClick={() => quickLogin(u.name)}
                  className="py-2.5 px-3 rounded-xl text-sm transition-all text-start btn-ghost">
                  <span className="font-bold" dir="ltr">{u.name}</span>
                  <span className="text-xs opacity-50 me-1.5"> — {u.role}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-center opacity-30 mt-2">סיסמה: <span dir="ltr">1234</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
