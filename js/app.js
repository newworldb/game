'use strict';
// BudgetTrip UI: hash-routed single-page app.
// #home | #new | #trip-<id> (+ App.tab for the trip sub-tab)
const App = {
  tab: 'plan',
  form: { dest: 'chiangmai', style: 'mid', nights: 3, people: 2, start: '', inclFlights: false },

  t(k){ return (I18N[Core.state.lang] || I18N.en)[k] || k; },
  img(key){ return 'assets/dest/' + key + '.jpg'; },
  tripImg(trip){ return Core.destInfo(trip).img; },
  tripName(trip){
    const d = Core.destInfo(trip);
    return Core.state.lang === 'th' ? d.th : d.en;
  },
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
    const nb = App.el('<button class="bigbtn">' + icon('plus') + ' ' + App.t('newTrip') + '</button>');
    nb.onclick = () => App.go('new');
    w.appendChild(nb);
    const pb = App.el('<button class="bigbtn plan">' + icon('sparkles') + ' ' + App.t('planBtn') + '</button>');
    pb.onclick = () => App.go('plan');
    w.appendChild(pb);
    w.appendChild(App.el('<h2 class="sect">' + App.t('myTrips') + '</h2>'));
    if (!Core.state.trips.length){
      w.appendChild(App.el('<div class="empty">' + icon('suitcase', 'ic-big') + '<br>' + App.t('noTrips') + '</div>'));
    }
    for (const trip of Core.state.trips){
      const total = Core.total(trip.budget);
      const sp = Core.spent(trip).total;
      const pct = total > 0 ? Math.min(100, Math.round(sp / total * 100)) : 0;
      const card = App.el(
        '<div class="tripcard photo">' +
        '<div class="tc-photo" style="background-image:url(' + App.tripImg(trip) + ')">' +
        '<div class="tc-overlay"><div class="tc-name">' + App.tripName(trip) + '</div>' +
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

    // worldwide smart search
    const sb = App.el('<div class="searchbox">' + icon('globe') +
      '<input id="wq" autocomplete="off" placeholder="' + App.t('searchWorld') + '">' +
      '<div id="wsug" class="sug hidden"></div></div>');
    const inp = sb.querySelector('#wq');
    const sug = sb.querySelector('#wsug');
    let deb = null;
    inp.oninput = () => {
      clearTimeout(deb);
      const q = inp.value.trim();
      if (q.length < 2){ sug.classList.add('hidden'); return; }
      deb = setTimeout(async () => {
        try {
          const list = await World_suggest_safe(q);
          sug.innerHTML = '';
          for (const s of list){
            const r = App.el('<div class="sugrow">' + icon('pin') + '<div class="grow"><b>' + s.title + '</b>' +
              (s.desc ? '<div class="sub">' + s.desc.slice(0, 60) + '</div>' : '') + '</div></div>');
            r.onclick = async () => {
              sug.classList.add('hidden');
              inp.value = s.title;
              App.toast(App.t('searching'));
              try {
                const info = await WORLD.resolve(s.title, s.lang);
                const cc = WORLD.costsFor(info.countryQ);
                f.customSel = {
                  name: info.name, img: info.img, countryQ: info.countryQ,
                  countryEn: cc.en, countryTh: cc.th, costs: cc.costs, flight: cc.flight,
                };
                App.render();
              } catch (e){ App.toast('!'); }
            };
            sug.appendChild(r);
          }
          sug.classList.toggle('hidden', !list.length);
        } catch (e){ /* offline */ }
      }, 350);
    };
    w.appendChild(sb);

    if (f.customSel){
      const c = f.customSel;
      const cn = Core.state.lang === 'th' ? c.countryTh : c.countryEn;
      const card = App.el('<div class="customsel"' + (c.img ? ' style="background-image:url(' + c.img + ')"' : '') + '>' +
        '<div class="cs-grad"></div>' +
        '<div class="cs-txt"><b>' + c.name + '</b><div class="cs-sub">' + cn + ' · ' + App.t('customNote') + '</div></div>' +
        '<button class="cs-x">' + icon('x') + '</button></div>');
      card.querySelector('.cs-x').onclick = () => { f.customSel = null; App.render(); };
      w.appendChild(card);
      w.appendChild(App.el('<div class="sub" style="margin:10px 2px 4px">' + App.t('anywhere') + '</div>'));
    }

    const grid = App.el('<div class="destgrid' + (f.customSel ? ' dim' : '') + '"></div>');
    for (const key in DESTS){
      const d = DESTS[key];
      const on = !f.customSel && f.dest === key;
      const b = App.el('<button class="pdest' + (on ? ' on' : '') + '" style="background-image:url(' + App.img(key) + ')">' +
        '<span class="pd-name">' + App.dname(d) + '</span>' +
        (on ? '<span class="pd-check">' + icon('check') + '</span>' : '') + '</button>');
      b.onclick = () => { f.dest = key; f.customSel = null; App.render(); };
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

    const d = f.customSel ? { flight: f.customSel.flight } : DESTS[f.dest];
    if (d.flight){
      const fr = App.el('<div class="row"><div class="grow">' + App.t('inclFlights') + ' <span class="sub">(~' + Core.fmt(d.flight) + '/🧍)</span></div>' +
        '<input type="checkbox" class="chk" ' + (f.inclFlights ? 'checked' : '') + '></div>');
      fr.querySelector('input').onchange = e => { f.inclFlights = e.target.checked; };
      w.appendChild(fr);
    }

    // live preview
    const est = f.customSel
      ? Core.estimateCosts(f.customSel.costs, f.customSel.flight, f.style, f.nights, f.people, f.inclFlights)
      : Core.estimate(f.dest, f.style, f.nights, f.people, f.inclFlights && !!d.flight);
    const tot = Core.total(est);
    w.appendChild(App.el('<div class="preview">' + Core.fmt(tot) + ' <span class="sub">· ' + Core.fmt(tot / f.people) + ' ' + App.t('perPerson') + '</span></div>'));

    const cb = App.el('<button class="bigbtn">' + icon('check') + ' ' + App.t('create') + '</button>');
    cb.onclick = () => {
      const trip = f.customSel
        ? Core.newTrip({ dest: 'custom', custom: f.customSel, style: f.style, nights: f.nights, people: f.people, start: f.start, inclFlights: f.inclFlights })
        : Core.newTrip({ dest: f.dest, style: f.style, nights: f.nights, people: f.people, start: f.start, inclFlights: f.inclFlights && !!d.flight });
      App.tab = 'plan';
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
      w.appendChild(App.el('<div class="empty">' + icon('search', 'ic-big') + '<br>' + App.t('noFit') + '</div>'));
    }
    for (const o of opts.slice(0, 10)){
      const d = DESTS[o.dest];
      const card = App.el(
        '<div class="plancard2"><div class="pl-thumb" style="background-image:url(' + App.img(o.dest) + ')"></div>' +
        '<div class="grow"><div class="tc-name">' + App.dname(d) + '</div>' +
        '<div class="pl-n">' + o.nights + ' ' + App.t('daysLeft') + '</div>' +
        '<div class="tc-sub">' + Core.fmt(o.total) + ' · ' + App.t('left') + ' <b style="color:#1f9d61">' + Core.fmt(o.left) + '</b>' +
        (o.inclFlights ? ' · ✈️' : '') + '</div></div>' +
        '<span class="bk-go">' + App.t('pickPlan') + ' ' + icon('chevron') + '</span></div>');
      card.onclick = () => {
        const trip = Core.newTrip({ dest: o.dest, style: o.style, nights: o.nights, people: f.people, start: '', inclFlights: o.inclFlights });
        App.tab = 'plan';
        App.toast(App.t('left') + ' ' + Core.fmt(o.left));
        App.go('trip-' + trip.id);
      };
      w.appendChild(card);
    }
    const back = App.el('<button class="ghostb">' + icon('back') + '</button>');
    back.onclick = () => App.go('home');
    w.appendChild(back);
    return w;
  },

  // ---------- trip ----------
  viewTrip(trip){
    const total = Core.total(trip.budget);
    const sp = Core.spent(trip);
    const w = App.el('<div></div>');

    const head = App.el(
      '<div class="hero" style="background-image:url(' + App.tripImg(trip) + ')">' +
      '<button class="back hbtn">' + icon('back') + '</button><button class="hbtn share" id="shareB">' + icon('share') + '</button>' +
      '<div class="hero-txt"><div class="hero-name">' + App.tripName(trip) + '</div>' +
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
    [['plan', 'planTab', 'calendar'], ['budget', 'budget', 'wallet'], ['expenses', 'expenses', 'receipt'], ['book', 'book', 'tag']].forEach(([k, lk, ic]) => {
      const b = App.el('<button class="' + (App.tab === k ? 'on' : '') + '">' + icon(ic) + ' ' + App.t(lk) + '</button>');
      b.onclick = () => { App.tab = k; App.render(); };
      tabs.appendChild(b);
    });
    w.appendChild(tabs);

    if (App.tab === 'expenses') w.appendChild(App.tabExpenses(trip));
    else if (App.tab === 'book') w.appendChild(App.tabBook(trip));
    else if (App.tab === 'budget') w.appendChild(App.tabBudget(trip));
    else w.appendChild(App.tabPlan(trip));

    const del = App.el('<button class="dangerb">' + App.t('deleteTrip') + '</button>');
    del.onclick = () => {
      if (del.dataset.armed){ Core.deleteTrip(trip.id); App.go('home'); }
      else { del.dataset.armed = '1'; del.textContent = App.t('confirm'); }
    };
    w.appendChild(del);
    return w;
  },

  tabPlan(trip){
    const w = App.el('<div></div>');
    const plan = Core.autoPlan(trip);
    const th = Core.state.lang === 'th';

    const fitCls = plan.fits ? 'fit' : 'nofit';
    const head = App.el('<div class="planhead">' +
      '<div class="ph-title">' + icon('sparkles') + ' ' + App.t('autoTitle') + '</div>' +
      '<div class="ph-total">' + App.t('planTotal') + ' <b>' + Core.fmt(plan.grand) + '</b>' +
      ' <span class="fitchip ' + fitCls + '">' + (plan.fits ? App.t('inBudget') : App.t('overBudget')) + ' · ' + App.t('budget') + ' ' + Core.fmt(plan.budgetTotal) + '</span></div>' +
      (plan.downgraded ? '<div class="sub">' + App.t('downgradedNote') + '</div>' : '') +
      '<button class="shufb">' + icon('refresh') + ' ' + App.t('shuffle') + '</button></div>');
    head.querySelector('.shufb').onclick = () => {
      trip.planSeed = (trip.planSeed || 0) + 1;
      Core.save();
      App.render();
    };
    w.appendChild(head);

    // hotel picked for you
    w.appendChild(App.el('<h2 class="sect">' + icon('bed') + ' ' + App.t('stayLine') + '</h2>'));
    if (plan.hotel){
      const h = plan.hotel;
      w.appendChild(App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.hotelByName(trip, h.n) + '">' +
        '<div class="grow"><b>' + App.pickName(h) + '</b>' +
        '<div class="sub">' + h.area + ' · ' + Core.fmt(h.p) + App.t('perNight') + ' × ' + trip.nights + ' ' + App.t('nightsX') + ' = <b>' + Core.fmt(plan.stay) + '</b></div></div>' +
        '<span class="pk-btn agoda">' + App.t('bookBtn') + '</span></a>'));
    } else {
      w.appendChild(App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.hotelAgoda(trip) + '">' +
        '<div class="grow"><b>' + App.tripName(trip) + ' · ' + App.t('bookHotelA') + '</b>' +
        '<div class="sub">' + App.t('total2') + ' ≈ <b>' + Core.fmt(plan.stay) + '</b> / ' + trip.nights + ' ' + App.t('nightsX') + '</div></div>' +
        '<span class="pk-btn agoda">' + App.t('bookBtn') + '</span></a>'));
    }
    if (plan.flights > 0){
      w.appendChild(App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.flights() + '">' +
        '<div class="grow"><b>' + App.t('flights') + '</b><div class="sub">≈ <b>' + Core.fmt(plan.flights) + '</b></div></div>' +
        '<span class="pk-btn flightsb">' + App.t('bookBtn') + '</span></a>'));
    }

    // day by day
    for (const d of plan.days){
      const dayEl = App.el('<div class="daycard"><div class="day-h">' + icon('calendar') + ' ' + App.t('day') + ' ' + d.day + '</div></div>');
      for (const s of d.slots){
        if (s.type === 'travel'){
          dayEl.appendChild(App.el('<div class="slot"><span class="slot-ic">' + icon('plane') + '</span><div class="grow">' + App.t(s.label) + '</div></div>'));
        } else if (s.type === 'act'){
          dayEl.appendChild(App.el('<a class="slot link" target="_blank" rel="noopener sponsored" href="' + Links.actByName(s.item.n) + '">' +
            '<span class="slot-ic">' + icon('ticket') + '</span><div class="grow"><b>' + App.pickName(s.item) + '</b>' +
            '<div class="sub">' + (s.cost > 0 ? '≈ ' + Core.fmt(s.cost) : App.t('freeEntry')) + '</div></div>' +
            '<span class="pk-btn klook">' + App.t('bookBtn') + '</span></a>'));
        } else if (s.type === 'actGeneric'){
          dayEl.appendChild(App.el('<a class="slot link" target="_blank" rel="noopener sponsored" href="' + Links.activities(trip) + '">' +
            '<span class="slot-ic">' + icon('ticket') + '</span><div class="grow"><b>' + App.t(s.label) + '</b>' +
            '<div class="sub">≈ ' + Core.fmt(s.cost) + '</div></div>' +
            '<span class="pk-btn klook">' + App.t('bookBtn') + '</span></a>'));
        } else if (s.type === 'eat'){
          dayEl.appendChild(App.el('<a class="slot link" target="_blank" rel="noopener" href="' + Links.placeMap(s.item.n, trip) + '">' +
            '<span class="slot-ic">' + icon('bowl') + '</span><div class="grow"><b>' + App.pickName(s.item) + '</b>' +
            '<div class="sub">' + s.item.area + ' · ≈ ' + Core.fmt(s.cost) + '</div></div>' +
            '<span class="pk-btn map">' + App.t('mapBtn') + '</span></a>'));
        } else if (s.type === 'eatGeneric'){
          dayEl.appendChild(App.el('<div class="slot"><span class="slot-ic">' + icon('bowl') + '</span><div class="grow">' + App.t('localEat') +
            '<div class="sub">≈ ' + Core.fmt(s.cost) + '</div></div></div>'));
        } else {
          dayEl.appendChild(App.el('<div class="slot"><span class="slot-ic">' + icon('pin') + '</span><div class="grow">' + App.t('freeDay') + '</div></div>'));
        }
      }
      w.appendChild(dayEl);
    }
    w.appendChild(App.el('<div class="disclosure">' + App.t('livePriceNote') + '<br>' + App.t('disclosure') + '</div>'));
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
        '<div class="catrow"><div class="cr-top"><span>' + icon(c.icon, 'ic-cat') + ' ' + App.t(c.id) + '</span>' +
        '<input class="amt" inputmode="numeric" value="' + amt + '"></div>' +
        '<div class="bar"><div class="fill' + (used > amt ? ' over' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="cr-foot"><span class="sub">' + Core.fmt(used) + ' / ' + Core.fmt(amt) + '</span>' +
        (dealUrl ? '<a class="dealb" target="_blank" rel="noopener sponsored" href="' + dealUrl + '">' + icon('flame') + ' ' + App.t('deal') + '</a>' : '') +
        '</div></div>');
      const inp = r.querySelector('.amt');
      inp.onchange = () => {
        trip.budget[c.id] = Math.max(0, parseInt(inp.value.replace(/[^0-9]/g, ''), 10) || 0);
        Core.save();
        App.render();
      };
      w.appendChild(r);
    }
    const re = App.el('<button class="ghostb">' + icon('refresh') + ' ' + App.t('reestimate').replace('↻ ', '') + '</button>');
    re.onclick = () => {
      trip.budget = trip.custom
        ? Core.estimateCosts(trip.custom.costs, trip.custom.flight, trip.style, trip.nights, trip.people, trip.inclFlights)
        : Core.estimate(trip.dest, trip.style, trip.nights, trip.people, trip.inclFlights);
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
      const b = App.el('<button class="chip' + (App._expCat === c.id ? ' on' : '') + '">' + icon(c.icon) + ' ' + App.t(c.id) + '</button>');
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
      w.appendChild(App.el('<div class="empty">' + icon('receipt', 'ic-big') + '<br>' + App.t('noExpenses') + '</div>'));
      return w;
    }
    for (const e of trip.expenses){
      const c = CATS.find(q => q.id === e.cat) || CATS[6];
      const r = App.el('<div class="exprow"><span class="exp-ic">' + icon(c.icon) + '</span>' +
        '<div class="grow"><b>' + Core.fmt(e.amount) + '</b>' + (e.note ? ' <span class="sub">' + e.note.replace(/</g, '&lt;') + '</span>' : '') +
        '<div class="sub">' + new Date(e.ts).toLocaleDateString() + ' · ' + App.t(e.cat) + '</div></div>' +
        '<button class="xb">' + icon('x') + '</button></div>');
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
      w.appendChild(App.el('<h2 class="sect">' + icon('bed') + ' ' + App.t('recHotels') + '</h2>'));
      for (const h of hotels){
        const fits = h.tier === trip.style;
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.hotelByName(trip, h.n) + '">' +
          '<div class="grow"><b>' + App.pickName(h) + '</b>' + (fits ? ' <span class="bestbadge">' + icon('star') + ' ' + App.t('fitsPlan') + '</span>' : '') +
          '<div class="sub">' + h.area + ' · ' + App.t('approxFrom') + ' ' + Core.fmt(h.p) + App.t('perNight') + '</div></div>' +
          '<span class="pk-btn agoda">' + App.t('bookBtn') + '</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">' + icon('ticket') + ' ' + App.t('topActs') + '</h2>'));
      for (const a of picks.a){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener sponsored" href="' + Links.actByName(a.n) + '">' +
          '<div class="grow"><b>' + App.pickName(a) + '</b>' +
          '<div class="sub">' + (a.p > 0 ? App.t('approxFrom') + ' ' + Core.fmt(a.p) + '/' + (Core.state.lang === 'th' ? 'คน' : 'pax') : App.t('freeEntry')) + '</div></div>' +
          '<span class="pk-btn klook">' + App.t('bookBtn') + '</span></a>');
        w.appendChild(r);
      }
      w.appendChild(App.el('<h2 class="sect">' + icon('bowl') + ' ' + App.t('mustEat') + '</h2>'));
      for (const e2 of picks.e){
        const r = App.el('<a class="pickrow" target="_blank" rel="noopener" href="' + Links.placeMap(e2.n, trip) + '">' +
          '<div class="grow"><b>' + App.pickName(e2) + '</b>' +
          '<div class="sub">' + e2.area + ' · ' + '฿'.repeat(e2.p) + '</div></div>' +
          '<span class="pk-btn map">' + App.t('mapBtn') + '</span></a>');
        w.appendChild(r);
      }
    }
    w.appendChild(App.el('<h2 class="sect">' + App.t('morePartners') + '</h2>'));
    w.appendChild(App.el('<div class="sub" style="margin:-4px 2px 10px">' + App.t('sortedNote') + '</div>'));

    // one offer group per category, ranked by this trip's budget weight
    const groups = [
      { cat: 'accom', cards: [
        ['bed', App.t('bookHotelA'), App.t('bookHotelDesc'), Links.hotelAgoda(trip), 'agoda'],
        ['building', App.t('bookHotelB'), App.t('bookHotelDesc'), Links.hotelBooking(trip), 'booking'],
      ] },
      { cat: 'act', cards: [
        ['ticket', App.t('bookAct'), App.t('bookActDesc'), Links.activities(trip), 'klook'],
      ] },
    ];
    if (Links.foodAvailable(trip)){
      groups.push({ cat: 'food', cards: [
        ['bowl', App.t('bookFood'), App.t('bookFoodDesc'), Links.foodEatigo(trip), 'eatigo'],
        ['bowl', App.t('bookFood2'), App.t('bookFood2Desc'), Links.foodHungryHub(), 'hungryhub'],
      ] });
    } else {
      groups.push({ cat: 'food', cards: [
        ['bowl', App.t('bookAct').replace('Klook', 'Klook'), App.t('bookFoodDesc'), Links.foodKlook(trip), 'klook'],
      ] });
    }
    if (Links.groundAvailable(trip)){
      groups.push({ cat: 'transport', cards: [
        ['bus', App.t('bookGround'), App.t('bookGroundDesc'), Links.ground(trip), 'ground'],
      ] });
    }
    if (Core.destInfo(trip).flight || trip.inclFlights){
      groups.push({ cat: 'flights', cards: [
        ['plane', App.t('bookFlights'), App.t('bookFlightsDesc'), Links.flights(), 'flights'],
      ] });
    }
    groups.sort((a, b) => (trip.budget[b.cat] || 0) - (trip.budget[a.cat] || 0));

    groups.forEach((g, gi) => {
      g.cards.forEach(([emoji, title, desc, url, cls], ci) => {
        const top = gi === 0 && ci === 0;
        const c = App.el('<a class="bookcard ' + cls + '" target="_blank" rel="noopener sponsored" href="' + url + '">' +
          '<span class="bk-e">' + icon(emoji, 'ic-card') + '</span><div class="grow"><b>' + title + '</b>' +
          (top ? ' <span class="bestbadge">' + icon('star') + ' ' + App.t('bestBadge') + '</span>' : '') +
          '<div class="sub">' + desc + ' · ' + App.t(g.cat) + ' ' + Core.fmt(trip.budget[g.cat] || 0) + '</div></div>' +
          '<span class="bk-go">' + App.t('open') + '</span></a>');
        w.appendChild(c);
      });
    });
    w.appendChild(App.el('<div class="disclosure">ⓘ ' + App.t('disclosure') + '</div>'));
    return w;
  },

  shareTrip(trip){
    const total = Core.total(trip.budget);
    const text = App.tripName(trip) + ' · ' + trip.nights + ' ' + App.t('daysLeft') + ' · ' + trip.people + '\n' +
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

// suggestion fetch with a soft timeout so slow networks fail quietly
function World_suggest_safe(q){
  return Promise.race([
    WORLD.suggest(q),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000)),
  ]);
}

window.addEventListener('load', () => App.init());
