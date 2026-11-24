// Each pictogram uses a 32 × 32 viewBox and inherits stroke and fill from its SVG.
window.serviceIconPaths = {
  install: `
    <rect x="4.5" y="3.5" width="18" height="25" rx="2.5" fill="currentColor" fill-opacity=".065"/>
    <rect x="8" y="7" width="10.5" height="6.5" rx="1"/>
    <path d="M8.5 17h7m-7 6h3.5"/>
    <path d="m17.2 26.8 5-5a4.7 4.7 0 0 0 6.1-5.9l-2.9 2.9-2.5-.7-.7-2.5 2.9-2.9a4.7 4.7 0 0 0-5.9 6.1l-5 5a2.1 2.1 0 0 0 3 3Z" fill="var(--icon-surface, white)"/>
  `,
  transport: `
    <path d="M2.5 7a1.5 1.5 0 0 1 1.5-1.5h14.5A1.5 1.5 0 0 1 20 7v16.5h-2.7m-7.6 0H3.5a1 1 0 0 1-1-1Z" fill="currentColor" fill-opacity=".065"/>
    <path d="M20 11h5.2l4.3 5.4v7.1h-2.7M20 23.5h1.6m1-10v3.7h6"/>
    <rect x="6.5" y="8.5" width="8.3" height="11.3" rx="1"/>
    <path d="M9 11.5h3.3m-3.3 5h3.3"/>
    <circle cx="7.4" cy="24" r="2.6"/><circle cx="24.3" cy="24" r="2.6"/>
  `,
  dispose: `
    <rect x="3.5" y="4.5" width="15.5" height="22.5" rx="2" fill="currentColor" fill-opacity=".065"/>
    <rect x="7" y="8" width="8.5" height="5.5" rx=".8"/>
    <path d="M7.5 17h6M7.5 22h3"/>
    <path d="m18.6 19.4 2.1-3.5a1.6 1.6 0 0 1 2.7 0l2.7 4.5m-3.4-.9 3.4.9.9-3.4M26.8 22l1.7 2.9a1.6 1.6 0 0 1-1.4 2.4h-4.7m1.9-2-2.1 2 2.1 2M20.2 27.3h-3.6a1.6 1.6 0 0 1-1.4-2.4l2-3.4m.7 3.1-.7-3.2-3.1.7"/>
  `,
  canopy: `
    <path d="m3.5 13 5-7h15.8l4.2 7Z" fill="currentColor" fill-opacity=".1"/>
    <path d="M3.5 13h25v3h-25ZM6 16v10.5M26 16v10.5M6.2 21.5l5.3-5.2M25.8 21.5l-5.3-5.2"/>
    <path d="M11.8 27v-6.5a.8.8 0 0 1 .8-.8h6.8a.8.8 0 0 1 .8.8V27m-5.8-4.5h3.1"/>
  `,
  clean: `
    <path d="M21.5 13.5v13a1.5 1.5 0 0 1-1.5 1.5H6a1.5 1.5 0 0 1-1.5-1.5v-21A1.5 1.5 0 0 1 6 4h12" fill="currentColor" fill-opacity=".065"/>
    <rect x="8" y="8" width="8" height="6" rx=".8"/>
    <path d="M8.5 18h8m-8 6H12M24 2.6c.5 3.6 1.4 4.5 5 5-3.6.6-4.5 1.5-5 5-.6-3.5-1.5-4.4-5-5 3.5-.5 4.4-1.4 5-5Z"/>
    <path d="M26.8 15.2v4m-2-2h4"/>
  `,
  furniture: `
    <path d="M3 15.5h18.5v3.3H3z" fill="currentColor" fill-opacity=".1"/>
    <path d="M5.2 19v7.3m13.8-7.1v7.1m-9.7-11.1v-3m-2.7 0h5.4"/>
    <rect x="4.5" y="4.8" width="10.2" height="7.1" rx="1.1"/>
    <path d="M23.3 20.2h3.5c1.1 0 1.7-.6 1.9-1.7l1.1-6.5c.2-1.4-.7-2.4-2-2.4h-.7l-1.4 7.3h-2.4a1.7 1.7 0 0 0 0 3.3Zm1.5.4v3.8m-3.2 2 3.2-2 3.2 2"/>
  `
};
