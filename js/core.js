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
