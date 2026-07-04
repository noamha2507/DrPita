'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const NAVY = '#0A1A2F';
const BLUE = '#2456E8';
const LIGHT = '#dbe7fd';
const GOLD = '#e0a85a';
const GOLD_DEEP = '#c98a3a';
const PITA = '#f3cf9b';

// Flat pita-factory illustration (reference-style: line art + brand fills)
function BakeryIllustration() {
  return (
    <svg viewBox="0 0 440 380" className="w-full max-w-md h-auto" fill="none" aria-hidden="true">
      {/* soft background leaves/blobs */}
      <path d="M52 330 C20 300 18 250 52 228 C60 262 62 300 52 330Z" fill={LIGHT} />
      <path d="M395 320 C425 285 420 235 385 218 C380 255 382 292 395 320Z" fill={LIGHT} />
      <circle cx="404" cy="96" r="7" fill={LIGHT} />
      <circle cx="38" cy="120" r="5" fill={LIGHT} />

      {/* gear (top-left) */}
      <circle cx="86" cy="74" r="26" stroke={BLUE} strokeWidth="10" strokeDasharray="11 8" />
      <circle cx="86" cy="74" r="9" fill={BLUE} />
      <circle cx="132" cy="110" r="10" stroke={LIGHT} strokeWidth="6" strokeDasharray="6 5" />

      {/* framed label — like the "SECURE" box */}
      <rect x="268" y="52" width="128" height="40" rx="4" fill="#fff" stroke={NAVY} strokeWidth="3" />
      <text x="332" y="79" textAnchor="middle" fontFamily="Heebo, sans-serif" fontWeight="800" fontSize="18" fill={NAVY}>טרי מהתנור</text>

      {/* steam from chimney */}
      <path d="M292 118 C286 110 296 104 290 96" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <path d="M312 122 C306 112 318 106 312 96" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />

      {/* oven */}
      <rect x="286" y="122" width="34" height="26" rx="4" fill={BLUE} />
      <rect x="232" y="142" width="146" height="140" rx="12" fill="#fff" stroke={NAVY} strokeWidth="3.5" />
      <rect x="232" y="142" width="146" height="26" rx="12" fill={BLUE} />
      <rect x="232" y="156" width="146" height="12" fill={BLUE} />
      {/* oven mouth */}
      <path d="M258 262 V222 C258 194 352 194 352 222 V262 Z" fill={NAVY} />
      {/* glowing pitas inside */}
      <ellipse cx="305" cy="248" rx="34" ry="9" fill={PITA} />
      <ellipse cx="305" cy="236" rx="28" ry="8" fill={GOLD} />
      {/* handle + legs */}
      <rect x="272" y="176" width="66" height="7" rx="3.5" fill={LIGHT} />
      <rect x="244" y="282" width="12" height="16" rx="3" fill={NAVY} />
      <rect x="354" y="282" width="12" height="16" rx="3" fill={NAVY} />

      {/* pita stack */}
      <ellipse cx="150" cy="292" rx="52" ry="13" fill={PITA} stroke={NAVY} strokeWidth="3" />
      <ellipse cx="150" cy="276" rx="48" ry="12" fill={GOLD} stroke={NAVY} strokeWidth="3" />
      <ellipse cx="150" cy="261" rx="44" ry="11" fill={PITA} stroke={NAVY} strokeWidth="3" />
      <ellipse cx="150" cy="247" rx="40" ry="10" fill={GOLD} stroke={NAVY} strokeWidth="3" />
      {/* one pita flying into the oven */}
      <ellipse cx="212" cy="196" rx="24" ry="8" fill={GOLD} stroke={NAVY} strokeWidth="3" transform="rotate(-14 212 196)" />
      <path d="M176 214 C186 206 196 202 206 200" stroke={BLUE} strokeWidth="2.5" strokeDasharray="5 6" strokeLinecap="round" />

      {/* wheat stalks (left) */}
      <path d="M64 300 C62 264 70 232 88 206" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <ellipse cx={78 - i * 3} cy={272 - i * 22} rx="9" ry="5" fill={GOLD} stroke={NAVY} strokeWidth="2" transform={`rotate(-38 ${78 - i * 3} ${272 - i * 22})`} />
          <ellipse cx={92 - i * 1} cy={262 - i * 22} rx="9" ry="5" fill={PITA} stroke={NAVY} strokeWidth="2" transform={`rotate(28 ${92 - i * 1} ${262 - i * 22})`} />
        </g>
      ))}

      {/* ground line + shadow */}
      <path d="M40 316 H400" stroke={NAVY} strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="220" cy="332" rx="140" ry="8" fill={LIGHT} />

      {/* floating plus/dots */}
      <path d="M196 92 h14 M203 85 v14" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
      <circle cx="174" cy="140" r="4" fill={GOLD} />
      <circle cx="238" cy="70" r="4" fill={BLUE} />
    </svg>
  );
}

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

  const pillInput: React.CSSProperties = {
    background: '#fff',
    border: 'none',
    color: NAVY,
    textAlign: 'right',
    boxShadow: '0 2px 8px rgba(10,26,47,0.10)',
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 md:p-10" dir="rtl"
      style={{ background: '#f6f8fd' }}>

      {/* ===== page decorations (reference-style blobs) ===== */}
      <div className="absolute rounded-full" style={{ width: 300, height: 300, bottom: -110, right: -90, border: `44px solid ${BLUE}` }} />
      <div className="absolute rounded-full" style={{ width: 220, height: 220, top: -70, left: -60, background: LIGHT }} />
      <div className="absolute rounded-full" style={{ width: 90, height: 90, top: 56, left: 150, border: `18px solid ${LIGHT}` }} />
      <div className="absolute rounded-full" style={{ width: 26, height: 26, bottom: 90, left: '30%', background: LIGHT }} />

      {/* ===== floating card ===== */}
      <div className="relative w-full max-w-4xl grid md:grid-cols-2 overflow-hidden bg-white"
        style={{ borderRadius: 28, boxShadow: '0 34px 90px rgba(10,26,47,0.18)' }}>

        {/* ---- illustration half (right in RTL) ---- */}
        <div className="hidden md:flex flex-col items-center justify-center p-8 bg-white">
          <BakeryIllustration />
          <p className="mt-2 text-sm font-bold" style={{ color: NAVY, opacity: 0.75 }}>
            מהקמח ועד הלקוח — הכול במערכת אחת
          </p>
        </div>

        {/* ---- blue form half (left) ---- */}
        <div className="p-8 md:p-12 flex flex-col justify-center" style={{ background: BLUE }}>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8"
            style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}>
            ברוכים הבאים!
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* username pill */}
            <div className="relative">
              <svg className="absolute top-1/2 -translate-y-1/2 right-4 opacity-45" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-full ps-12 pe-5 py-3 text-sm outline-none"
                style={pillInput}
                placeholder="שם משתמש" required autoComplete="username" aria-label="שם משתמש" />
            </div>

            {/* password pill */}
            <div className="relative">
              <svg className="absolute top-1/2 -translate-y-1/2 right-4 opacity-45" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2">
                <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full ps-14 pe-11 py-3 text-sm outline-none"
                style={pillInput}
                placeholder="סיסמה" required autoComplete="current-password" aria-label="סיסמה" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 left-4 -translate-y-1/2 text-[11px] font-bold"
                style={{ color: BLUE }}>
                {showPassword ? 'הסתר' : 'הצג'}
              </button>
            </div>

            {/* remember — like the "password strength" row: text + gold dashes */}
            <div className="flex items-center justify-between px-1 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded" style={{ accentColor: GOLD }} />
                זכור אותי
              </label>
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="w-7 h-1 rounded-full" style={{ background: GOLD }} />
                <span className="w-7 h-1 rounded-full" style={{ background: GOLD }} />
                <span className="w-7 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.35)' }} />
              </span>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-full text-xs font-bold bg-white flex items-center gap-2" style={{ color: 'var(--ht-danger)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0">
                  <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" />
                </svg>
                {error}
              </div>
            )}

            {/* gold pill CTA */}
            <div className="pt-2">
              <button type="submit" disabled={loading}
                className="w-full rounded-full py-3 text-sm font-extrabold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(180deg, ${GOLD}, ${GOLD_DEEP})`, color: NAVY, boxShadow: '0 8px 20px rgba(0,0,0,0.18)', cursor: 'pointer' }}>
                {loading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(10,26,47,0.35)', borderTopColor: NAVY }}></span>
                    מתחבר...
                  </>
                ) : 'כניסה למערכת'}
              </button>
            </div>
          </form>

          {/* quick demo — translucent pills */}
          <div className="mt-8 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.22)' }}>
            <p className="text-[11px] text-center mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
              כניסה מהירה לדמו · סיסמה <span dir="ltr">1234</span>
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {demoUsers.map(u => (
                <button key={u.name} onClick={() => quickLogin(u.name)}
                  className="rounded-full px-3.5 py-1.5 text-xs font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.28)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}>
                  <span dir="ltr">{u.name}</span>
                  <span style={{ opacity: 0.65 }}> · {u.role}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* tiny copyright */}
      <p className="absolute bottom-3 text-[10px]" style={{ color: NAVY, opacity: 0.3 }}>
        © 2026 ד״ר פיתה — טעם. איכות. חיוך.
      </p>
    </div>
  );
}
