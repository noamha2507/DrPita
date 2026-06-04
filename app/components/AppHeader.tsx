'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from './Logo';
import { IconHome, IconOrders, IconProduction, IconDelivery, IconInventory, IconReports, IconLogout } from './Icons';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
}

const roleLabels: Record<string, string> = { Manager: 'מנהל', ProductionWorker: 'עובד ייצור', WarehouseWorker: 'מחסנאי', Driver: 'נהג' };

const toolbarLinks: Record<string, { href: string; label: string; Icon: React.FC<{ size?: number; className?: string }> }[]> = {
  Manager: [
    { href: '/dashboard', label: 'ראשי', Icon: IconHome },
    { href: '/orders', label: 'הזמנות', Icon: IconOrders },
    { href: '/production', label: 'ייצור', Icon: IconProduction },
    { href: '/delivery', label: 'משלוחים', Icon: IconDelivery },
    { href: '/inventory', label: 'מלאי', Icon: IconInventory },
    { href: '/reports', label: 'דוחות', Icon: IconReports },
  ],
  ProductionWorker: [
    { href: '/dashboard', label: 'ראשי', Icon: IconHome },
    { href: '/production', label: 'ייצור', Icon: IconProduction },
  ],
  Driver: [
    { href: '/dashboard', label: 'ראשי', Icon: IconHome },
    { href: '/delivery', label: 'משלוחים', Icon: IconDelivery },
  ],
  WarehouseWorker: [
    { href: '/dashboard', label: 'ראשי', Icon: IconHome },
    { href: '/inventory', label: 'מלאי', Icon: IconInventory },
  ],
};

export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userRole, setUserRole] = useState('');
  const [username, setUsername] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setUserRole(user.role || '');
      setUsername(user.username || '');
    }
  }, []);

  const links = toolbarLinks[userRole] || [];

  return (
    <header style={{ background: 'var(--ht-primary)' }}>
      {/* Single unified bar: logo + nav + user */}
      <div className="flex items-center justify-between px-5 h-14">

          {/* Brand */}
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 shrink-0 transition-opacity hover:opacity-100 opacity-90">
            <Logo size={38} light={true} />
            <span className="text-base font-bold text-white"
              style={{ fontFamily: 'var(--font-display), Heebo, sans-serif' }}>
              ד״ר פיתה
            </span>
          </button>

          {/* Navigation — centered */}
          {links.length > 0 && (
            <nav className="flex items-center gap-1 mx-4" aria-label="ניווט ראשי">
              {links.map(link => {
                const isActive = pathname === link.href;
                return (
                  <button key={link.href} onClick={() => router.push(link.href)}
                    className="relative px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                      fontWeight: isActive ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                      }
                    }}
                    aria-current={isActive ? 'page' : undefined}>
                    <link.Icon size={16} />
                    <span>{link.label}</span>
                    {/* Active indicator line */}
                    {isActive && (
                      <span className="absolute bottom-0 right-3 left-3 h-0.5 rounded-full bg-white"></span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* User section */}
          <div className="flex items-center gap-3 shrink-0">
            {username && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}>
                  {username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-white leading-tight">{username}</span>
                  <span className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {roleLabels[userRole] || ''}
                  </span>
                </div>
              </div>
            )}
            <button onClick={() => { localStorage.removeItem('user'); router.push('/login'); }}
              className="p-2 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
              title="יציאה מהמערכת">
              <IconLogout size={18} />
            </button>
          </div>
        </div>
    </header>
  );
}
