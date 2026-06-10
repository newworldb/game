'use strict';
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

  // unified destination info for Thai presets and worldwide custom trips
  destInfo(trip){
    if (trip.dest === 'custom' && trip.custom){
      const c = trip.custom;
      return { key: 'custom', en: c.name, th: c.name, img: c.img || '',
        flight: c.flight || 0, slug12go: '', countryQ: c.countryQ || '',
        countryTh: c.countryTh || '', countryEn: c.countryEn || '' };
    }
    const d = DESTS[trip.dest] || DESTS.bangkok;
    const key = DESTS[trip.dest] ? trip.dest : 'bangkok';
    return { key, en: d.en, th: d.th, img: 'assets/dest/' + key + '.jpg',
      flight: d.flight, slug12go: d.slug12go, countryQ: 'Q869', countryTh: 'ไทย', countryEn: 'Thailand' };
  },
  rooms(people){ return Math.max(1, Math.ceil(people / 2)); },

  addDays(iso, n){
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  },

  // estimate from an explicit cost table (worldwide trips)
  estimateCosts(costs, flightRT, style, nights, people, inclFlights){
    const [accomRate, foodRate, transRate, actRate] = costs[style] || costs.mid;
    const rooms = Core.rooms(people);
    const b = {
      accom: accomRate * nights * rooms,
      food: foodRate * nights * people,
      transport: transRate * nights * people,
      act: actRate * nights * people,
      flights: (inclFlights && flightRT) ? flightRT * people : 0,
      shopping: 300 * people,
    };
    b.misc = Math.round(0.08 * (b.accom + b.food + b.transport + b.act));
    return b;
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
      custom: opts.custom || null,
      style: opts.style,
      nights: opts.nights,
      people: opts.people,
      start: opts.start || '',
      inclFlights: !!opts.inclFlights,
      budget: opts.custom
        ? Core.estimateCosts(opts.custom.costs, opts.custom.flight, opts.style, opts.nights, opts.people, opts.inclFlights)
        : Core.estimate(opts.dest, opts.style, opts.nights, opts.people, opts.inclFlights),
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
