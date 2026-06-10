'use strict';
// BudgetTrip UI: hash-routed single-page app.
// #home | #new | #trip-<id> (+ App.tab for the trip sub-tab)
const App = {
  tab: 'budget',
  form: { dest: 'chiangmai', style: 'mid', nights: 3, people: 2, start: '', inclFlights: false },

  t(k){ return (I18N[Core.state.lang] || I18N.en)[k] || k; },
  img(key){ return 'assets/dest/' + key + '.jpg'; },
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
    if (h === 'plan') return { view: 'plan' };
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
    else if (r.view === 'plan') root.appendChild(App.viewPlan());
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
    const pb = App.el('<button class="bigbtn plan">' + App.t('planBtn') + '</button>');
    pb.onclick = () => App.go('plan');
    w.appendChild(pb);
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
        '<div class="tripcard photo">' +
        '<div class="tc-photo" style="background-image:url(' + App.img(trip.dest) + ')">' +
        '<div class="tc-overlay"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="tc-osub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' ' + (Core.state.lang === 'th' ? 'คน' : 'pax') + ' · ' + App.t(trip.style === 'budget' ? 'sBudget' : trip.style === 'comfort' ? 'sComfort' : 'sMid') + '</div></div>' +
        '<div class="tc-amt">' + Core.fmt(total) + '</div></div>' +
        '<div class="tc-body"><div class="bar"><div class="fill' + (sp > total ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="tc-sub">' + App.t('spent') + ' ' + Core.fmt(sp) + ' · ' + App.t('remaining') + ' ' + Core.fmt(total - sp) + '</div></div>' +
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
      const b = App.el('<button class="pdest' + (f.dest === key ? ' on' : '') + '" style="background-image:url(' + App.img(key) + ')">' +
        '<span class="pd-name">' + App.dname(d) + '</span>' +
        (f.dest === key ? '<span class="pd-check">✓</span>' : '') + '</button>');
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

  // ---------- budget-first planner ----------
  planForm: { budget: 10000, people: 2, style: 'mid', inclFlights: false },

  viewPlan(){
    const f = App.planForm;
    const w = App.el('<div></div>');
    w.appendChild(App.el('<h2 class="sect">' + App.t('planTitle') + '</h2>'));

    const br = App.el('<div class="row"><div class="grow">' + App.t('yourBudget') + '</div>' +
      '<input class="amt" id="planAmt" inputmode="numeric" value="' + f.budget + '"></div>');
    br.querySelector('input').onchange = e => {
      f.budget = Math.max(0, parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0);
      App.render();
    };
    w.appendChild(br);

    const chips = App.el('<div class="catchips"></div>');
    for (const v of [3000, 5000, 10000, 20000, 30000, 50000]){
      const c = App.el('<button class="chip' + (f.budget === v ? ' on' : '') + '">฿' + (v / 1000) + 'k</button>');
      c.onclick = () => { f.budget = v; App.render(); };
      chips.appendChild(c);
    }
    w.appendChild(chips);

    const pr = App.el('<div class="row"><div class="grow">' + App.t('people') + '</div>' +
      '<button class="step">−</button><b class="stepval">' + f.people + '</b><button class="step">＋</button></div>');
    const [mi, pl] = pr.querySelectorAll('.step');
    mi.onclick = () => { f.people = Math.max(1, f.people - 1); App.render(); };
    pl.onclick = () => { f.people = Math.min(10, f.people + 1); App.render(); };
    w.appendChild(pr);

    const seg = App.el('<div class="seg"></div>');
    [['budget', 'sBudget', '🎒'], ['mid', 'sMid', '🧢'], ['comfort', 'sComfort', '🥂']].forEach(([k, lk, em]) => {
      const b = App.el('<button class="' + (f.style === k ? 'on' : '') + '">' + em + ' ' + App.t(lk) + '</button>');
      b.onclick = () => { f.style = k; App.render(); };
      seg.appendChild(b);
    });
    w.appendChild(seg);

    const fr = App.el('<div class="row"><div class="grow">' + App.t('inclFlights') + '</div>' +
      '<input type="checkbox" class="chk" ' + (f.inclFlights ? 'checked' : '') + '></div>');
    fr.querySelector('input').onchange = e => { f.inclFlights = e.target.checked; App.render(); };
    w.appendChild(fr);

    w.appendChild(App.el('<h2 class="sect">' + App.t('planResults') + '</h2>'));
    const opts = f.budget > 0 ? Core.planOptions(f.budget, f.people, f.style, f.inclFlights) : [];
    if (!opts.length){
      w.appendChild(App.el('<div class="empty">🙈<br>' + App.t('noFit') + '</div>'));
    }
    for (const o of opts.slice(0, 10)){
      const d = DESTS[o.dest];
      const card = App.el(
        '<div class="plancard2"><div class="pl-thumb" style="background-image:url(' + App.img(o.dest) + ')"></div>' +
        '<div class="grow"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="pl-n">' + o.nights + ' ' + App.t('daysLeft') + '</div>' +
        '<div class="tc-sub">' + Core.fmt(o.total) + ' · ' + App.t('left') + ' <b style="color:#1f9d61">' + Core.fmt(o.left) + '</b>' +
        (o.inclFlights ? ' · ✈️' : '') + '</div></div>' +
        '<span class="bk-go">' + App.t('pickPlan') + ' →</span></div>');
      card.onclick = () => {
        const trip = Core.newTrip({ dest: o.dest, style: o.style, nights: o.nights, people: f.people, start: '', inclFlights: o.inclFlights });
        App.tab = 'budget';
        App.toast(App.t('left') + ' ' + Core.fmt(o.left) + ' 🎉');
        App.go('trip-' + trip.id);
      };
      w.appendChild(card);
    }
    const back = App.el('<button class="ghostb">←</button>');
    back.onclick = () => App.go('home');
    w.appendChild(back);
    return w;
  },

  // ---------- trip ----------
  viewTrip(trip){
    const d = Core.dest(trip);
    const total = Core.total(trip.budget);
    const sp = Core.spent(trip);
    const w = App.el('<div></div>');

    const head = App.el(
      '<div class="hero" style="background-image:url(' + App.img(trip.dest) + ')">' +
      '<button class="back hbtn">←</button><button class="hbtn share" id="shareB">📤</button>' +
      '<div class="hero-txt"><div class="hero-name">' + App.dname(d) + '</div>' +
      '<div class="hero-sub">' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + ' ' + (Core.state.lang === 'th' ? 'คน' : 'pax') + (trip.start ? ' · ' + trip.start : '') + '</div></div></div>');
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
      const dealUrl = Links.forCategory(c.id, trip);
      const r = App.el(
        '<div class="catrow"><div class="cr-top"><span>' + c.emoji + ' ' + App.t(c.id) + '</span>' +
        '<input class="amt" inputmode="numeric" value="' + amt + '"></div>' +
        '<div class="bar"><div class="fill' + (used > amt ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="cr-foot"><span class="sub">' + Core.fmt(used) + ' / ' + Core.fmt(amt) + '</span>' +
        (dealUrl ? '<a class="dealb" target="_blank" rel="noopener sponsored" href="' + dealUrl + '">🔥 ' + App.t('deal') + ' ↗</a>' : '') +
        '</div></div>');
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

  pickName(x){ return Core.state.lang === 'th' ? (x.th || x.n) : x.n; },

  tabBook(trip){
    const w = App.el('<div></div>');
    const picks = PICKS[trip.dest];
    if (picks){
      // hotels: the tier matching this trip's style first
      const tierRank = t => (t === trip.style ? 0 : 1);
      const hotels = picks.h.slice().sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
      w.appendChild(App.el('<h2 class="sect">🏨 ' + App.t('recHotels') + '</h2>'));
      for (const h of hotels){
        const fits = h.tier === trip.style;
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.hotelByName(trip, h.n) + '">' +
          '<div class="grow"><b>' + App.pickName(h) + '</b>' + (fits ? ' <span class="bestbadge">★ ' + App.t('fitsPlan') + '</span>' : '') +
          '<div class="sub">' + h.area + ' · ' + App.t('approxFrom') + ' ' + Core.fmt(h.p) + App.t('perNight') + '</div></div>' +
          '<span class="pk-btn agoda">' + App.t('bookBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">🎟️ ' + App.t('topActs') + '</h2>'));
      for (const a of picks.a){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.actByName(a.n) + '">' +
          '<div class="grow"><b>' + App.pickName(a) + '</b>' +
          '<div class="sub">' + (a.p > 0 ? App.t('approxFrom') + ' ' + Core.fmt(a.p) + '/' + (Core.state.lang === 'th' ? 'คน' : 'pax') : App.t('freeEntry')) + '</div></div>' +
          '<span class="pk-btn klook">' + App.t('bookBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">🍜 ' + App.t('mustEat') + '</h2>'));
      for (const e2 of picks.e){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener" href="' + Links.placeMap(e2.n, trip) + '">' +
          '<div class="grow"><b>' + App.pickName(e2) + '</b>' +
          '<div class="sub">' + e2.area + ' · ' + '฿'.repeat(e2.p) + '</div></div>' +
          '<span class="pk-btn map">' + App.t('mapBtn') + ' ↗</span></a>');
        w.appendChild(r);
      }
    }
    w.appendChild(App.el('<h2 class="sect">' + App.t('morePartners') + '</h2>'));
    w.appendChild(App.el('<div class="sub" style="margin:-4px 2px 10px">' + App.t('sortedNote') + '</div>'));

    // one offer group per category, ranked by this trip's budget weight
    const groups = [
      { cat: 'accom', cards: [
        ['🏨', App.t('bookHotelA'), App.t('bookHotelDesc'), Links.hotelAgoda(trip), 'agoda'],
        ['🛏️', App.t('bookHotelB'), App.t('bookHotelDesc'), Links.hotelBooking(trip), 'booking'],
      ] },
      { cat: 'food', cards: [
        ['🍜', App.t('bookFood'), App.t('bookFoodDesc'), Links.foodEatigo(trip), 'eatigo'],
        ['🍱', App.t('bookFood2'), App.t('bookFood2Desc'), Links.foodHungryHub(), 'hungryhub'],
      ] },
      { cat: 'act', cards: [
        ['🎟️', App.t('bookAct'), App.t('bookActDesc'), Links.activities(trip), 'klook'],
      ] },
      { cat: 'transport', cards: [
        ['🚌', App.t('bookGround'), App.t('bookGroundDesc'), Links.ground(trip), 'ground'],
      ] },
    ];
    if (Core.dest(trip).flight || trip.inclFlights){
      groups.push({ cat: 'flights', cards: [
        ['✈️', App.t('bookFlights'), App.t('bookFlightsDesc'), Links.flights(), 'flights'],
      ] });
    }
    groups.sort((a, b) => (trip.budget[b.cat] || 0) - (trip.budget[a.cat] || 0));

    groups.forEach((g, gi) => {
      g.cards.forEach(([emoji, title, desc, url, cls], ci) => {
        const top = gi === 0 && ci === 0;
        const c = App.el('<a class="bookcard ' + cls + '" target="_blank" rel="noopener sponsored" href="' + url + '">' +
          '<span class="bk-e">' + emoji + '</span><div class="grow"><b>' + title + '</b>' +
          (top ? ' <span class="bestbadge">★ ' + App.t('bestBadge') + '</span>' : '') +
          '<div class="sub">' + desc + ' · ' + App.t(g.cat) + ' ' + Core.fmt(trip.budget[g.cat] || 0) + '</div></div>' +
          '<span class="bk-go">' + App.t('open') + ' ↗</span></a>');
        w.appendChild(c);
      });
    });
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
