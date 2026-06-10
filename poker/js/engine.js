'use strict';
// No-Limit Texas Hold'em engine, DOM-free. The UI (or a test harness)
// plugs in via Engine.hooks: update(), log(msg), human(ctx)->Promise<action>,
// handStart(), handEnd(), sleep(ms). Actions: {type:'fold'|'check'|'call'|
// 'raise', to} where `to` is the total street bet to raise to.
const Engine = {
  cfg: { SB: 10, BB: 20, STACK: 2000 },
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
    update(){}, log(){}, human: null, handStart(){}, handEnd(){},
    sleep: ms => new Promise(r => setTimeout(r, ms)),
  },

  BOTS: [
    { name: 'Maya', emoji: '🦊', tight: 0.95, aggr: 1.25 },
    { name: 'Viktor', emoji: '🐻', tight: 1.15, aggr: 0.7 },
    { name: 'Lena', emoji: '🦉', tight: 1.0, aggr: 1.0 },
    { name: 'Rocco', emoji: '🐗', tight: 0.85, aggr: 1.4 },
  ],

  init(humanStack){
    Engine.seats = [{
      i: 0, name: 'You', emoji: '🙂', isHuman: true,
      stack: humanStack || Engine.cfg.STACK,
      tight: 1, aggr: 1,
      cards: [], bet: 0, total: 0, folded: true, allin: false,
      acted: false, revealed: false, raises: 0, lastAction: '', winAmt: 0,
    }];
    Engine.BOTS.forEach((b, k) => {
      Engine.seats.push({
        i: k + 1, name: b.name, emoji: b.emoji, isHuman: false,
        stack: Engine.cfg.STACK, tight: b.tight, aggr: b.aggr,
        cards: [], bet: 0, total: 0, folded: true, allin: false,
        acted: false, revealed: false, raises: 0, lastAction: '', winAmt: 0,
      });
    });
    Engine.button = -1;
    Engine.handNo = 0;
  },

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
      Engine.hooks.handEnd();
      await Engine.hooks.sleep(2400);
    }
  },

  async playHand(gen){
    const H = Engine.hooks;
    Engine.handNo++;
    for (const p of Engine.seats){
      if (p.stack <= 0){
        p.stack = Engine.cfg.STACK;
        H.log((p.isHuman ? 'You receive' : p.name + ' receives') + ' a fresh $' + Engine.cfg.STACK + ' stack');
      }
      p.cards = []; p.bet = 0; p.total = 0;
      p.folded = false; p.allin = false; p.acted = false;
      p.revealed = false; p.raises = 0; p.lastAction = ''; p.winAmt = 0;
    }
    H.handStart();
    Engine.board = [];
    Engine.deck = Cards.deck();
    const n = Engine.seats.length;
    Engine.button = (Engine.button + 1) % n;
    const next = i => (i + 1) % n;
    let sb, bb;
    if (n === 2){ sb = Engine.button; bb = next(sb); }
    else { sb = next(Engine.button); bb = next(sb); }
    Engine.postBet(Engine.seats[sb], Engine.cfg.SB);
    Engine.seats[sb].lastAction = 'SB ' + Engine.seats[sb].bet;
    Engine.postBet(Engine.seats[bb], Engine.cfg.BB);
    Engine.seats[bb].lastAction = 'BB ' + Engine.seats[bb].bet;
    Engine.currentBet = Engine.cfg.BB;
    Engine.minRaise = Engine.cfg.BB;
    for (const p of Engine.seats){ p.cards = [Engine.deck.pop(), Engine.deck.pop()]; }
    Engine.street = 'preflop';
    H.update();
    await H.sleep(500);
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
      await H.sleep(800);
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
    await Engine.hooks.sleep(500 + Math.random() * 900);
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
    await H.sleep(900);
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
    await H.sleep(1100);
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
    await H.sleep(1400);
    return gen === Engine.gen ? 'ended' : 'aborted';
  },
};
