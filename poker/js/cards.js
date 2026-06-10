'use strict';
// Cards are ints 0..51: rank = (c>>2)+2 (2..14), suit = c&3 (♠♥♦♣).
const Cards = {
  SUITS: ['♠', '♥', '♦', '♣'],
  RANKS: { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' },
  CAT_NAMES: ['High Card', 'Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'],

  rank(c){ return (c >> 2) + 2; },
  suit(c){ return c & 3; },
  rankStr(c){ const r = Cards.rank(c); return Cards.RANKS[r] || ('' + r); },
  suitStr(c){ return Cards.SUITS[c & 3]; },
  isRed(c){ const s = c & 3; return s === 1 || s === 2; },

  deck(){
    const d = [];
    for (let c = 0; c < 52; c++) d.push(c);
    for (let i = d.length - 1; i > 0; i--){
      const j = (Math.random() * (i + 1)) | 0;
      const t = d[i]; d[i] = d[j]; d[j] = t;
    }
    return d;
  },

  // all C(7,5) index combinations, generated once
  COMBOS: (() => {
    const out = [];
    for (let a = 0; a < 3; a++)
      for (let b = a + 1; b < 4; b++)
        for (let c = b + 1; c < 5; c++)
          for (let d = c + 1; d < 6; d++)
            for (let e = d + 1; e < 7; e++)
              out.push([a, b, c, d, e]);
    return out;
  })(),

  // score for exactly 5 cards; higher beats lower
  eval5(cs){
    const rs = [0, 0, 0, 0, 0];
    let flush = true;
    const s0 = cs[0] & 3;
    const cnt = new Array(15).fill(0);
    for (let i = 0; i < 5; i++){
      rs[i] = (cs[i] >> 2) + 2;
      cnt[rs[i]]++;
      if ((cs[i] & 3) !== s0) flush = false;
    }
    // group ranks by (count desc, rank desc)
    const groups = [];
    for (let r = 14; r >= 2; r--) if (cnt[r]) groups.push([cnt[r], r]);
    groups.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    // straight detection (groups all count 1 -> 5 distinct ranks)
    let straightHigh = 0;
    if (groups.length === 5){
      const hi = groups[0][1], lo = groups[4][1];
      if (hi - lo === 4) straightHigh = hi;
      else if (hi === 14 && groups[1][1] === 5) straightHigh = 5; // wheel A-5
    }
    let cat;
    if (straightHigh && flush) cat = 8;
    else if (groups[0][0] === 4) cat = 7;
    else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
    else if (flush) cat = 5;
    else if (straightHigh) cat = 4;
    else if (groups[0][0] === 3) cat = 3;
    else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
    else if (groups[0][0] === 2) cat = 1;
    else cat = 0;
    let score = cat << 20;
    if (straightHigh && cat !== 5){
      score |= straightHigh << 16;
    } else {
      let shift = 16;
      for (const [, r] of groups){
        score |= r << shift;
        shift -= 4;
        if (shift < 0) break;
      }
    }
    return score;
  },

  // best 5-card score from 7 cards
  eval7(cs){
    let best = 0;
    const pick = [0, 0, 0, 0, 0];
    for (const idx of Cards.COMBOS){
      for (let i = 0; i < 5; i++) pick[i] = cs[idx[i]];
      const s = Cards.eval5(pick);
      if (s > best) best = s;
    }
    return best;
  },

  handName(score){
    const cat = score >> 20;
    if (cat === 8 && ((score >> 16) & 15) === 14) return 'Royal Flush';
    return Cards.CAT_NAMES[cat];
  },
};
