'use client';

// Professional SVG icon system — replaces all emojis
// Each icon is 20x20 by default, inherits currentColor

interface IconProps {
  size?: number;
  className?: string;
}

const I = ({ size = 20, className, children }: IconProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={className} aria-hidden="true">
    {children}
  </svg>
);

// Navigation & general
export const IconHome = (p: IconProps) => <I {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></I>;
export const IconOrders = (p: IconProps) => <I {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></I>;
export const IconProduction = (p: IconProps) => <I {...p}><path d="M2 20h20"/><path d="M5 20V8l5-4v16"/><path d="M10 20V4l9 4v12"/><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/></I>;
export const IconDelivery = (p: IconProps) => <I {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></I>;
export const IconInventory = (p: IconProps) => <I {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></I>;
export const IconReports = (p: IconProps) => <I {...p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></I>;
export const IconVerify = (p: IconProps) => <I {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></I>;
export const IconAcademic = (p: IconProps) => <I {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></I>;

// Status
export const IconCheck = (p: IconProps) => <I {...p}><polyline points="20 6 9 17 4 12"/></I>;
export const IconX = (p: IconProps) => <I {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></I>;
export const IconAlertTriangle = (p: IconProps) => <I {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></I>;
export const IconClock = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></I>;
export const IconGear = (p: IconProps) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></I>;
export const IconRoute = (p: IconProps) => <I {...p}><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M6 9a9 9 0 009 9"/></I>;

// Business
export const IconCreditCard = (p: IconProps) => <I {...p}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></I>;
export const IconUser = (p: IconProps) => <I {...p}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></I>;
export const IconMoney = (p: IconProps) => <I {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></I>;
export const IconMapPin = (p: IconProps) => <I {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></I>;
export const IconPhone = (p: IconProps) => <I {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></I>;
export const IconMap = (p: IconProps) => <I {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></I>;
export const IconLogout = (p: IconProps) => <I {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></I>;

// Indicators
export const IconCircleFull = ({ size = 10, color, className }: { size?: number; color: string; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" className={className} aria-hidden="true">
    <circle cx="5" cy="5" r="5" fill={color} />
  </svg>
);

// Product icons (replacing food emojis)
export const IconPitaWhite = (p: IconProps) => <I {...p}><ellipse cx="12" cy="13" rx="9" ry="6" /><path d="M7 13c2-2 7-2 10 0" strokeWidth="1.5"/></I>;
export const IconPitaWhole = (p: IconProps) => <I {...p}><ellipse cx="12" cy="13" rx="9" ry="6" /><path d="M7 13c2-2 7-2 10 0" strokeWidth="1.5"/><line x1="9" y1="10" x2="9" y2="10.01" strokeWidth="3" strokeLinecap="round"/><line x1="15" y1="10" x2="15" y2="10.01" strokeWidth="3" strokeLinecap="round"/></I>;
export const IconPitaTabun = (p: IconProps) => <I {...p}><ellipse cx="12" cy="14" rx="9" ry="6" /><path d="M9 6c0-2 1-3 1-3M12 5c0-2 1-3 1-3M15 6c0-2 1-3 1-3" strokeWidth="1.5"/></I>;
export const IconLafa = (p: IconProps) => <I {...p}><ellipse cx="12" cy="12" rx="9" ry="9" /><path d="M8 12c2-3 6-3 8 0" strokeWidth="1.5"/></I>;
export const IconPitaMini = (p: IconProps) => <I {...p}><ellipse cx="12" cy="14" rx="6" ry="4" /><path d="M9 14c1.5-1.5 4.5-1.5 6 0" strokeWidth="1.5"/></I>;
