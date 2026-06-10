'use strict';
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
    b.appendChild(UI.row('<div class="sub grow" style="text-align:center">Share this code. Friends: lobby → Online → Join.</div>'));
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
      UI.btnRow(b, '⚡ Another Super Turbo ($' + Engine.SUPER_BUYIN + ')', '', () => { location.href = '?mode=super'; });
    else
      UI.btnRow(b, '🔁 Play another Sit & Go ($' + Engine.BUYIN + ')', '', () => { location.href = '?mode=tourney'; });
    UI.btnRow(b, '💵 Switch to cash game', 'gray', () => { location.href = '?mode=cash'; });
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
