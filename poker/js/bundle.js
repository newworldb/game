'use strict';
// GENERATED FILE — edit poker/js/*.js and run: node tools/build.js
/* ===== cards.js ===== */
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

/* ===== ai.js ===== */
// Bot decisions: Monte-Carlo equity vs. sampled opponents, pot odds,
// per-bot personality (tightness / aggression), occasional bluffs.
const AI = {
  // win probability of `hole` vs nOpp random hands, board completed randomly
  equity(hole, board, nOpp, iters){
    const known = new Set(hole.concat(board));
    const rest = [];
    for (let c = 0; c < 52; c++) if (!known.has(c)) rest.push(c);
    const need = nOpp * 2 + (5 - board.length);
    let win = 0, tie = 0;
    const my7 = hole.concat(board);
    for (let it = 0; it < iters; it++){
      for (let k = 0; k < need; k++){
        const j = k + ((Math.random() * (rest.length - k)) | 0);
        const t = rest[k]; rest[k] = rest[j]; rest[j] = t;
      }
      let ptr = nOpp * 2;
      const full = board.concat(rest.slice(ptr, ptr + (5 - board.length)));
      const mine = Cards.eval7(hole.concat(full));
      let best = 0;
      for (let o = 0; o < nOpp; o++){
        const s = Cards.eval7([rest[o * 2], rest[o * 2 + 1]].concat(full));
        if (s > best) best = s;
      }
      if (mine > best) win++;
      else if (mine === best) tie++;
    }
    return (win + tie * 0.5) / iters;
  },

  // ctx: {board, toCall, pot, minTo, maxTo, bb, nOpp, canRaise}
  decide(p, ctx){
    const nOpp = Math.max(1, Math.min(3, ctx.nOpp));
    const eq = AI.equity(p.cards, ctx.board, nOpp, ctx.board.length ? 150 : 110);
    const r = Math.random();
    const mayRaise = ctx.canRaise && p.raises < 2;
    const raiseTo = () => {
      const target = ctx.toCall + Math.max(ctx.bb * 2, ctx.pot * (0.45 + 0.5 * Math.random()) * p.aggr);
      return Math.round(Math.min(ctx.maxTo, Math.max(ctx.minTo, p.bet + ctx.toCall + target)));
    };

    if (ctx.toCall <= 0){
      if (mayRaise && (eq > 0.62 || (eq > 0.45 && r < 0.22 * p.aggr) || r < 0.035 * p.aggr))
        return { type: 'raise', to: raiseTo() };
      return { type: 'check' };
    }
    const odds = ctx.toCall / (ctx.pot + ctx.toCall);
    if (mayRaise && eq > 0.68 && r < 0.65 * p.aggr) return { type: 'raise', to: raiseTo() };
    if (mayRaise && r < 0.03 * p.aggr) return { type: 'raise', to: raiseTo() }; // bluff
    if (eq >= odds * p.tight) return { type: 'call' };
    // loose-call tiny bets with any live hand
    if (ctx.toCall <= ctx.bb && eq > 0.22) return { type: 'call' };
    return { type: 'fold' };
  },
};

/* ===== engine.js ===== */
// No-Limit Texas Hold'em engine, DOM-free. The UI (or a test harness)
// plugs in via Engine.hooks: update(), log(msg), human(ctx)->Promise<action>,
// handStart(), handEnd(), sleep(ms). Actions: {type:'fold'|'check'|'call'|
// 'raise', to} where `to` is the total street bet to raise to.
const Engine = {
  cfg: { SB: 10, BB: 20, STACK: 2000 },
  mode: 'cash',                       // 'cash' | 'tourney' | 'super'
  TOURNEY_STACK: 1500,
  BUYIN: 200,
  PRIZES: [600, 300, 100],            // 1st / 2nd / 3rd of 5
  LEVELS: [[10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200]],
  LEVEL_HANDS: 6,                     // hands per blind level
  SUPER_STACK: 500,
  SUPER_BUYIN: 100,
  SUPER_PRIZES: [300, 150, 50],
  SUPER_LEVELS: [[25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200]],
  SUPER_LEVEL_HANDS: 2,
  paceMult: 1,                        // sleep scaling: super turbo runs ~3x faster
  online: false,                      // online table (remote humans in bot seats)
  tourneyHands: 0,
  seats: [],
  button: -1,
  board: [],
  deck: [],
  street: '',
  currentBet: 0,
  minRaise: 0,
  handNo: 0,
  gen: 0,
  auto: false, // bots play the human seat too (tests)
  hooks: {
    update(){}, log(){}, human: null, handStart(){}, handEnd(){}, tourneyEnd(){},
    sleep: ms => new Promise(r => setTimeout(r, ms)),
  },

  BOTS: [
    { name: 'Maya', emoji: '🦊', tight: 0.95, aggr: 1.25 },
    { name: 'Viktor', emoji: '🐻', tight: 1.15, aggr: 0.7 },
    { name: 'Lena', emoji: '🦉', tight: 1.0, aggr: 1.0 },
    { name: 'Rocco', emoji: '🐗', tight: 0.85, aggr: 1.4 },
  ],

  init(humanStack, mode){
    Engine.mode = (mode === 'tourney' || mode === 'super') ? mode : 'cash';
    Engine.online = false;
    Engine.tourneyHands = 0;
    Engine.paceMult = Engine.mode === 'super' ? 0.3 : 1;
    if (Engine.mode === 'cash'){ Engine.cfg.SB = 10; Engine.cfg.BB = 20; }
    const startStack = Engine.mode === 'tourney' ? Engine.TOURNEY_STACK
      : Engine.mode === 'super' ? Engine.SUPER_STACK
      : (humanStack || Engine.cfg.STACK);
    const seat = (i, name, emoji, isHuman, tight, aggr) => ({
      i, name, emoji, isHuman,
      stack: isHuman ? startStack : (Engine.mode === 'cash' ? Engine.cfg.STACK : startStack),
      tight, aggr,
      cards: [], bet: 0, total: 0, folded: true, allin: false,
      acted: false, revealed: false, raises: 0, lastAction: '', winAmt: 0,
      out: false, finish: 0, remote: null,
    });
    Engine.seats = [seat(0, 'You', '🙂', true, 1, 1)];
    Engine.BOTS.forEach((b, k) => Engine.seats.push(seat(k + 1, b.name, b.emoji, false, b.tight, b.aggr)));
    Engine.button = -1;
    Engine.handNo = 0;
  },

  isTourney(){ return Engine.mode !== 'cash'; },
  buyin(){ return Engine.mode === 'super' ? Engine.SUPER_BUYIN : Engine.BUYIN; },
  prizes(){ return Engine.mode === 'super' ? Engine.SUPER_PRIZES : Engine.PRIZES; },
  levels(){ return Engine.mode === 'super' ? Engine.SUPER_LEVELS : Engine.LEVELS; },
  levelHands(){ return Engine.mode === 'super' ? Engine.SUPER_LEVEL_HANDS : Engine.LEVEL_HANDS; },
  startChips(){ return Engine.mode === 'super' ? Engine.SUPER_STACK : Engine.TOURNEY_STACK; },
  zzz(ms){ return Engine.hooks.sleep(Math.max(60, Math.round(ms * Engine.paceMult))); },
  level(){
    const ls = Engine.levels();
    return Math.min(ls.length - 1, (Engine.tourneyHands / Engine.levelHands()) | 0);
  },
  seated(){ return Engine.seats.filter(p => !p.out); },
  nextSeated(i){
    const n = Engine.seats.length;
    for (let k = 1; k <= n; k++){
      const j = (i + k) % n;
      if (!Engine.seats[j].out) return j;
    }
    return i;
  },
  place(n){ return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); },

  pot(){ return Engine.seats.reduce((a, p) => a + p.total, 0); },
  active(){ return Engine.seats.filter(p => !p.folded); },
  canActCount(){ return Engine.seats.filter(p => !p.folded && !p.allin).length; },
  human(){ return Engine.seats[0]; },

  postBet(p, amt){
    amt = Math.min(amt, p.stack);
    p.stack -= amt;
    p.bet += amt;
    p.total += amt;
    if (p.stack === 0) p.allin = true;
    return amt;
  },

  start(){
    Engine.run(); // fire and forget
  },

  async run(){
    const gen = ++Engine.gen;
    while (gen === Engine.gen){
      const res = await Engine.playHand(gen);
      if (res === 'aborted' || gen !== Engine.gen) return;
      if (Engine.isTourney()) Engine.processEliminations();
      Engine.hooks.handEnd();
      if (Engine.isTourney()){
        const human = Engine.human();
        const remaining = Engine.seated().length;
        if (human.out || remaining <= 1){
          if (!human.out) human.finish = 1;
          const placeN = human.finish || 1;
          const prize = Engine.prizes()[placeN - 1] || 0;
          Engine.hooks.tourneyEnd(placeN, prize);
          return;
        }
      }
      await Engine.zzz(2400);
    }
  },

  processEliminations(){
    const busted = Engine.seats.filter(p => !p.out && p.stack <= 0);
    if (!busted.length) return;
    const stillIn = Engine.seats.filter(p => !p.out && p.stack > 0).length;
    for (const p of busted){
      p.out = true;
      p.finish = stillIn + busted.length;
      Engine.hooks.log((p.isHuman ? 'You are' : p.name + ' is') + ' eliminated in ' + Engine.place(p.finish) + ' place');
    }
  },

  async playHand(gen){
    const H = Engine.hooks;
    Engine.handNo++;
    if (Engine.mode === 'cash'){
      for (const p of Engine.seats){
        if (p.stack <= 0){
          p.stack = Engine.cfg.STACK;
          H.log((p.isHuman ? 'You receive' : p.name + ' receives') + ' a fresh $' + Engine.cfg.STACK + ' stack');
        }
      }
    } else {
      const lvl = Engine.level();
      const prev = [Engine.cfg.SB, Engine.cfg.BB];
      Engine.cfg.SB = Engine.levels()[lvl][0];
      Engine.cfg.BB = Engine.levels()[lvl][1];
      if (Engine.cfg.BB !== prev[1] && Engine.tourneyHands > 0)
        H.log('Blinds up! Now ' + Engine.cfg.SB + '/' + Engine.cfg.BB);
      Engine.tourneyHands++;
    }
    for (const p of Engine.seats){
      p.cards = []; p.bet = 0; p.total = 0;
      p.folded = !!p.out; p.allin = false; p.acted = false;
      p.revealed = false; p.raises = 0; p.lastAction = ''; p.winAmt = 0;
    }
    H.handStart();
    Engine.board = [];
    Engine.deck = Cards.deck();
    const seated = Engine.seated();
    Engine.button = Engine.nextSeated(Engine.button);
    const next = i => Engine.nextSeated(i);
    let sb, bb;
    if (seated.length === 2){ sb = Engine.button; bb = next(sb); }
    else { sb = next(Engine.button); bb = next(sb); }
    Engine.postBet(Engine.seats[sb], Engine.cfg.SB);
    Engine.seats[sb].lastAction = 'SB ' + Engine.seats[sb].bet;
    Engine.postBet(Engine.seats[bb], Engine.cfg.BB);
    Engine.seats[bb].lastAction = 'BB ' + Engine.seats[bb].bet;
    Engine.currentBet = Engine.cfg.BB;
    Engine.minRaise = Engine.cfg.BB;
    for (const p of seated){ p.cards = [Engine.deck.pop(), Engine.deck.pop()]; }
    Engine.street = 'preflop';
    H.update();
    await Engine.zzz(500);
    if (gen !== Engine.gen) return 'aborted';

    let res = await Engine.bettingRound(next(bb), gen);
    if (res !== 'ok') return res;

    for (const st of [['flop', 3], ['turn', 1], ['river', 1]]){
      if (Engine.active().length <= 1) break;
      Engine.street = st[0];
      for (let k = 0; k < st[1]; k++) Engine.board.push(Engine.deck.pop());
      Engine.currentBet = 0;
      Engine.minRaise = Engine.cfg.BB;
      for (const p of Engine.seats){
        p.bet = 0; p.acted = false; p.raises = 0;
        if (!p.allin) p.lastAction = '';
      }
      // all-in runout: reveal everyone still in
      if (Engine.canActCount() <= 1){
        for (const p of Engine.active()) p.revealed = true;
      }
      H.update();
      await Engine.zzz(800);
      if (gen !== Engine.gen) return 'aborted';
      if (Engine.canActCount() >= 2){
        res = await Engine.bettingRound(Engine.nextActive(Engine.button), gen);
        if (res !== 'ok') return res;
      }
    }
    return Engine.showdown(gen);
  },

  nextActive(from){
    const n = Engine.seats.length;
    for (let k = 1; k <= n; k++){
      const i = (from + k) % n;
      const p = Engine.seats[i];
      if (!p.folded && !p.allin) return i;
    }
    return (from + 1) % n;
  },

  async bettingRound(startIdx, gen){
    const H = Engine.hooks;
    let i = startIdx;
    let guard = 0;
    while (guard++ < 400){
      if (Engine.active().length === 1) return Engine.awardFoldWin(gen);
      if (Engine.canActCount() === 0) return 'ok';
      const p = Engine.seats[i];
      if (!p.folded && !p.allin){
        if (p.acted && p.bet === Engine.currentBet) return 'ok';
        p.turn = true;
        H.update();
        const act = await Engine.getAction(p, gen);
        p.turn = false;
        if (gen !== Engine.gen) return 'aborted';
        Engine.applyAction(p, act);
        H.update();
        if (Engine.active().length === 1) return Engine.awardFoldWin(gen);
      }
      i = (i + 1) % Engine.seats.length;
    }
    return 'ok';
  },

  actionCtx(p){
    return {
      board: Engine.board,
      toCall: Engine.currentBet - p.bet,
      pot: Engine.pot(),
      minTo: Math.min(Engine.currentBet + Engine.minRaise, p.bet + p.stack),
      maxTo: p.bet + p.stack,
      bb: Engine.cfg.BB,
      nOpp: Engine.active().length - 1,
      canRaise: p.bet + p.stack > Engine.currentBet,
      stack: p.stack,
      bet: p.bet,
      online: Engine.online,
    };
  },

  async getAction(p, gen){
    const ctx = Engine.actionCtx(p);
    if (p.isHuman && !Engine.auto && Engine.hooks.human){
      const act = await Engine.hooks.human(ctx);
      if (gen !== Engine.gen) return { type: 'fold' };
      if (!act) return { type: ctx.toCall > 0 ? 'fold' : 'check' };
      return act;
    }
    if (p.remote && typeof Net !== 'undefined'){
      const act = await Net.requestAction(p, ctx);
      if (gen !== Engine.gen) return { type: 'fold' };
      if (act && act.type) return act;
      // connection lost mid-request: fall through to AI
    }
    await Engine.zzz(500 + Math.random() * 900);
    if (gen !== Engine.gen) return { type: 'fold' };
    return AI.decide(p, ctx);
  },

  applyAction(p, act){
    const H = Engine.hooks;
    p.acted = true;
    if (act.type === 'fold'){
      p.folded = true;
      p.lastAction = 'Fold';
      H.log(p.name + ' folds');
      return;
    }
    if (act.type === 'check' || (act.type === 'call' && Engine.currentBet - p.bet <= 0)){
      p.lastAction = 'Check';
      H.log(p.name + ' checks');
      return;
    }
    if (act.type === 'call'){
      Engine.postBet(p, Engine.currentBet - p.bet);
      p.lastAction = p.allin ? 'All-in ' + p.bet : 'Call ' + p.bet;
      H.log(p.name + (p.allin ? ' calls all-in' : ' calls $' + p.bet));
      return;
    }
    // raise
    let to = Math.round(act.to || 0);
    const maxTo = p.bet + p.stack;
    const minTo = Engine.currentBet + Engine.minRaise;
    if (to >= maxTo) to = maxTo;
    else to = Math.max(minTo, Math.min(maxTo, to));
    if (to <= Engine.currentBet){ // can't actually raise -> call
      Engine.postBet(p, Engine.currentBet - p.bet);
      p.lastAction = p.allin ? 'All-in ' + p.bet : 'Call ' + p.bet;
      H.log(p.name + ' calls');
      return;
    }
    const delta = to - Engine.currentBet;
    Engine.postBet(p, to - p.bet);
    const wasBet = Engine.currentBet === 0;
    Engine.currentBet = to;
    if (delta >= Engine.minRaise){
      Engine.minRaise = delta;
      for (const q of Engine.seats) if (q !== p) q.acted = false;
    }
    p.raises++;
    p.lastAction = p.allin ? 'All-in ' + to : (wasBet ? 'Bet ' + to : 'Raise ' + to);
    H.log(p.name + (p.allin ? ' is all-in for $' + to : (wasBet ? ' bets $' + to : ' raises to $' + to)));
  },

  async awardFoldWin(gen){
    const H = Engine.hooks;
    const w = Engine.active()[0];
    const amt = Engine.pot();
    for (const p of Engine.seats) p.total = 0;
    w.stack += amt;
    w.winAmt = amt;
    H.log(w.name + ' wins $' + amt);
    H.update();
    await Engine.zzz(900);
    return gen === Engine.gen ? 'ended' : 'aborted';
  },

  async showdown(gen){
    const H = Engine.hooks;
    Engine.street = 'showdown';
    const live = Engine.active();
    for (const p of live) p.revealed = true;
    const scores = new Map();
    for (const p of live) scores.set(p, Cards.eval7(p.cards.concat(Engine.board)));
    H.update();
    await Engine.zzz(1100);
    if (gen !== Engine.gen) return 'aborted';

    // side pots: peel layers of contributions
    const contrib = Engine.seats.map(p => ({ p, amt: p.total }));
    for (const p of Engine.seats) p.total = 0;
    const results = new Map(); // p -> won amount
    let guard = 0;
    while (guard++ < 30){
      const open = contrib.filter(c => c.amt > 0);
      if (!open.length) break;
      const lvl = Math.min(...open.map(c => c.amt));
      let pot = 0;
      const elig = [];
      for (const c of contrib){
        const take = Math.min(c.amt, lvl);
        pot += take;
        c.amt -= take;
        if (take === lvl && !c.p.folded) elig.push(c.p);
      }
      if (!elig.length) elig.push(live[0]);
      let best = 0;
      for (const p of elig) if (scores.get(p) > best) best = scores.get(p);
      const winners = elig.filter(p => scores.get(p) === best);
      const share = Math.floor(pot / winners.length);
      let rem = pot - share * winners.length;
      for (const p of winners){
        const got = share + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        p.stack += got;
        results.set(p, (results.get(p) || 0) + got);
      }
    }
    for (const [p, amt] of results){
      p.winAmt = amt;
      H.log(p.name + ' wins $' + amt + ' with ' + Cards.handName(scores.get(p)));
    }
    H.update();
    await Engine.zzz(1400);
    return gen === Engine.gen ? 'ended' : 'aborted';
  },
};

/* ===== save.js ===== */
const Save = {
  KEY: 'tinypoker-v1',
  data: { bank: 2000, xray: false, stats: { hands: 0, wins: 0, biggest: 0 } },

  load(){
    try {
      const raw = localStorage.getItem(Save.KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (typeof d.bank === 'number') Save.data.bank = d.bank;
        Save.data.xray = !!d.xray;
        if (d.stats) Save.data.stats = Object.assign(Save.data.stats, d.stats);
        return true;
      }
    } catch (e) { console.warn('load failed', e); }
    return false;
  },

  save(){
    try {
      localStorage.setItem(Save.KEY, JSON.stringify(Save.data));
    } catch (e) { console.warn('save failed', e); }
  },
};

/* ===== ui.js ===== */
const UI = {
  els: {},
  _res: null,
  _ctx: null,
  _raiseTo: 0,
  _timerTO: null,
  toastTimer: null,
  logTimer: null,
  lastView: null,

  // visual seat positions; your seat is always rotated to the bottom
  SEAT_POS: [
    { x: 50, y: 78 },  // hero
    { x: 13, y: 56 },
    { x: 20, y: 22 },
    { x: 80, y: 22 },
    { x: 87, y: 56 },
  ],

  CHIP_DENOMS: [
    [1000, '#e8c558', '#a8761a'],
    [500, '#9b59b6', '#6d3f85'],
    [100, '#2b3445', '#161d2a'],
    [25, '#1f8a4c', '#136034'],
    [5, '#c0303a', '#8a1f28'],
    [1, '#d7dce2', '#9aa1ab'],
  ],

  init(){
    const $ = id => document.getElementById(id);
    UI.els = {
      seats: $('seats'), board: $('board'), pot: $('pot'), log: $('log'),
      actions: $('actions'), actInfo: $('actInfo'),
      btnFold: $('btnFold'), btnCall: $('btnCall'), btnRaise: $('btnRaise'),
      raisePanel: $('raisePanel'), raiseAmt: $('raiseAmt'), raiseSlider: $('raiseSlider'),
      panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'),
      toast: $('toast'), handNo: $('handNo'), blinds: $('blinds'),
    };
    $('panelClose').onclick = () => UI.closePanel();
    $('btnMenu').onclick = () => UI.showMenu();
    UI.els.eye = $('btnEye');
    UI.els.eye.classList.toggle('on', !!Save.data.xray);
    UI.els.eye.onclick = () => {
      if (Engine.mode === 'super'){ UI.toast('X-ray is always on in Super Turbo'); return; }
      if (Engine.online || (typeof Net !== 'undefined' && Net.guestMode)){ UI.toast('No X-ray in online games — that would be cheating!'); return; }
      Save.data.xray = !Save.data.xray;
      Save.save();
      UI.els.eye.classList.toggle('on', Save.data.xray);
      UI.toast(Save.data.xray
        ? '👁 X-ray on — everyone\'s cards are face up (the bots play fair)'
        : 'X-ray off — cards are secret again');
      UI.update();
    };
    UI.els.btnFold.onclick = () => UI.act({ type: 'fold' });
    UI.els.btnCall.onclick = () => {
      if (!UI._ctx) return;
      UI.act({ type: UI._ctx.toCall > 0 ? 'call' : 'check' });
    };
    UI.els.btnRaise.onclick = () => UI.openRaise();
    $('btnRaiseCancel').onclick = () => UI.els.raisePanel.classList.add('hidden');
    $('btnRaiseGo').onclick = () => UI.act({ type: 'raise', to: UI._raiseTo });
    UI.els.raiseSlider.oninput = () => {
      const c = UI._ctx;
      if (!c) return;
      const t = UI.els.raiseSlider.value / 100;
      UI.setRaiseTo(Math.round(c.minTo + (c.maxTo - c.minTo) * t));
    };
    document.querySelectorAll('#raiseQuick button').forEach(b => {
      b.onclick = () => {
        const c = UI._ctx;
        if (!c) return;
        let to = c.minTo;
        if (b.dataset.q === 'half') to = c.toCall + c.bet + Math.round((c.pot + c.toCall) * 0.5);
        else if (b.dataset.q === 'pot') to = c.toCall + c.bet + (c.pot + c.toCall);
        else if (b.dataset.q === 'allin') to = c.maxTo;
        UI.setRaiseTo(to);
      };
    });
  },

  // ---- engine hooks ----
  human(ctx){
    UI._ctx = ctx;
    const e = UI.els;
    e.actions.classList.remove('hidden');
    e.raisePanel.classList.add('hidden');
    e.btnCall.textContent = ctx.toCall > 0 ? 'Call $' + Math.min(ctx.toCall, ctx.stack) : 'Check';
    e.btnRaise.textContent = ctx.toCall > 0 ? 'Raise' : 'Bet';
    e.btnRaise.style.display = ctx.canRaise ? '' : 'none';
    e.actInfo.textContent = 'Pot $' + ctx.pot + (ctx.toCall > 0 ? ' · $' + ctx.toCall + ' to call' : '');
    const bar = document.getElementById('timerBar');
    const fill = document.getElementById('timerFill');
    const secs = Engine.mode === 'super' ? 3 : (ctx.online ? 25 : 0);
    if (secs && bar && fill){
      bar.classList.remove('hidden');
      fill.style.transition = 'none';
      fill.style.width = '100%';
      void fill.offsetWidth;
      fill.style.transition = 'width ' + secs + 's linear';
      fill.style.width = '0%';
      UI._timerTO = setTimeout(() => {
        UI.toast(ctx.toCall > 0 ? '⏰ Time! You fold' : '⏰ Time! You check');
        UI.act({ type: ctx.toCall > 0 ? 'fold' : 'check' });
      }, secs * 1000);
    }
    return new Promise(res => { UI._res = res; });
  },

  act(a){
    clearTimeout(UI._timerTO);
    UI._timerTO = null;
    const tb = document.getElementById('timerBar');
    if (tb) tb.classList.add('hidden');
    const e = UI.els;
    e.actions.classList.add('hidden');
    const r = UI._res;
    UI._res = null;
    UI._ctx = null;
    if (r) r(a);
  },

  openRaise(){
    const c = UI._ctx;
    if (!c) return;
    UI.els.raisePanel.classList.remove('hidden');
    UI.els.raiseSlider.value = 0;
    UI.setRaiseTo(c.minTo);
  },

  setRaiseTo(to){
    const c = UI._ctx;
    if (!c) return;
    UI._raiseTo = Math.max(c.minTo, Math.min(c.maxTo, Math.round(to)));
    const allin = UI._raiseTo >= c.maxTo;
    UI.els.raiseAmt.textContent = (allin ? 'ALL-IN $' : '$') + UI._raiseTo;
    document.getElementById('btnRaiseGo').textContent =
      (c.toCall > 0 ? 'Raise to $' : 'Bet $') + UI._raiseTo;
    const t = (UI._raiseTo - c.minTo) / Math.max(1, c.maxTo - c.minTo);
    UI.els.raiseSlider.value = Math.round(t * 100);
  },

  // best 5-card score from 5, 6 or 7 available cards
  evalAvail(cs){
    if (cs.length >= 7) return Cards.eval7(cs.slice(0, 7));
    if (cs.length === 5) return Cards.eval5(cs);
    let best = 0;
    for (let skip = 0; skip < cs.length; skip++){
      const pick = cs.filter((_, i) => i !== skip);
      const s = Cards.eval5(pick);
      if (s > best) best = s;
    }
    return best;
  },

  _seen: new Set(),
  _seenHand: -1,
  // deal animation plays only the first time a given card slot appears
  dealClass(key, handNo){
    if (handNo !== UI._seenHand){
      UI._seenHand = handNo;
      UI._seen.clear();
    }
    if (UI._seen.has(key)) return '';
    UI._seen.add(key);
    return ' deal';
  },

  cardEl(c, sm, key, handNo){
    const d = document.createElement('div');
    const anim = key ? UI.dealClass(key, handNo) : '';
    if (c === null || c === undefined){
      d.className = 'card back' + (sm ? ' sm' : '') + anim;
      return d;
    }
    d.className = 'card ' + (Cards.isRed(c) ? 'red' : 'black') + (sm ? ' sm' : '') + anim;
    d.innerHTML = '<span class="cr">' + Cards.rankStr(c) + '</span><span class="cs">' + Cards.suitStr(c) + '</span>';
    return d;
  },

  // ---- 3D chip stacks ----
  chipStackEl(amount, label){
    const wrap = document.createElement('div');
    wrap.className = 'chipwrap';
    const stack = document.createElement('div');
    stack.className = 'chipstack';
    let rest = Math.max(0, Math.round(amount));
    const discs = [];
    for (const [den, col, edge] of UI.CHIP_DENOMS){
      while (rest >= den && discs.length < 8){
        discs.push([col, edge]);
        rest -= den;
      }
    }
    if (!discs.length && amount > 0) discs.push([UI.CHIP_DENOMS[5][1], UI.CHIP_DENOMS[5][2]]);
    discs.reverse().forEach(([col, edge], i) => {
      const c = document.createElement('div');
      c.className = 'chip3';
      c.style.background = 'radial-gradient(circle at 50% 30%, ' + col + ', ' + edge + ')';
      c.style.borderBottomColor = edge;
      c.style.bottom = (i * 4) + 'px';
      c.style.zIndex = i;
      stack.appendChild(c);
    });
    wrap.appendChild(stack);
    if (label !== false){
      const t = document.createElement('div');
      t.className = 'chiplabel';
      t.textContent = '$' + amount;
      wrap.appendChild(t);
    }
    return wrap;
  },

  // ---- view building (host/local) ----
  buildView(forSeat, sanitize){
    const xray = !sanitize && !Engine.online && (Save.data.xray || Engine.mode === 'super');
    return {
      handNo: Engine.handNo,
      sb: Engine.cfg.SB, bb: Engine.cfg.BB,
      mode: Engine.mode,
      online: !!Engine.online,
      levelN: Engine.isTourney() ? Engine.level() + 1 : 0,
      left: Engine.seated().length,
      pot: Engine.pot(),
      board: Engine.board.slice(),
      button: Engine.button,
      you: forSeat,
      seats: Engine.seats.map(p => ({
        i: p.i, name: p.name, emoji: p.emoji,
        stack: p.stack, bet: p.bet,
        folded: p.folded, allin: p.allin, out: p.out, finish: p.finish,
        lastAction: p.lastAction, winAmt: p.winAmt, turn: !!p.turn,
        isYou: p.i === forSeat,
        cards: p.cards.length
          ? ((p.i === forSeat || p.revealed || xray) ? p.cards.slice() : p.cards.map(() => null))
          : [],
      })),
    };
  },

  update(){
    UI.render(UI.buildView(0, false));
  },

  placeStr(n){ return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); },

  goMode(m){
    location.hash = m;
    location.reload();
  },

  render(view){
    UI.lastView = view;
    const e = UI.els;
    const onlineTag = view.online ? '🌐 ' : '';
    if (view.mode === 'tourney' || view.mode === 'super'){
      e.blinds.textContent = (view.mode === 'super' ? '⚡' : '') + 'Lvl ' + view.levelN + ' · ' + view.sb + '/' + view.bb;
      e.handNo.textContent = (view.handNo ? 'Hand #' + view.handNo + ' · ' : '') + view.left + ' left';
    } else {
      e.blinds.textContent = onlineTag + 'Blinds ' + view.sb + '/' + view.bb;
      e.handNo.textContent = view.handNo ? 'Hand #' + view.handNo : '';
    }
    if (e.eye){
      e.eye.style.display = view.online ? 'none' : '';
      e.eye.classList.toggle('on', !view.online && (Save.data.xray || view.mode === 'super'));
    }
    // pot + board
    e.pot.innerHTML = '';
    if (view.pot > 0){
      e.pot.appendChild(UI.chipStackEl(view.pot, false));
      const t = document.createElement('span');
      t.textContent = 'Pot $' + view.pot;
      e.pot.appendChild(t);
    }
    e.board.innerHTML = '';
    view.board.forEach((c, bi) => e.board.appendChild(UI.cardEl(c, false, 'b' + bi, view.handNo)));
    // seats (rotated so your seat is at the bottom)
    e.seats.innerHTML = '';
    for (const p of view.seats){
      const posIdx = (p.i - view.you + view.seats.length) % view.seats.length;
      const pos = UI.SEAT_POS[posIdx] || UI.SEAT_POS[0];
      const d = document.createElement('div');
      d.className = 'seat' + (p.isYou ? ' hero' : '') +
        ((p.folded || p.out) ? ' folded' : '') + (p.turn ? ' turn' : '') + (p.winAmt > 0 ? ' winner' : '');
      d.style.left = pos.x + '%';
      d.style.top = pos.y + '%';

      const cards = document.createElement('div');
      cards.className = 'cards';
      if (p.cards.length && !p.folded){
        p.cards.forEach((c, ci) => cards.appendChild(UI.cardEl(c, !p.isYou, 'h' + p.i + ':' + ci, view.handNo)));
      }
      if (p.isYou) d.appendChild(cards);

      const ava = document.createElement('div');
      ava.className = 'ava';
      ava.textContent = p.emoji;
      if (view.button === p.i){
        const db = document.createElement('div');
        db.className = 'dbtn';
        db.textContent = 'D';
        db.style.right = '-6px';
        db.style.bottom = '-4px';
        ava.appendChild(db);
      }
      d.appendChild(ava);

      const nm = document.createElement('div');
      nm.className = 'nm';
      nm.textContent = p.name;
      d.appendChild(nm);
      const stk = document.createElement('div');
      stk.className = 'stk';
      stk.textContent = p.out ? '—' : '$' + p.stack;
      d.appendChild(stk);
      if (p.isYou && view.button === p.i){
        const db = document.createElement('div');
        db.className = 'dbtn';
        db.style.right = '8px';
        db.style.top = '0';
        db.textContent = 'D';
        d.appendChild(db);
      }
      if (!p.isYou) d.appendChild(cards);

      const act = document.createElement('div');
      act.className = 'act';
      act.textContent = p.out ? 'OUT · ' + UI.placeStr(p.finish)
        : (p.allin && !p.folded ? 'ALL-IN' : (p.lastAction || ''));
      d.appendChild(act);

      // hand label when cards are visible (x-ray or showdown)
      if (!p.isYou && !p.folded && !p.out && p.cards.length &&
          p.cards[0] !== null && view.board.length >= 3){
        const h = document.createElement('div');
        h.className = 'hint';
        h.textContent = Cards.handName(UI.evalAvail(p.cards.concat(view.board)));
        d.appendChild(h);
      }

      if (p.bet > 0){
        const bc = UI.chipStackEl(p.bet);
        bc.className += ' betchips';
        if (pos.y < 50) bc.style.top = '100%';
        else bc.style.bottom = '100%';
        d.appendChild(bc);
      }
      if (p.winAmt > 0){
        const w = document.createElement('div');
        w.className = 'winamt';
        w.textContent = '+$' + p.winAmt;
        d.appendChild(w);
      }
      e.seats.appendChild(d);
    }
  },

  log(msg){
    UI.els.log.textContent = msg;
    UI.els.log.style.opacity = 1;
    clearTimeout(UI.logTimer);
    UI.logTimer = setTimeout(() => { UI.els.log.style.opacity = 0.45; }, 2600);
  },

  toast(m){
    const t = UI.els.toast;
    if (!t) return;
    t.textContent = m;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2800);
  },

  // ---- panels ----
  openPanel(title){
    UI.els.panelTitle.textContent = title;
    UI.els.panel.classList.remove('hidden');
    UI.els.panelBody.innerHTML = '';
    return UI.els.panelBody;
  },
  closePanel(){ UI.els.panel.classList.add('hidden'); },
  row(html){
    const d = document.createElement('div');
    d.className = 'row';
    d.innerHTML = html;
    return d;
  },
  btnRow(b, label, cls, fn){
    const r = UI.row('<button class="btn ' + cls + '" style="width:100%">' + label + '</button>');
    r.querySelector('button').onclick = fn;
    b.appendChild(r);
    return r.querySelector('button');
  },

  showMenu(){
    if (typeof Net !== 'undefined' && (Net.active || Net.guestMode)) return UI.showNetMenu();
    if (typeof Net !== 'undefined' && Net.setupMode) return UI.showOnlineSetup();
    const b = UI.openPanel(Engine.mode === 'super' ? '☰ ⚡ Super Turbo' : Engine.mode === 'tourney' ? '☰ Sit & Go' : '☰ Cash Game');
    const st = Save.data.stats;
    if (Engine.isTourney()){
      b.appendChild(UI.row('<div class="grow">Tournament chips</div><b style="color:#86efac">$' + Engine.human().stack + '</b>'));
      b.appendChild(UI.row('<div class="grow">Bankroll (outside)</div><div>$' + Save.data.bank + '</div>'));
      b.appendChild(UI.row('<div class="grow">Players left</div><div>' + Engine.seated().length + ' / 5</div>'));
      b.appendChild(UI.row('<div class="grow">Payouts</div><div>$' + Engine.prizes().join(' / $') + '</div>'));
    } else {
      b.appendChild(UI.row('<div class="grow">Bankroll</div><b style="color:#86efac">$' + Engine.human().stack + '</b>'));
    }
    b.appendChild(UI.row('<div class="grow">Hands played</div><div>' + st.hands + '</div>'));
    b.appendChild(UI.row('<div class="grow">Hands won</div><div>' + st.wins + '</div>'));
    b.appendChild(UI.row('<div class="grow">Biggest pot won</div><div>$' + st.biggest + '</div>'));
    b.appendChild(UI.row('<div class="grow">Tournaments / titles</div><div>' + (st.tourneys || 0) + ' / 🏆' + (st.titles || 0) + '</div>'));
    UI.btnRow(b, '❓ How to play', 'gray', () => UI.showHelp());
    if (Engine.isTourney()){
      const ab = UI.btnRow(b, '🚪 Abandon tournament (no refund)', 'red', () => {
        if (ab.dataset.armed) location.href = '../';
        else { ab.dataset.armed = '1'; ab.textContent = 'Tap to confirm'; }
      });
    } else {
      const nb = UI.btnRow(b, '🔄 New table (reset all stacks)', 'red', () => {
        if (nb.dataset.armed){
          Save.data.bank = Engine.cfg.STACK;
          Save.save();
          Engine.init(Engine.cfg.STACK, 'cash');
          Engine.start();
          UI.closePanel();
          UI.toast('Fresh table — good luck!');
        } else {
          nb.dataset.armed = '1';
          nb.textContent = 'Tap to confirm';
        }
      });
    }
    UI.btnRow(b, '🃏 Back to lobby', 'gray', () => { location.href = '../'; });
  },

  showNetMenu(){
    const b = UI.openPanel('☰ 🌐 Online table');
    b.appendChild(UI.row('<div class="grow">Room code</div><b style="letter-spacing:3px;color:#fbbf24">' + Net.room + '</b>'));
    b.appendChild(UI.row('<div class="grow">You are</div><div>' + (Net.isHost ? 'Host (dealer)' : 'Guest') + '</div>'));
    if (Net.isHost) b.appendChild(UI.row('<div class="grow">Connected players</div><div>' + (Net.players().length + 1) + '</div>'));
    b.appendChild(UI.row('<div class="sub grow">Share the room code — friends pick Online → Join on the lobby page. Online chips are play money, separate from your bankroll.</div>'));
    const lv = UI.btnRow(b, '🚪 Leave table', 'red', () => {
      if (lv.dataset.armed) location.href = '../';
      else { lv.dataset.armed = '1'; lv.textContent = 'Tap to confirm'; }
    });
  },

  // ---- online setup ----
  // opened from an invite link (#join=CODE)
  showInvitePanel(code){
    const b = UI.openPanel('🌐 You\'re invited!');
    b.appendChild(UI.row('<div class="grow" style="text-align:center">Room <b style="letter-spacing:4px;color:#fbbf24;font-size:20px">' + code + '</b> is waiting for you.</div>'));
    b.appendChild(UI.row('<div class="grow">Your name</div><input id="onName" maxlength="10" style="background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;padding:8px;width:130px" value="' + (Save.data.name || 'Player') + '">'));
    UI.btnRow(b, '🪑 Sit down at the table', '', () => {
      const name = (document.getElementById('onName').value || 'Player').slice(0, 10);
      Save.data.name = name;
      Save.save();
      Net.join(code, name);
    });
    UI.btnRow(b, '🃏 No thanks — lobby', 'gray', () => { location.href = '../'; });
  },

  // clipboard unavailable: show the link to copy manually
  showLinkPanel(url){
    const b = UI.openPanel('🔗 Invite link');
    b.appendChild(UI.row('<input readonly id="invUrl" value="' + url + '" style="background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;padding:8px;width:100%;font-size:12px" onclick="this.select()">'));
    b.appendChild(UI.row('<div class="sub grow">Long-press (or tap) to select, then copy and send it.</div>'));
    UI.btnRow(b, '← Back to room', 'gray', () => UI.showRoomPanel());
  },

  showOnlineSetup(){
    const b = UI.openPanel('🌐 Play online with friends');
    b.appendChild(UI.row('<div class="grow">Your name</div><input id="onName" maxlength="10" style="background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;padding:8px;width:130px" value="' + (Save.data.name || 'Player') + '">'));
    UI.btnRow(b, '🎲 Create a room (you deal)', '', () => {
      const name = (document.getElementById('onName').value || 'Player').slice(0, 10);
      Save.data.name = name;
      Save.save();
      Net.host(name);
    });
    b.appendChild(UI.row('<div class="grow">Join with a code</div><input id="onCode" maxlength="6" placeholder="AB12" style="background:#1e293b;border:1px solid #334155;color:#fff;border-radius:8px;padding:8px;width:90px;text-transform:uppercase;letter-spacing:2px">'));
    UI.btnRow(b, '🔌 Join room', 'gray', () => {
      const name = (document.getElementById('onName').value || 'Player').slice(0, 10);
      const code = (document.getElementById('onCode').value || '').toUpperCase().trim();
      if (code.length < 3){ UI.toast('Enter the room code your friend shared'); return; }
      Save.data.name = name;
      Save.save();
      Net.join(code, name);
    });
    b.appendChild(UI.row('<div class="sub grow">Up to 4 friends join with the code; empty seats get bots. Peer-to-peer (WebRTC) — the host\'s device deals.</div>'));
    UI.btnRow(b, '🃏 Back to lobby', 'gray', () => { location.href = '../'; });
  },

  showRoomPanel(){
    const b = UI.openPanel('🎲 Room ' + Net.room);
    b.appendChild(UI.row('<div class="grow" style="text-align:center;font-size:26px;letter-spacing:8px;color:#fbbf24"><b>' + Net.room + '</b></div>'));
    UI.btnRow(b, '🔗 Share invite link', '', () => Net.share());
    b.appendChild(UI.row('<div class="sub grow" style="text-align:center">…or tell them the code: lobby → Online → Join.</div>'));
    const list = Net.players();
    b.appendChild(UI.row('<div class="grow">1. ' + (Save.data.name || 'You') + ' (host)</div><div>✅</div>'));
    list.forEach((pl, i) => b.appendChild(UI.row('<div class="grow">' + (i + 2) + '. ' + pl.name + '</div><div>✅</div>')));
    for (let i = list.length + 1; i < 5; i++)
      b.appendChild(UI.row('<div class="grow sub">' + (i + 1) + '. waiting… (bot if empty)</div>'));
    UI.btnRow(b, '▶ Start the game (' + (list.length + 1) + ' player' + (list.length ? 's' : '') + ' + bots)', '', () => {
      Net.startGame();
      UI.closePanel();
    });
    UI.btnRow(b, '🃏 Cancel', 'gray', () => { location.href = '../'; });
  },

  tourneyEnd(place, prize){
    const b = UI.openPanel('🏆 Tournament over');
    const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '💀';
    b.appendChild(UI.row('<div class="grow" style="font-size:18px">' + medal + ' You finished <b>' +
      UI.placeStr(place) + '</b> of 5</div>'));
    b.appendChild(UI.row('<div class="grow">Prize</div><b style="color:' + (prize > 0 ? '#86efac' : '#f87171') + '">' +
      (prize > 0 ? '+$' + prize : '—') + '</b>'));
    b.appendChild(UI.row('<div class="grow">Bankroll</div><div>$' + Save.data.bank + '</div>'));
    if (Engine.mode === 'super')
      UI.btnRow(b, '⚡ Another Super Turbo ($' + Engine.SUPER_BUYIN + ')', '', () => UI.goMode('super'));
    else
      UI.btnRow(b, '🔁 Play another Sit & Go ($' + Engine.BUYIN + ')', '', () => UI.goMode('tourney'));
    UI.btnRow(b, '💵 Switch to cash game', 'gray', () => UI.goMode('cash'));
    UI.btnRow(b, '🃏 Back to lobby', 'gray', () => { location.href = '../'; });
  },

  showHelp(){
    const b = UI.openPanel('❓ How to play');
    const d = document.createElement('div');
    d.className = 'help';
    d.innerHTML =
      '<p><b>No-Limit Texas Hold\'em</b> — pick your table:</p>' +
      '<p><b>💵 Cash game:</b> blinds stay $10/$20, you sit with your bankroll, leave anytime. Bust and you get a fresh $2,000.</p>' +
      '<p><b>🏆 Sit & Go tournament:</b> $200 buy-in, everyone starts with $1,500 in chips, blinds rise every 6 hands. No rebuys — lose your chips and you\'re out. Top 3 of 5 are paid: $600 / $300 / $100.</p>' +
      '<p><b>⚡ Super Turbo:</b> $100 buy-in, just 500 chips, blinds rocket every 2 hands and you get <b>3 seconds</b> to act (the clock auto-checks or folds for you). Everyone\'s cards are face up. Top 3 paid $300 / $150 / $50.</p>' +
      '<p><b>🌐 Online:</b> create a room and share the 4-letter code — up to four friends join from their own phones, peer-to-peer. Empty seats get bots; 25-second action clock.</p>' +
      '<p><b>Each hand:</b> you get 2 hole cards. Five community cards arrive on the flop (3), turn (1) and river (1). The best 5-card hand from your 7 wins.</p>' +
      '<p><b>Your turn:</b> Fold, Check/Call, or Bet/Raise. The raise panel has a slider plus Min, ½ Pot, Pot and All-in shortcuts.</p>' +
      '<p><b>Hand ranks</b> (high → low): Royal/Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Pair, High Card.</p>' +
      '<p><b>The bots</b> have personalities — 🐗 Rocco bluffs a lot, 🐻 Viktor only plays strong cards. Watch their habits.</p>' +
      '<p><b>👁 X-ray:</b> tap the eye in the top bar to play with everyone\'s cards face up — great for learning. The bots don\'t peek at yours. (Disabled online.)</p>' +
      '<p>Side pots are handled correctly when someone is all-in — you can only win what you matched.</p>';
    b.appendChild(d);
  },
};

/* ===== net.js ===== */
/* global Peer */
// Peer-to-peer online play (PeerJS / WebRTC, free public broker).
// The host's browser runs the Engine authoritatively; guests receive
// sanitized per-seat views and send their actions back.
const Net = {
  PREFIX: 'tinypoker-room-',
  peer: null,
  room: '',
  isHost: false,
  active: false,      // host: game running with remote players
  guestMode: false,   // this client is a guest at someone else's table
  setupMode: false,   // online setup screens are showing
  started: false,
  conns: [],          // host: [{conn, name, seat}]
  pending: new Map(), // host: seat -> action resolver
  guestConn: null,
  guestActing: false,
  _gotView: false,

  EMOJIS: ['😎', '🤠', '👽', '🤖', '🐵'],

  players(){ return Net.conns.filter(c => c.conn.open); },
  isAlive(conn){ return conn && conn.open; },

  inviteUrl(){
    return location.href.split('#')[0] + '#join=' + Net.room;
  },

  share(){
    const url = Net.inviteUrl();
    const done = () => UI.toast('Invite link copied — send it to your friends!');
    if (navigator.share){
      navigator.share({ title: 'Tiny Poker', text: 'Join my poker table — room ' + Net.room, url }).catch(() => {});
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(url).then(done).catch(() => UI.showLinkPanel(url));
      return;
    }
    UI.showLinkPanel(url);
  },

  code(){
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[(Math.random() * chars.length) | 0];
    return s;
  },

  // ---------- host ----------
  host(name){
    if (typeof Peer === 'undefined'){ UI.toast('Connection library failed to load — reload the page'); return; }
    Net.room = Net.code();
    Net.isHost = true;
    UI.toast('Creating room…');
    Net.peer = new Peer(Net.PREFIX + Net.room);
    Net.peer.on('open', () => UI.showRoomPanel());
    Net.peer.on('error', e => {
      if (e.type === 'unavailable-id'){ Net.host(name); return; } // code collision: reroll
      console.warn(e);
      UI.toast('Connection problem: ' + e.type + ' — try again');
    });
    Net.peer.on('connection', conn => {
      conn.on('data', d => Net.hostData(conn, d));
      conn.on('close', () => Net.dropGuest(conn));
      conn.on('error', () => Net.dropGuest(conn));
    });
  },

  hostData(conn, d){
    if (!d || typeof d !== 'object') return;
    if (d.t === 'hello'){
      if (Net.started){ conn.send({ t: 'full' }); conn.close(); return; }
      if (Net.conns.length >= 4){ conn.send({ t: 'full' }); conn.close(); return; }
      Net.conns.push({ conn, name: ('' + (d.name || 'Guest')).slice(0, 10), seat: -1 });
      conn.send({ t: 'welcome', room: Net.room });
      if (!Net.started) UI.showRoomPanel();
      return;
    }
    if (d.t === 'action'){
      const entry = Net.conns.find(c => c.conn === conn);
      if (!entry || entry.seat < 0) return;
      const res = Net.pending.get(entry.seat);
      if (res){
        Net.pending.delete(entry.seat);
        res(d.a);
      }
    }
  },

  dropGuest(conn){
    const entry = Net.conns.find(c => c.conn === conn);
    if (!entry) return;
    Net.conns = Net.conns.filter(c => c !== entry);
    if (Net.started && entry.seat >= 0){
      const p = Engine.seats[entry.seat];
      if (p){
        p.remote = null;
        p.name = entry.name + '🤖';
        Engine.hooks.log(entry.name + ' disconnected — a bot takes over');
      }
      const res = Net.pending.get(entry.seat);
      if (res){
        Net.pending.delete(entry.seat);
        res(null); // engine falls back to AI/fold
      }
    } else if (!Net.started){
      UI.showRoomPanel();
    }
  },

  startGame(){
    Net.started = true;
    Net.active = true;
    Net.setupMode = false;
    Engine.init(Engine.cfg.STACK, 'cash');
    Engine.online = true;
    const hero = Engine.human();
    hero.name = (Save.data.name || 'Host').slice(0, 10);
    Net.players().forEach((entry, k) => {
      const seat = Engine.seats[k + 1];
      entry.seat = seat.i;
      seat.name = entry.name;
      seat.emoji = Net.EMOJIS[k % Net.EMOJIS.length];
      seat.remote = entry;
      seat.isHuman = false;
    });
    // wrap hooks to broadcast
    const baseUpdate = Engine.hooks.update;
    Engine.hooks.update = () => { baseUpdate(); Net.broadcast(); };
    const baseLog = Engine.hooks.log;
    Engine.hooks.log = m => {
      baseLog(m);
      for (const e of Net.players()) e.conn.send({ t: 'log', m });
    };
    Engine.start();
  },

  broadcast(){
    for (const e of Net.players()){
      if (e.seat >= 0) e.conn.send({ t: 'view', v: UI.buildView(e.seat, true) });
    }
  },

  // host: ask a remote player for their action
  requestAction(p, ctx){
    const entry = p.remote;
    if (!entry || !Net.isAlive(entry.conn)) return Promise.resolve(null);
    const sendCtx = {
      toCall: ctx.toCall, pot: ctx.pot, minTo: ctx.minTo, maxTo: ctx.maxTo,
      bb: ctx.bb, canRaise: ctx.canRaise, stack: ctx.stack, bet: ctx.bet,
      online: true,
    };
    entry.conn.send({ t: 'act', ctx: sendCtx });
    return new Promise(res => {
      Net.pending.set(p.i, res);
      setTimeout(() => {
        if (Net.pending.get(p.i) === res){
          Net.pending.delete(p.i);
          Engine.hooks.log(p.name + ' timed out');
          res({ type: ctx.toCall > 0 ? 'fold' : 'check' });
        }
      }, 30000);
    });
  },

  // ---------- guest ----------
  join(room, name){
    if (typeof Peer === 'undefined'){ UI.toast('Connection library failed to load — reload the page'); return; }
    Net.room = room;
    Net.guestMode = true;
    Net.setupMode = false;
    UI.toast('Connecting to room ' + room + '…');
    Net.peer = new Peer();
    Net.peer.on('error', e => {
      console.warn(e);
      if (e.type === 'peer-unavailable') UI.toast('Room ' + room + ' not found — check the code');
      else UI.toast('Connection problem: ' + e.type);
      Net.guestMode = false;
      Net.setupMode = true;
      UI.showOnlineSetup();
    });
    Net.peer.on('open', () => {
      const conn = Net.peer.connect(Net.PREFIX + room, { reliable: true });
      Net.guestConn = conn;
      conn.on('open', () => conn.send({ t: 'hello', name }));
      conn.on('data', d => Net.guestData(d));
      conn.on('close', () => {
        UI.toast('Host left the table');
        setTimeout(() => { location.href = '../'; }, 1800);
      });
    });
  },

  guestData(d){
    if (!d || typeof d !== 'object') return;
    if (d.t === 'welcome'){
      const b = UI.openPanel('🌐 Room ' + Net.room);
      b.appendChild(UI.row('<div class="grow" style="text-align:center">Connected! Waiting for the host to start…</div>'));
      return;
    }
    if (d.t === 'full'){
      UI.toast('That table is full or already playing');
      Net.guestMode = false;
      Net.setupMode = true;
      UI.showOnlineSetup();
      return;
    }
    if (d.t === 'view'){
      if (!Net._gotView){ Net._gotView = true; UI.closePanel(); }
      UI.render(d.v);
      return;
    }
    if (d.t === 'log'){
      UI.log(d.m);
      return;
    }
    if (d.t === 'act'){
      if (Net.guestActing) return;
      Net.guestActing = true;
      d.ctx.online = true;
      UI.human(d.ctx).then(a => {
        Net.guestActing = false;
        if (Net.guestConn && Net.guestConn.open) Net.guestConn.send({ t: 'action', a });
      });
    }
  },
};


/* ===== main.js ===== */
(function(){
  window.addEventListener('load', () => {
    const first = !Save.load();
    // mode comes from ?mode= or #hash — the hash survives CDN interstitials
    const qp = new URLSearchParams(location.search).get('mode');
    const hp = (location.hash || '').replace(/^#(mode=)?/, '');
    let mq = qp || hp;
    let invite = null;
    const jm = hp.match(/^join=([A-Za-z0-9]{3,8})$/);
    if (jm){ invite = jm[1].toUpperCase(); mq = 'online'; }
    const mode = (mq === 'tourney' || mq === 'super' || mq === 'online') ? mq : 'cash';
    UI.init();

    if (mode !== 'cash' && mode !== 'online'){
      const buyin = mode === 'super' ? Engine.SUPER_BUYIN : Engine.BUYIN;
      if (Save.data.bank < buyin) Save.data.bank = buyin; // never lock the player out
      Save.data.bank -= buyin;
      Save.data.stats.tourneys = (Save.data.stats.tourneys || 0) + 1;
      Save.save();
    }
    Engine.init(Save.data.bank, mode === 'online' ? 'cash' : mode);

    Engine.hooks.update = UI.update;
    Engine.hooks.log = m => UI.log(m);
    Engine.hooks.human = ctx => UI.human(ctx);
    Engine.hooks.handStart = () => {
      Save.data.stats.hands++;
    };
    Engine.hooks.handEnd = () => {
      const hero = Engine.human();
      if (hero.winAmt > 0){
        Save.data.stats.wins++;
        if (hero.winAmt > Save.data.stats.biggest) Save.data.stats.biggest = hero.winAmt;
      }
      if (Engine.mode === 'cash' && !Engine.online) Save.data.bank = hero.stack;
      Save.save();
    };
    Engine.hooks.tourneyEnd = (place, prize) => {
      Save.data.bank += prize;
      if (place === 1) Save.data.stats.titles = (Save.data.stats.titles || 0) + 1;
      Save.save();
      UI.tourneyEnd(place, prize);
    };

    window.addEventListener('resize', () => UI.update());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Save.save();
    });
    if (mode === 'online'){
      Net.setupMode = true;
      if (invite) UI.showInvitePanel(invite);
      else UI.showOnlineSetup();
    } else {
      Engine.start();
      if (mode === 'tourney') UI.toast('Sit & Go started — $' + Engine.BUYIN + ' buy-in, top 3 paid');
      if (mode === 'super') UI.toast('⚡ SUPER TURBO — 3s to act, all cards face up, blinds fly!');
      if (first) UI.showHelp();
    }
  });
})();
