'use strict';
// Inline SVG icon set (24x24, stroke style) — replaces emoji in the UI.
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  sparkles: '<path d="M12 3l1.7 5L19 9.7l-5.3 1.7L12 16.5l-1.7-5.1L5 9.7l5.3-1.7L12 3Z"/><path d="M19 15l.7 2.1L22 17.8l-2.3.8L19 20.7l-.7-2.1-2.3-.8 2.3-.7L19 15Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.6 3 14.4 0 18-3-3.6-3-14.4 0-18Z"/>',
  bed: '<path d="M3 7v11M3 16h18M21 18v-5a2 2 0 0 0-2-2H10v5"/><circle cx="6.5" cy="11" r="1.5"/>',
  bowl: '<path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M9 7c0-2.5 6-2.5 6 0"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16"/><circle cx="8.5" cy="19" r="1.5"/><circle cx="15.5" cy="19" r="1.5"/>',
  ticket: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M13 7v10" stroke-dasharray="2.5 2.5"/>',
  plane: '<path d="M22 2 11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7Z"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
  coins: '<circle cx="9" cy="9" r="5.5"/><path d="M14.8 11.5A5.5 5.5 0 1 1 12.5 14.8"/>',
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M15.5 14.5h2.5"/>',
  receipt: '<path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3L10 21l-2-1.3L6 21V3Z"/><path d="M9 8h6M9 12h6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8-10-10Z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
  flame: '<path d="M12 3c1.2 3.2-3 5.2-3 9a4.5 4.5 0 0 0 9 0c0-1.8-.8-3.3-1.8-4.8-.6 1-1.7 1.8-1.7 1.8C14.8 6.8 13.4 4.6 12 3Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.3.9-4.6 4.4 1.1 6.1L12 17.1 6.5 20l1.1-6.1L3 9.5l6.3-.9L12 3Z"/>',
  check: '<path d="m4 12.5 5 5L20 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="m8.3 10.8 6.4-3.6M8.3 13.2l6.4 3.6"/>',
  back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  pin: '<path d="M12 21s-7-5.4-7-11a7 7 0 0 1 14 0c0 5.6-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 3v4M16 3v4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.6c2.6.6 4.5 2.8 4.5 5.4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14"/><path d="M10 11v6M14 11v6"/>',
  moon: '<path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z"/>',
  suitcase: '<rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V4h6v3M9 11v5M15 11v5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.9-6.6M21 3v6h-6"/>',
  palm: '<path d="M12 8c0 6-1.5 10-3 13M12 8C10 5 6.5 4.5 4 6.5c3-.5 5.5.5 8 1.5ZM12 8c.5-3.5 3.5-5.5 7-4.5-2.5.5-5 2-7 4.5ZM12 8c3-1.5 6.5-.5 8 2.5-2.5-1.5-5-2-8-2.5Z"/>',
};

function icon(name, cls){
  return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || ICONS.pin) + '</svg>';
}
