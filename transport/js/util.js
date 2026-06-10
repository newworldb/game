'use strict';
const U = {
  mulberry32(a){
    return function(){
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  hash2(x, y, s){
    const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453123;
    return h - Math.floor(h);
  },
  clamp(v, a, b){ return v < a ? a : (v > b ? b : v); },
  lerp(a, b, t){ return a + (b - a) * t; },
  sstep(t){ return t * t * (3 - 2 * t); },
  mdist(x1, y1, x2, y2){ return Math.abs(x1 - x2) + Math.abs(y1 - y2); },
  money(n){
    const sign = n < 0 ? '-' : '';
    n = Math.abs(Math.round(n));
    if (n >= 1e6) return sign + '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e4) return sign + '$' + (n / 1e3).toFixed(1) + 'k';
    return sign + '$' + n;
  },
};
