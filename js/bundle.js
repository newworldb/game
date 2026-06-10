'use strict';
// GENERATED FILE — edit js/*.js and run: node tools/build.js
/* ===== config.js ===== */
// Affiliate configuration — put your partner IDs here. Links work without
// them (no tracking); with them, bookings earn your commission.
const AFF = {
  agoda_cid: '',        // Agoda partner CID, e.g. '1844104'
  booking_aid: '',      // Booking.com affiliate aid
  klook_aid: '',        // Klook affiliate id (aid)
  t12go_z: '',          // 12Go Asia partner ?z= id
  trip_allianceid: '',  // Trip.com Allianceid
  trip_sid: '',         // Trip.com SID
};

const Links = {
  enc: s => encodeURIComponent(s),

  hotelAgoda(trip){
    const d = Core.dest(trip);
    let u = 'https://www.agoda.com/search?textSearch=' + Links.enc(d.en + ', Thailand') +
      '&adults=' + trip.people + '&rooms=' + Core.rooms(trip.people) + '&los=' + trip.nights;
    if (trip.start) u += '&checkIn=' + trip.start;
    if (AFF.agoda_cid) u += '&cid=' + AFF.agoda_cid;
    return u;
  },

  hotelBooking(trip){
    const d = Core.dest(trip);
    let u = 'https://www.booking.com/searchresults.html?ss=' + Links.enc(d.en + ', Thailand') +
      '&group_adults=' + trip.people + '&no_rooms=' + Core.rooms(trip.people);
    if (trip.start){
      u += '&checkin=' + trip.start + '&checkout=' + Core.addDays(trip.start, trip.nights);
    }
    if (AFF.booking_aid) u += '&aid=' + AFF.booking_aid;
    return u;
  },

  activities(trip){
    const d = Core.dest(trip);
    let u = 'https://www.klook.com/search/result/?query=' + Links.enc(d.en);
    if (AFF.klook_aid) u += '&aid=' + AFF.klook_aid;
    return u;
  },

  ground(trip){
    const d = Core.dest(trip);
    let u = d.slug12go
      ? 'https://12go.asia/en/travel/bangkok/' + d.slug12go
      : 'https://12go.asia/en';
    if (AFF.t12go_z) u += (u.includes('?') ? '&' : '?') + 'z=' + AFF.t12go_z;
    return u;
  },

  flights(){
    let u = 'https://www.trip.com/flights/';
    const q = [];
    if (AFF.trip_allianceid) q.push('Allianceid=' + AFF.trip_allianceid);
    if (AFF.trip_sid) q.push('SID=' + AFF.trip_sid);
    if (q.length) u += '?' + q.join('&');
    return u;
  },
};

/* ===== data.js ===== */
// Destination cost data: accom = THB per room per night;
// food / transport / act = THB per person per day.
// flight = rough round-trip from Bangkok per person (0 = no airport / overland).
const DESTS = {
  bangkok:      { en: 'Bangkok', th: 'กรุงเทพฯ', emoji: '🏙️', flight: 0, slug12go: '',
    costs: { budget: [450, 250, 120, 150], mid: [1300, 550, 250, 400], comfort: [3500, 1400, 600, 900] } },
  chiangmai:    { en: 'Chiang Mai', th: 'เชียงใหม่', emoji: '⛰️', flight: 1900, slug12go: 'chiang-mai',
    costs: { budget: [350, 200, 100, 150], mid: [1000, 450, 200, 400], comfort: [2800, 1100, 500, 800] } },
  chiangrai:    { en: 'Chiang Rai', th: 'เชียงราย', emoji: '🛕', flight: 2000, slug12go: 'chiang-rai',
    costs: { budget: [300, 200, 100, 150], mid: [900, 400, 200, 350], comfort: [2500, 1000, 450, 700] } },
  phuket:       { en: 'Phuket', th: 'ภูเก็ต', emoji: '🏝️', flight: 2300, slug12go: 'phuket',
    costs: { budget: [500, 300, 180, 250], mid: [1600, 650, 350, 600], comfort: [4500, 1600, 700, 1200] } },
  krabi:        { en: 'Krabi', th: 'กระบี่', emoji: '🚤', flight: 2200, slug12go: 'krabi',
    costs: { budget: [450, 280, 150, 250], mid: [1400, 600, 300, 600], comfort: [4000, 1400, 600, 1100] } },
  kohsamui:     { en: 'Koh Samui', th: 'เกาะสมุย', emoji: '🥥', flight: 4200, slug12go: 'koh-samui',
    costs: { budget: [600, 320, 180, 250], mid: [1800, 700, 350, 600], comfort: [5000, 1700, 700, 1200] } },
  kohtao:       { en: 'Koh Tao', th: 'เกาะเต่า', emoji: '🤿', flight: 0, slug12go: 'koh-tao',
    costs: { budget: [500, 300, 150, 300], mid: [1500, 650, 300, 700], comfort: [3800, 1400, 600, 1300] } },
  pattaya:      { en: 'Pattaya', th: 'พัทยา', emoji: '🎡', flight: 0, slug12go: 'pattaya',
    costs: { budget: [450, 280, 150, 200], mid: [1300, 600, 300, 500], comfort: [3500, 1400, 600, 900] } },
  huahin:       { en: 'Hua Hin', th: 'หัวหิน', emoji: '🏖️', flight: 0, slug12go: 'hua-hin',
    costs: { budget: [450, 270, 130, 180], mid: [1300, 550, 250, 450], comfort: [3500, 1300, 550, 800] } },
  kanchanaburi: { en: 'Kanchanaburi', th: 'กาญจนบุรี', emoji: '🌉', flight: 0, slug12go: 'kanchanaburi',
    costs: { budget: [350, 220, 120, 180], mid: [900, 450, 250, 400], comfort: [2500, 1000, 500, 700] } },
  pai:          { en: 'Pai', th: 'ปาย', emoji: '🌄', flight: 0, slug12go: 'pai',
    costs: { budget: [300, 220, 100, 180], mid: [900, 450, 220, 400], comfort: [2200, 1000, 450, 700] } },
  kohchang:     { en: 'Koh Chang', th: 'เกาะช้าง', emoji: '🐘', flight: 0, slug12go: 'koh-chang',
    costs: { budget: [450, 280, 150, 220], mid: [1300, 600, 300, 500], comfort: [3500, 1300, 600, 900] } },
};

const CATS = [
  { id: 'accom', emoji: '🏨' },
  { id: 'food', emoji: '🍜' },
  { id: 'transport', emoji: '🛵' },
  { id: 'act', emoji: '🎟️' },
  { id: 'flights', emoji: '✈️' },
  { id: 'shopping', emoji: '🛍️' },
  { id: 'misc', emoji: '💸' },
];

const I18N = {
  en: {
    tagline: 'Plan your Thai trip budget in 30 seconds',
    newTrip: '+ New Trip', myTrips: 'My trips', noTrips: 'No trips yet — plan your first one!',
    where: 'Where to?', nights: 'Nights', people: 'Travelers', style: 'Travel style',
    sBudget: 'Backpacker', sMid: 'Comfortable', sComfort: 'Premium',
    startDate: 'Start date (optional)', inclFlights: 'Include flights from Bangkok',
    create: 'Create trip & estimate budget',
    budget: 'Budget', expenses: 'Expenses', book: 'Book',
    total: 'Total budget', spent: 'Spent', remaining: 'Remaining', perPerson: 'per person',
    accom: 'Accommodation', food: 'Food & drinks', transport: 'Local transport',
    act: 'Activities', flights: 'Flights', shopping: 'Shopping', misc: 'Buffer / misc',
    addExpense: 'Add', amount: 'Amount (฿)', note: 'Note (optional)', noExpenses: 'No expenses yet — add your first one above.',
    reestimate: '↻ Re-estimate from averages', tapToEdit: 'Tap a number to edit it',
    bookTitle: 'Book your trip', bookHotelA: 'Hotels on Agoda', bookHotelB: 'Hotels on Booking.com',
    bookFlights: 'Flights on Trip.com', bookGround: 'Bus · Train · Ferry (12Go)', bookAct: 'Tours & tickets on Klook',
    bookHotelDesc: 'Best coverage in Thailand, pay at hotel options',
    bookFlightsDesc: 'Compare domestic and international fares',
    bookGroundDesc: 'Every route from Bangkok, book seats online',
    bookActDesc: 'Skip-the-line tickets, day trips, cooking classes',
    disclosure: 'Some links are affiliate links — booking through them may earn us a commission at no extra cost to you.',
    share: 'Share', deleteTrip: 'Delete trip', confirm: 'Tap again to confirm',
    over: 'over budget', daysLeft: 'nights', open: 'Open',
    sharedWith: 'planned with BudgetTrip',
    planBtn: '💰 I have a budget — plan for me',
    planTitle: 'How much do you have?',
    yourBudget: 'Your budget (฿)',
    planResults: 'With this budget you can go…',
    noFit: 'Budget too small for these settings — add more or switch style.',
    pickPlan: 'Pick this plan',
    left: 'left over',
  },
  th: {
    tagline: 'วางแผนงบเที่ยวไทยใน 30 วินาที',
    newTrip: '+ ทริปใหม่', myTrips: 'ทริปของฉัน', noTrips: 'ยังไม่มีทริป — เริ่มวางแผนกันเลย!',
    where: 'ไปเที่ยวที่ไหน?', nights: 'จำนวนคืน', people: 'ผู้เดินทาง', style: 'สไตล์การเที่ยว',
    sBudget: 'ประหยัด', sMid: 'มาตรฐาน', sComfort: 'พรีเมียม',
    startDate: 'วันออกเดินทาง (ไม่บังคับ)', inclFlights: 'รวมตั๋วเครื่องบินจากกรุงเทพฯ',
    create: 'สร้างทริปและคำนวณงบ',
    budget: 'งบประมาณ', expenses: 'ค่าใช้จ่าย', book: 'จองเลย',
    total: 'งบทั้งหมด', spent: 'ใช้ไปแล้ว', remaining: 'คงเหลือ', perPerson: 'ต่อคน',
    accom: 'ที่พัก', food: 'อาหารและเครื่องดื่ม', transport: 'เดินทางในพื้นที่',
    act: 'กิจกรรม', flights: 'ตั๋วเครื่องบิน', shopping: 'ช้อปปิ้ง', misc: 'เผื่อฉุกเฉิน',
    addExpense: 'เพิ่ม', amount: 'จำนวนเงิน (฿)', note: 'บันทึก (ไม่บังคับ)', noExpenses: 'ยังไม่มีรายการ — เพิ่มรายการแรกด้านบนเลย',
    reestimate: '↻ คำนวณใหม่จากค่าเฉลี่ย', tapToEdit: 'แตะตัวเลขเพื่อแก้ไข',
    bookTitle: 'จองทริปของคุณ', bookHotelA: 'จองที่พักผ่าน Agoda', bookHotelB: 'ที่พักบน Booking.com',
    bookFlights: 'ตั๋วเครื่องบิน Trip.com', bookGround: 'รถทัวร์ · รถไฟ · เรือ (12Go)', bookAct: 'ทัวร์และตั๋วบน Klook',
    bookHotelDesc: 'ที่พักเยอะสุดในไทย มีแบบจ่ายที่โรงแรม',
    bookFlightsDesc: 'เทียบราคาตั๋วในประเทศและต่างประเทศ',
    bookGroundDesc: 'ทุกเส้นทางจากกรุงเทพฯ จองที่นั่งออนไลน์',
    bookActDesc: 'ตั๋วเข้าชม ทริปรายวัน คลาสทำอาหาร',
    disclosure: 'บางลิงก์เป็นลิงก์พันธมิตร — การจองผ่านลิงก์อาจทำให้เราได้รับค่าคอมมิชชั่น โดยคุณไม่เสียค่าใช้จ่ายเพิ่ม',
    share: 'แชร์', deleteTrip: 'ลบทริป', confirm: 'แตะอีกครั้งเพื่อยืนยัน',
    over: 'เกินงบ', daysLeft: 'คืน', open: 'เปิด',
    sharedWith: 'วางแผนด้วย BudgetTrip',
    planBtn: '💰 มีตังเท่านี้ ให้แอพวางแผน',
    planTitle: 'มีงบเท่าไหร่?',
    yourBudget: 'งบของคุณ (฿)',
    planResults: 'งบนี้ไปได้เลย…',
    noFit: 'งบยังไม่พอสำหรับเงื่อนไขนี้ — ลองเพิ่มงบหรือเปลี่ยนสไตล์ดูนะ',
    pickPlan: 'เลือกแผนนี้',
    left: 'เหลือ',
  },
};

/* ===== core.js ===== */
// DOM-free app core: budget math, trip model, persistence.
const Core = {
  KEY: 'budgettrip-v1',
  state: { lang: 'th', trips: [], nextId: 1 },

  load(){
    try {
      const raw = localStorage.getItem(Core.KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.trips)) Core.state = d;
        return true;
      }
    } catch (e) { /* fresh */ }
    return false;
  },
  save(){
    try { localStorage.setItem(Core.KEY, JSON.stringify(Core.state)); } catch (e) { /* private mode */ }
  },

  dest(trip){ return DESTS[trip.dest] || DESTS.bangkok; },
  rooms(people){ return Math.max(1, Math.ceil(people / 2)); },

  addDays(iso, n){
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  },

  // budget estimate in THB by destination averages
  estimate(destKey, style, nights, people, inclFlights){
    const d = DESTS[destKey] || DESTS.bangkok;
    const [accomRate, foodRate, transRate, actRate] = d.costs[style] || d.costs.mid;
    const rooms = Core.rooms(people);
    const b = {
      accom: accomRate * nights * rooms,
      food: foodRate * nights * people,
      transport: transRate * nights * people,
      act: actRate * nights * people,
      flights: (inclFlights && d.flight) ? d.flight * people : 0,
      shopping: 300 * people,
    };
    b.misc = Math.round(0.08 * (b.accom + b.food + b.transport + b.act));
    return b;
  },

  // longest affordable stay at a destination for a given budget
  maxNightsFor(destKey, style, people, budgetTHB, inclFlights){
    let best = null;
    for (let n = 1; n <= 21; n++){
      const est = Core.estimate(destKey, style, n, people, inclFlights);
      const t = Core.total(est);
      if (t <= budgetTHB) best = { nights: n, total: t };
      else break; // totals grow with nights
    }
    return best;
  },

  // "I have ฿X — where can I go?": best option per destination, sorted
  planOptions(budgetTHB, people, style, inclFlights){
    const opts = [];
    for (const k in DESTS){
      const fl = !!(inclFlights && DESTS[k].flight);
      const r = Core.maxNightsFor(k, style, people, budgetTHB, fl);
      if (r) opts.push({ dest: k, style, nights: r.nights, total: r.total, left: budgetTHB - r.total, inclFlights: fl });
    }
    opts.sort((a, b) => b.nights - a.nights || a.total - b.total);
    return opts;
  },

  total(budget){
    let t = 0;
    for (const c of CATS) t += budget[c.id] || 0;
    return t;
  },

  newTrip(opts){
    const trip = {
      id: Core.state.nextId++,
      dest: opts.dest,
      style: opts.style,
      nights: opts.nights,
      people: opts.people,
      start: opts.start || '',
      inclFlights: !!opts.inclFlights,
      budget: Core.estimate(opts.dest, opts.style, opts.nights, opts.people, opts.inclFlights),
      expenses: [],
      created: Date.now(),
    };
    Core.state.trips.unshift(trip);
    Core.save();
    return trip;
  },

  trip(id){ return Core.state.trips.find(t => t.id === id); },

  deleteTrip(id){
    Core.state.trips = Core.state.trips.filter(t => t.id !== id);
    Core.save();
  },

  addExpense(trip, cat, amount, note){
    trip.expenses.unshift({ id: Date.now() + Math.random(), cat, amount: Math.round(amount), note: (note || '').slice(0, 60), ts: Date.now() });
    Core.save();
  },

  removeExpense(trip, id){
    trip.expenses = trip.expenses.filter(e => e.id !== id);
    Core.save();
  },

  spent(trip){
    const by = {};
    let total = 0;
    for (const c of CATS) by[c.id] = 0;
    for (const e of trip.expenses){
      by[e.cat] = (by[e.cat] || 0) + e.amount;
      total += e.amount;
    }
    return { by, total };
  },

  fmt(n){
    return '฿' + Math.round(n).toLocaleString('en-US');
  },
};

/* ===== app.js ===== */
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
        '<div class="tripcard plancard"><div class="tc-head"><span class="tc-emoji">' + d.emoji + '</span>' +
        '<div class="grow"><div class="tc-name">' + App.dname(d) + ' · ' + o.nights + ' ' + App.t('daysLeft') + '</div>' +
        '<div class="tc-sub">' + Core.fmt(o.total) + ' · ' + App.t('left') + ' ' + Core.fmt(o.left) +
        (o.inclFlights ? ' · ✈️' : '') + '</div></div>' +
        '<span class="bk-go">' + App.t('pickPlan') + ' →</span></div></div>');
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
