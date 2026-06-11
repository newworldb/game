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

  // ---- automatic full-trip planner: hotel + day-by-day + meals, best value ----
  MEAL_COST: [0, 150, 400, 900], // ฿/person by restaurant price level

  costsOf(trip){
    if (trip.custom) return { costs: trip.custom.costs, flight: trip.custom.flight };
    const d = DESTS[trip.dest] || DESTS.bangkok;
    return { costs: d.costs, flight: d.flight };
  },

  autoPlan(trip){
    const seed = trip.planSeed || 0;
    const people = trip.people, nights = trip.nights, rooms = Core.rooms(people);
    const { costs, flight } = Core.costsOf(trip);
    const styleRates = costs[trip.style] || costs.mid;
    const picks = (typeof PICKS !== 'undefined' && PICKS[trip.dest]) || null;
    const budgetTotal = Core.total(trip.budget);
    const tiersOrder = { budget: ['budget'], mid: ['mid', 'budget'], comfort: ['comfort', 'mid', 'budget'] }[trip.style] || ['mid', 'budget'];

    // food / transport / flights are tied to the trip's own budget so the
    // plan always matches; only the hotel (stay) and scheduled activities vary.
    const foodBudget = trip.budget.food || styleRates[1] * people * nights;
    const transport = trip.budget.transport || styleRates[2] * people * nights;
    const flights = trip.budget.flights || 0;
    const actBudget = trip.budget.act || styleRates[3] * people * nights;
    const foodPerDay = Math.round(foodBudget / nights);

    const build = (tier) => {
      // best-value hotel for this tier
      let hotel = null, stay;
      if (picks){
        hotel = picks.h.find(h => h.tier === tier) || picks.h[0];
        stay = hotel.p * nights * rooms;
      } else {
        stay = (costs[tier] || styleRates)[0] * nights * rooms;
      }
      const days = [];
      const acts = picks ? picks.a.slice() : null;
      const eats = picks ? picks.e.slice() : null;
      let actSpent = 0, foodTotal = 0;
      for (let i = 0; i < nights + 1; i++){
        const slots = [];
        if (i === 0) slots.push({ type: 'travel', label: 'arrive' });
        if (i === nights){ slots.push({ type: 'travel', label: 'depart' }); days.push({ day: i + 1, slots }); break; }
        // one activity per full day (skip the arrival day unless it's the only day),
        // and only charge paid ones the budget can still afford
        const isActivityDay = i > 0 || nights === 1;
        if (isActivityDay){
          const idx = (nights === 1 ? 0 : i - 1);
          if (acts && acts.length){
            const a = acts[(idx + seed) % acts.length];
            const cost = a.p * people;
            if (actSpent + cost <= actBudget * 1.15){
              slots.push({ type: 'act', item: a, cost });
              actSpent += cost;
            } else {
              slots.push({ type: 'act', item: a, cost: 0, free: true }); // suggested, not budgeted
            }
          } else {
            const genCost = styleRates[3] * people;
            if (actSpent + genCost <= actBudget * 1.15){
              slots.push({ type: 'actGeneric', label: idx === 0 ? 'cityTour' : 'dayTour', cost: genCost });
              actSpent += genCost;
            } else {
              slots.push({ type: 'free' });
            }
          }
        }
        // evening meal — cost pinned to the per-day food budget
        if (eats){
          const e = eats[(i + seed) % eats.length];
          slots.push({ type: 'eat', item: e, cost: foodPerDay });
        } else {
          slots.push({ type: 'eatGeneric', cost: foodPerDay });
        }
        foodTotal += foodPerDay;
        days.push({ day: i + 1, slots });
      }
      const grand = Math.round(stay + actSpent + foodTotal + transport + flights);
      return { tier, hotel, stay, days, actTotal: actSpent, foodTotal, transport, flights, grand };
    };

    // best value: start at the trip's style, step down until it fits the budget
    let plan = null, downgraded = false;
    for (const tier of tiersOrder){
      plan = build(tier);
      if (plan.grand <= budgetTotal * 1.02) break;
      downgraded = true;
    }
    plan.fits = plan.grand <= budgetTotal * 1.02;
    plan.downgraded = downgraded && plan.fits;
    plan.budgetTotal = budgetTotal;
    return plan;
  },
};
