'use strict';
// BudgetTrip UI: hash-routed single-page app.
// #home | #new | #trip-<id> (+ App.tab for the trip sub-tab)
const App = {
  tab: 'budget',
  form: { dest: 'chiangmai', style: 'mid', nights: 3, people: 2, start: '', inclFlights: false },

  t(k){ return (I18N[Core.state.lang] || I18N.en)[k] || k; },
  dname(d){ return Core.state.lang === 'th' ? d.th : d.en; },

  init(){
    Core.load();
    document.getElementById('langBtn').onclick = () => {
      Core.state.lang = Core.state.lang === 'th' ? 'en' : 'th';
      Core.save();
      App.render();
    };
    window.addEventListener('hashchange', () => App.render());
    App.render();
  },

  go(h){ location.hash = h; },

  route(){
    const h = (location.hash || '#home').slice(1);
    const m = h.match(/^trip-(\d+)$/);
    if (m) return { view: 'trip', id: +m[1] };
    if (h === 'new') return { view: 'new' };
    return { view: 'home' };
  },

  el(html){
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.firstElementChild;
  },

  toast(m){
    const t = document.getElementById('toast');
    t.textContent = m;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    clearTimeout(App._tt);
    App._tt = setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2400);
  },

  render(){
    document.getElementById('langBtn').textContent = Core.state.lang === 'th' ? 'EN' : 'ไทย';
    document.getElementById('tagline').textContent = App.t('tagline');
    const r = App.route();
    const root = document.getElementById('view');
    root.innerHTML = '';
    if (r.view === 'new') root.appendChild(App.viewNew());
    else if (r.view === 'trip'){
      const trip = Core.trip(r.id);
      if (trip) root.appendChild(App.viewTrip(trip));
      else { App.go('home'); return; }
    } else root.appendChild(App.viewHome());
    window.scrollTo(0, 0);
  },

  // ---------- home ----------
  viewHome(){
    const w = App.el('<div></div>');
    const nb = App.el('<button class="bigbtn">' + App.t('newTrip') + '</button>');
    nb.onclick = () => App.go('new');
    w.appendChild(nb);
    w.appendChild(App.el('<h2 class="sect">' + App.t('myTrips') + '</h2>'));
    if (!Core.state.trips.length){
      w.appendChild(App.el('<div class="empty">🧳<br>' + App.t('noTrips') + '</div>'));
    }
    for (const trip of Core.state.trips){
      const d = Core.dest(trip);
      const total = Core.total(trip.budget);
      const sp = Core.spent(trip).total;
      const pct = total > 0 ? Math.min(100, Math.round(sp / total * 100)) : 0;
      const card = App.el(
        '<div class="tripcard">' +
        '<div class="tc-head"><span class="tc-emoji">' + d.emoji + '</span>' +
        '<div class="grow"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="tc-sub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' 🧍 · ' + App.t(trip.style === 'budget' ? 'sBudget' : trip.style === 'comfort' ? 'sComfort' : 'sMid') + '</div></div>' +
        '<div class="tc-amt">' + Core.fmt(total) + '</div></div>' +
        '<div class="bar"><div class="fill' + (sp > total ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="tc-sub">' + App.t('spent') + ' ' + Core.fmt(sp) + ' · ' + App.t('remaining') + ' ' + Core.fmt(total - sp) + '</div>' +
        '</div>');
      card.onclick = () => App.go('trip-' + trip.id);
      w.appendChild(card);
    }
    return w;
  },

  // ---------- new trip ----------
  viewNew(){
    const f = App.form;
    const w = App.el('<div></div>');
    w.appendChild(App.el('<h2 class="sect">' + App.t('where') + '</h2>'));
    const grid = App.el('<div class="destgrid"></div>');
    for (const key in DESTS){
      const d = DESTS[key];
      const b = App.el('<button class="dest' + (f.dest === key ? ' on' : '') + '"><span>' + d.emoji + '</span>' + App.dname(d) + '</button>');
      b.onclick = () => { f.dest = key; App.render(); };
      grid.appendChild(b);
    }
    w.appendChild(grid);

    const stepRow = (label, val, set, min, max) => {
      const r = App.el('<div class="row"><div class="grow">' + label + '</div>' +
        '<button class="step">−</button><b class="stepval">' + val + '</b><button class="step">＋</button></div>');
      const [minus, plus] = r.querySelectorAll('.step');
      minus.onclick = () => { set(Math.max(min, val - 1)); App.render(); };
      plus.onclick = () => { set(Math.min(max, val + 1)); App.render(); };
      return r;
    };
    w.appendChild(stepRow(App.t('nights'), f.nights, v => f.nights = v, 1, 30));
    w.appendChild(stepRow(App.t('people'), f.people, v => f.people = v, 1, 10));

    w.appendChild(App.el('<h2 class="sect">' + App.t('style') + '</h2>'));
    const seg = App.el('<div class="seg"></div>');
    [['budget', 'sBudget', '🎒'], ['mid', 'sMid', '🧢'], ['comfort', 'sComfort', '🥂']].forEach(([k, lk, em]) => {
      const b = App.el('<button class="' + (f.style === k ? 'on' : '') + '">' + em + ' ' + App.t(lk) + '</button>');
      b.onclick = () => { f.style = k; App.render(); };
      seg.appendChild(b);
    });
    w.appendChild(seg);

    const dr = App.el('<div class="row"><div class="grow">' + App.t('startDate') + '</div><input type="date" id="fStart" value="' + f.start + '"></div>');
    dr.querySelector('input').onchange = e => { f.start = e.target.value; };
    w.appendChild(dr);

    const d = DESTS[f.dest];
    if (d.flight){
      const fr = App.el('<div class="row"><div class="grow">' + App.t('inclFlights') + ' <span class="sub">(~' + Core.fmt(d.flight) + '/🧍)</span></div>' +
        '<input type="checkbox" class="chk" ' + (f.inclFlights ? 'checked' : '') + '></div>');
      fr.querySelector('input').onchange = e => { f.inclFlights = e.target.checked; };
      w.appendChild(fr);
    }

    // live preview
    const est = Core.estimate(f.dest, f.style, f.nights, f.people, f.inclFlights && !!d.flight);
    const tot = Core.total(est);
    w.appendChild(App.el('<div class="preview">' + Core.fmt(tot) + ' <span class="sub">· ' + Core.fmt(tot / f.people) + ' ' + App.t('perPerson') + '</span></div>'));

    const cb = App.el('<button class="bigbtn">' + App.t('create') + '</button>');
    cb.onclick = () => {
      const trip = Core.newTrip({ dest: f.dest, style: f.style, nights: f.nights, people: f.people, start: f.start, inclFlights: f.inclFlights && !!d.flight });
      App.tab = 'budget';
      App.go('trip-' + trip.id);
    };
    w.appendChild(cb);
    return w;
  },

  // ---------- trip ----------
  viewTrip(trip){
    const d = Core.dest(trip);
    const total = Core.total(trip.budget);
    const sp = Core.spent(trip);
    const w = App.el('<div></div>');

    const head = App.el(
      '<div class="triphead"><button class="back">←</button>' +
      '<div class="grow"><div class="tc-name">' + d.emoji + ' ' + App.dname(d) + '</div>' +
      '<div class="tc-sub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' 🧍' + (trip.start ? ' · ' + trip.start : '') + '</div></div>' +
      '<button class="iconb" id="shareB">📤</button></div>');
    head.querySelector('.back').onclick = () => App.go('home');
    head.querySelector('#shareB').onclick = () => App.shareTrip(trip);
    w.appendChild(head);

    const remaining = total - sp.total;
    w.appendChild(App.el(
      '<div class="bignums"><div><div class="bn-l">' + App.t('total') + '</div><div class="bn-v">' + Core.fmt(total) + '</div><div class="sub">' + Core.fmt(total / trip.people) + ' ' + App.t('perPerson') + '</div></div>' +
      '<div><div class="bn-l">' + App.t('spent') + '</div><div class="bn-v">' + Core.fmt(sp.total) + '</div></div>' +
      '<div><div class="bn-l">' + App.t('remaining') + '</div><div class="bn-v" style="color:' + (remaining < 0 ? '#e25555' : '#1f9d61') + '">' + Core.fmt(remaining) + '</div></div></div>'));

    const tabs = App.el('<div class="tabs"></div>');
    [['budget', 'budget'], ['expenses', 'expenses'], ['book', 'book']].forEach(([k, lk]) => {
      const b = App.el('<button class="' + (App.tab === k ? 'on' : '') + '">' + App.t(lk) + '</button>');
      b.onclick = () => { App.tab = k; App.render(); };
      tabs.appendChild(b);
    });
    w.appendChild(tabs);

    if (App.tab === 'expenses') w.appendChild(App.tabExpenses(trip));
    else if (App.tab === 'book') w.appendChild(App.tabBook(trip));
    else w.appendChild(App.tabBudget(trip));

    const del = App.el('<button class="dangerb">' + App.t('deleteTrip') + '</button>');
    del.onclick = () => {
      if (del.dataset.armed){ Core.deleteTrip(trip.id); App.go('home'); }
      else { del.dataset.armed = '1'; del.textContent = App.t('confirm'); }
    };
    w.appendChild(del);
    return w;
  },

  tabBudget(trip){
    const w = App.el('<div></div>');
    const sp = Core.spent(trip).by;
    w.appendChild(App.el('<div class="sub" style="margin:6px 2px">' + App.t('tapToEdit') + '</div>'));
    for (const c of CATS){
      const amt = trip.budget[c.id] || 0;
      if (!amt && c.id === 'flights') continue;
      const used = sp[c.id] || 0;
      const pct = amt > 0 ? Math.min(100, Math.round(used / amt * 100)) : (used > 0 ? 100 : 0);
      const r = App.el(
        '<div class="catrow"><div class="cr-top"><span>' + c.emoji + ' ' + App.t(c.id) + '</span>' +
        '<input class="amt" inputmode="numeric" value="' + amt + '"></div>' +
        '<div class="bar"><div class="fill' + (used > amt ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="sub">' + Core.fmt(used) + ' / ' + Core.fmt(amt) + '</div></div>');
      const inp = r.querySelector('.amt');
      inp.onchange = () => {
        trip.budget[c.id] = Math.max(0, parseInt(inp.value.replace(/[^0-9]/g, ''), 10) || 0);
        Core.save();
        App.render();
      };
      w.appendChild(r);
    }
    const re = App.el('<button class="ghostb">' + App.t('reestimate') + '</button>');
    re.onclick = () => {
      trip.budget = Core.estimate(trip.dest, trip.style, trip.nights, trip.people, trip.inclFlights);
      Core.save();
      App.render();
    };
    w.appendChild(re);
    return w;
  },

  tabExpenses(trip){
    const w = App.el('<div></div>');
    const add = App.el(
      '<div class="addbox"><div class="catchips"></div>' +
      '<div class="addrow"><input class="amt2" inputmode="numeric" placeholder="' + App.t('amount') + '">' +
      '<input class="note" placeholder="' + App.t('note') + '">' +
      '<button class="addb">' + App.t('addExpense') + '</button></div></div>');
    const chips = add.querySelector('.catchips');
    App._expCat = App._expCat || 'food';
    for (const c of CATS){
      const b = App.el('<button class="chip' + (App._expCat === c.id ? ' on' : '') + '">' + c.emoji + ' ' + App.t(c.id) + '</button>');
      b.onclick = () => { App._expCat = c.id; App.render(); };
      chips.appendChild(b);
    }
    add.querySelector('.addb').onclick = () => {
      const v = parseInt(add.querySelector('.amt2').value.replace(/[^0-9]/g, ''), 10);
      if (!v || v <= 0){ App.toast(App.t('amount')); return; }
      Core.addExpense(trip, App._expCat, v, add.querySelector('.note').value);
      App.render();
    };
    w.appendChild(add);

    if (!trip.expenses.length){
      w.appendChild(App.el('<div class="empty">🧾<br>' + App.t('noExpenses') + '</div>'));
      return w;
    }
    for (const e of trip.expenses){
      const c = CATS.find(q => q.id === e.cat) || CATS[6];
      const r = App.el('<div class="exprow"><span>' + c.emoji + '</span>' +
        '<div class="grow"><b>' + Core.fmt(e.amount) + '</b>' + (e.note ? ' <span class="sub">' + e.note.replace(/</g, '&lt;') + '</span>' : '') +
        '<div class="sub">' + new Date(e.ts).toLocaleDateString() + ' · ' + App.t(e.cat) + '</div></div>' +
        '<button class="xb">✕</button></div>');
      r.querySelector('.xb').onclick = () => { Core.removeExpense(trip, e.id); App.render(); };
      w.appendChild(r);
    }
    return w;
  },

  tabBook(trip){
    const w = App.el('<div></div>');
    w.appendChild(App.el('<h2 class="sect">' + App.t('bookTitle') + '</h2>'));
    const card = (emoji, title, desc, url, cls) => {
      const c = App.el('<a class="bookcard ' + cls + '" target="_blank" rel="noopener sponsored" href="' + url + '">' +
        '<span class="bk-e">' + emoji + '</span><div class="grow"><b>' + title + '</b><div class="sub">' + desc + '</div></div>' +
        '<span class="bk-go">' + App.t('open') + ' ↗</span></a>');
      return c;
    };
    w.appendChild(card('🏨', App.t('bookHotelA'), App.t('bookHotelDesc'), Links.hotelAgoda(trip), 'agoda'));
    w.appendChild(card('🛏️', App.t('bookHotelB'), App.t('bookHotelDesc'), Links.hotelBooking(trip), 'booking'));
    if (Core.dest(trip).flight || trip.inclFlights)
      w.appendChild(card('✈️', App.t('bookFlights'), App.t('bookFlightsDesc'), Links.flights(), 'flights'));
    w.appendChild(card('🚌', App.t('bookGround'), App.t('bookGroundDesc'), Links.ground(trip), 'ground'));
    w.appendChild(card('🎟️', App.t('bookAct'), App.t('bookActDesc'), Links.activities(trip), 'klook'));
    w.appendChild(App.el('<div class="disclosure">ⓘ ' + App.t('disclosure') + '</div>'));
    return w;
  },

  shareTrip(trip){
    const d = Core.dest(trip);
    const total = Core.total(trip.budget);
    const text = d.emoji + ' ' + App.dname(d) + ' · ' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' 🧍\n' +
      App.t('total') + ': ' + Core.fmt(total) + ' (' + Core.fmt(total / trip.people) + ' ' + App.t('perPerson') + ')\n— ' + App.t('sharedWith');
    if (navigator.share){
      navigator.share({ title: 'BudgetTrip', text }).catch(() => {});
    } else if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(() => App.toast('Copied!')).catch(() => App.toast(text));
    } else {
      App.toast(text);
    }
  },
};

window.addEventListener('load', () => App.init());
