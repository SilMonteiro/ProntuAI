import React from 'react';

const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const I = (children, extra) => (props) => (
  <svg {...base} {...extra} {...props}>
    {children}
  </svg>
);

export const IconMic = I(<><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>);
export const IconStop = I(<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />);
export const IconPlay = I(<path d="M7 5v14l12-7z" fill="currentColor" />);
export const IconPause = I(<><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></>);
export const IconSparkle = I(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" fill="currentColor" /><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" stroke="none" /></>);
export const IconSend = I(<path d="M5 12l14-7-5 14-2.5-5.5z" />);
export const IconCheck = I(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconX = I(<path d="M6 6l12 12M18 6L6 18" />);
export const IconAlert = I(<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18.2v.01" /></>);
export const IconLink = I(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
export const IconSearch = I(<><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>);
export const IconBell = I(<><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>);
export const IconLock = I(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IconPrint = I(<><path d="M7 9V3h10v6" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>);
export const IconPlus = I(<path d="M12 5v14M5 12h14" />);
export const IconFilter = I(<path d="M3 5h18l-7 8v6l-4-2v-4z" />);

export const Logo = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="10" fill="#0064e0" />
    <path d="M5 17h5l2.5-6 4 11 3-8 1.5 3H27" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
