import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;
  const s = String(status).toUpperCase();
  const cls = `badge badge-${s.toLowerCase()}`;

  let label = s.replace(/_/g, ' ');

  return <span className={cls}>{label}</span>;
}
