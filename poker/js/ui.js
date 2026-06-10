'use strict';
const UI = {
  els: {},
  _res: null,
  _ctx: null,
  _raiseTo: 0,
  toastTimer: null,
  logTimer: null,

  // seat positions (percent of #table), hero last
  SEAT_POS: [
    { x: 50, y: 78 },  // hero (seat 0)
    { x: 13, y: 56 },
    { x: 20, y: 22 },
    { x: 80, y: 22 },
    { x: 87, y: 56 },
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
        const hero = Engine.human();
        let to = c.minTo;
        if (b.dataset.q === 'half') to = c.toCall + hero.bet + Math.round((c.pot + c.toCall) * 0.5);
        else if (b.dataset.q === 'pot') to = c.toCall + hero.bet + (c.pot + c.toCall);
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
    e.btnCall.textContent = ctx.toCall > 0 ? 'Call $' + Math.min(ctx.toCall, Engine.human().stack) : 'Check';
    e.btnRaise.textContent = ctx.toCall > 0 ? 'Raise' : 'Bet';
    e.btnRaise.style.display = ctx.canRaise ? '' : 'none';
    e.actInfo.textContent = 'Pot $' + ctx.pot + (ctx.toCall > 0 ? ' · $' + ctx.toCall + ' to call' : '');
    const bar = document.getElementById('timerBar');
    const fill = document.getElementById('timerFill');
    if (Engine.mode === 'super' && bar && fill){
      bar.classList.remove('hidden');
      fill.style.transition = 'none';
      fill.style.width = '100%';
      void fill.offsetWidth;
      fill.style.transition = 'width 3s linear';
      fill.style.width = '0%';
      UI._timerTO = setTimeout(() => {
        UI.toast(ctx.toCall > 0 ? '⏰ Time! You fold' : '⏰ Time! You check');
        UI.act({ type: ctx.toCall > 0 ? 'fold' : 'check' });
      }, 3000);
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

  cardEl(c, sm){
    const d = document.createElement('div');
    if (c === null){
      d.className = 'card back' + (sm ? ' sm' : '');
      return d;
    }
    d.className = 'card ' + (Cards.isRed(c) ? 'red' : 'black') + (sm ? ' sm' : '');
    d.innerHTML = '<span class="cr">' + Cards.rankStr(c) + '</span><span class="cs">' + Cards.suitStr(c) + '</span>';
    return d;
  },

  update(){
    const e = UI.els;
    if (Engine.isTourney()){
      const left = Engine.seated().length;
      e.blinds.textContent = (Engine.mode === 'super' ? '⚡' : '') + 'Lvl ' + (Engine.level() + 1) + ' · ' + Engine.cfg.SB + '/' + Engine.cfg.BB;
      e.handNo.textContent = (Engine.handNo ? 'Hand #' + Engine.handNo + ' · ' : '') + left + ' left';
    } else {
      e.blinds.textContent = 'Blinds ' + Engine.cfg.SB + '/' + Engine.cfg.BB;
      e.handNo.textContent = Engine.handNo ? 'Hand #' + Engine.handNo : '';
    }
    if (e.eye) e.eye.classList.toggle('on', Save.data.xray || Engine.mode === 'super');
    // pot + board
    const pot = Engine.pot();
    e.pot.textContent = pot > 0 ? 'Pot  $' + pot : '';
    e.board.innerHTML = '';
    for (const c of Engine.board) e.board.appendChild(UI.cardEl(c));
    // seats
    e.seats.innerHTML = '';
    const tw = e.seats.parentElement.clientWidth, th = e.seats.parentElement.clientHeight;
    Engine.seats.forEach((p, i) => {
      const pos = UI.SEAT_POS[i] || UI.SEAT_POS[0];
      const d = document.createElement('div');
      d.className = 'seat' + (p.isHuman ? ' hero' : '') +
        ((p.folded || p.out) ? ' folded' : '') + (p.turn ? ' turn' : '') + (p.winAmt > 0 ? ' winner' : '');
      d.style.left = pos.x + '%';
      d.style.top = pos.y + '%';

      const cards = document.createElement('div');
      cards.className = 'cards';
      if (p.cards.length && !p.folded){
        const show = p.isHuman || p.revealed || Save.data.xray || Engine.mode === 'super';
        for (const c of p.cards) cards.appendChild(UI.cardEl(show ? c : null, !p.isHuman));
      }
      if (p.isHuman) d.appendChild(cards);

      const ava = document.createElement('div');
      ava.className = 'ava';
      ava.textContent = p.emoji;
      if (Engine.button === i){
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
      if (p.isHuman && Engine.button === i){
        const db = document.createElement('div');
        db.className = 'dbtn';
        db.style.right = '8px';
        db.style.top = '0';
        db.textContent = 'D';
        d.appendChild(db);
      }
      if (!p.isHuman) d.appendChild(cards);

      const act = document.createElement('div');
      act.className = 'act';
      act.textContent = p.out ? 'OUT · ' + Engine.place(p.finish)
        : (p.allin && !p.folded ? 'ALL-IN' : (p.lastAction || ''));
      d.appendChild(act);

      if ((Save.data.xray || Engine.mode === 'super') && !p.isHuman && !p.folded && !p.out &&
          p.cards.length && Engine.board.length >= 3){
        const h = document.createElement('div');
        h.className = 'hint';
        h.textContent = Cards.handName(UI.evalAvail(p.cards.concat(Engine.board)));
        d.appendChild(h);
      }

      if (p.bet > 0){
        const bc = document.createElement('div');
        bc.className = 'betchip';
        bc.textContent = '$' + p.bet;
        // chip floats toward table center
        bc.style.left = '50%';
        bc.style.transform = 'translateX(-50%)';
        if (pos.y < 50) bc.style.bottom = '-20px';
        else bc.style.top = p.isHuman ? '-20px' : '-18px';
        d.appendChild(bc);
      }
      if (p.winAmt > 0){
        const w = document.createElement('div');
        w.className = 'winamt';
        w.textContent = '+$' + p.winAmt;
        d.appendChild(w);
      }
      e.seats.appendChild(d);
    });
  },

  log(msg){
    UI.els.log.textContent = msg;
    UI.els.log.style.opacity = 1;
    clearTimeout(UI.logTimer);
    UI.logTimer = setTimeout(() => { UI.els.log.style.opacity = 0.45; }, 2600);
  },

  toast(m){
    const t = UI.els.toast;
    t.textContent = m;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2600);
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

  showMenu(){
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
    const mk = (label, cls, fn) => {
      const r = UI.row('<button class="btn ' + cls + '" style="width:100%">' + label + '</button>');
      r.querySelector('button').onclick = fn;
      b.appendChild(r);
      return r.querySelector('button');
    };
    mk('❓ How to play', 'gray', () => UI.showHelp());
    if (Engine.isTourney()){
      const ab = mk('🚪 Abandon tournament (no refund)', 'red', () => {
        if (ab.dataset.armed) location.href = '../';
        else { ab.dataset.armed = '1'; ab.textContent = 'Tap to confirm'; }
      });
    } else {
      const nb = mk('🔄 New table (reset all stacks)', 'red', () => {
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
    mk('🃏 Back to lobby', 'gray', () => { location.href = '../'; });
  },

  tourneyEnd(place, prize){
    const b = UI.openPanel('🏆 Tournament over');
    const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '💀';
    b.appendChild(UI.row('<div class="grow" style="font-size:18px">' + medal + ' You finished <b>' +
      Engine.place(place) + '</b> of 5</div>'));
    b.appendChild(UI.row('<div class="grow">Prize</div><b style="color:' + (prize > 0 ? '#86efac' : '#f87171') + '">' +
      (prize > 0 ? '+$' + prize : '—') + '</b>'));
    b.appendChild(UI.row('<div class="grow">Bankroll</div><div>$' + Save.data.bank + '</div>'));
    const mk = (label, cls, fn) => {
      const r = UI.row('<button class="btn ' + cls + '" style="width:100%">' + label + '</button>');
      r.querySelector('button').onclick = fn;
      b.appendChild(r);
    };
    if (Engine.mode === 'super')
      mk('⚡ Another Super Turbo ($' + Engine.SUPER_BUYIN + ')', '', () => { location.href = '?mode=super'; });
    else
      mk('🔁 Play another Sit & Go ($' + Engine.BUYIN + ')', '', () => { location.href = '?mode=tourney'; });
    mk('💵 Switch to cash game', 'gray', () => { location.href = '?mode=cash'; });
    mk('🃏 Back to lobby', 'gray', () => { location.href = '../'; });
  },

  showHelp(){
    const b = UI.openPanel('❓ How to play');
    const d = document.createElement('div');
    d.className = 'help';
    d.innerHTML =
      '<p><b>No-Limit Texas Hold\'em</b> against four bots, two ways to play:</p>' +
      '<p><b>💵 Cash game:</b> blinds stay $10/$20, you sit with your bankroll, leave anytime. Bust and you get a fresh $2,000.</p>' +
      '<p><b>🏆 Sit & Go tournament:</b> $200 buy-in, everyone starts with $1,500 in chips, blinds rise every 6 hands. No rebuys — lose your chips and you\'re out. Top 3 of 5 are paid: $600 / $300 / $100.</p>' +
      '<p><b>⚡ Super Turbo:</b> $100 buy-in, just 500 chips, blinds rocket every 2 hands and you get <b>3 seconds</b> to act (the clock auto-checks or folds for you). Everyone\'s cards are face up. Top 3 paid $300 / $150 / $50.</p>' +
      '<p><b>Each hand:</b> you get 2 hole cards. Five community cards arrive on the flop (3), turn (1) and river (1). The best 5-card hand from your 7 wins.</p>' +
      '<p><b>Your turn:</b> Fold, Check/Call, or Bet/Raise. The raise panel has a slider plus Min, ½ Pot, Pot and All-in shortcuts.</p>' +
      '<p><b>Hand ranks</b> (high → low): Royal/Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, Pair, High Card.</p>' +
      '<p><b>The bots</b> have personalities — 🐗 Rocco bluffs a lot, 🐻 Viktor only plays strong cards. Watch their habits.</p>' +
      '<p><b>👁 X-ray:</b> tap the eye in the top bar to play with everyone\'s cards face up — great for learning. The bots don\'t peek at yours.</p>' +
      '<p>Side pots are handled correctly when someone is all-in — you can only win what you matched.</p>';
    b.appendChild(d);
  },
};
