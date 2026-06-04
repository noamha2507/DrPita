// Hi-Tech Design System — shared style constants

export const card = {
  background: 'var(--ht-surface)',
  borderRadius: '12px',
  boxShadow: 'var(--ht-shadow)',
  border: '1px solid var(--ht-border)',
};

export const cardContainer = {
  background: 'var(--ht-surface-container)',
  borderRadius: '12px',
};

export const btnPrimary = {
  background: 'var(--ht-accent)',
  color: 'var(--ht-on-accent)',
  borderRadius: '8px',
};

export const btnPrimaryHover = {
  background: 'var(--ht-accent-hover)',
};

export const btnGhost = {
  background: 'var(--ht-surface)',
  color: 'var(--ht-on-surface)',
  border: '1px solid var(--ht-border)',
  borderRadius: '8px',
};

export const btnDanger = {
  background: 'var(--ht-danger)',
  color: '#fff',
  borderRadius: '8px',
};

export const btnSuccess = {
  background: 'var(--ht-success)',
  color: '#fff',
  borderRadius: '8px',
};

export const input = {
  background: 'var(--ht-surface)',
  border: '1px solid var(--ht-border)',
  color: 'var(--ht-on-surface)',
  borderRadius: '8px',
};

export const inputFocus = {
  borderColor: 'var(--ht-accent)',
  boxShadow: '0 0 0 3px var(--ht-accent-soft)',
};

export const inputBlur = {
  borderColor: 'var(--ht-border)',
  boxShadow: 'none',
};

export const badge = (color: string, bg: string) => ({
  background: bg,
  color: color,
  borderRadius: '999px',
  padding: '4px 12px',
  fontSize: '13px',
  fontWeight: 500,
});

export const statusBadge: Record<string, { color: string; bg: string }> = {
  // Order statuses
  Draft: { color: '#6b7280', bg: '#f3f4f6' },
  Approved: { color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
  Rejected: { color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
  Delivered: { color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
  // Production statuses
  'Waiting For Materials': { color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
  'In Progress': { color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
  InProgress: { color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
  Completed: { color: 'var(--ht-success)', bg: 'var(--ht-success-bg)' },
  Cancelled: { color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
  // Delivery statuses
  Planned: { color: '#6b7280', bg: '#f3f4f6' },
  Assigned: { color: 'var(--ht-accent)', bg: 'var(--ht-info-bg)' },
  Loaded: { color: '#6d28d9', bg: '#f5f3ff' },
    'On The Way': { color: 'var(--ht-warning)', bg: 'var(--ht-warning-bg)' },
  Failed: { color: 'var(--ht-danger)', bg: 'var(--ht-danger-bg)' },
};

export const getStatusBadgeStyle = (status: string) => {
  const s = statusBadge[status] || { color: '#6b7280', bg: '#f3f4f6' };
  return badge(s.color, s.bg);
};
