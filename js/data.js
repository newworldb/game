'use strict';
const D = {
  DAY_SEC: 1.5,          // real seconds per in-game day at 1x speed
  START_YEAR: 1950,
  START_MONEY: 80000,
  STOCK_CAP: 140,        // industry output stockpile cap
  ST_CARGO_CAP: 160,     // per-cargo cap waiting at a station
  IND_IN_CAP: 200,       // industry input stockpile cap
  TOWN_ACCEPTS: ['food', 'goods', 'tools'],

  CARGOS: {
    pax:   { name: 'Passengers', icon: '🧍', rate: 1.0 },
    grain: { name: 'Grain',      icon: '🌾', rate: 0.8 },
    wood:  { name: 'Wood',       icon: '🪵', rate: 0.8 },
    coal:  { name: 'Coal',       icon: '⚫', rate: 0.8 },
    iron:  { name: 'Iron Ore',   icon: '🪨', rate: 0.8 },
    food:  { name: 'Food',       icon: '🥫', rate: 1.3 },
    goods: { name: 'Goods',      icon: '📦', rate: 1.5 },
    steel: { name: 'Steel',      icon: '🔩', rate: 1.2 },
    tools: { name: 'Tools',      icon: '🔧', rate: 1.8 },
  },

  // inp: cargo consumed; out: cargo produced per day
  INDUSTRIES: {
    farm:      { name: 'Farm',         icon: '🌾', out: { grain: 4 }, count: 3 },
    forest:    { name: 'Lumber Camp',  icon: '🌲', out: { wood: 4 },  count: 3 },
    coalmine:  { name: 'Coal Mine',    icon: '⛏️', out: { coal: 4 },  count: 2 },
    ironmine:  { name: 'Iron Mine',    icon: '🪨', out: { iron: 4 },  count: 2 },
    foodplant: { name: 'Food Plant',   icon: '🥫', inp: ['grain'], out: { food: 4 },  count: 2 },
    sawmill:   { name: 'Sawmill',      icon: '🪚', inp: ['wood'],  out: { goods: 4 }, count: 2 },
    steelmill: { name: 'Steel Mill',   icon: '🏭', inp: ['coal', 'iron'], out: { steel: 3 }, count: 1 },
    toolworks: { name: 'Tool Works',   icon: '🔧', inp: ['steel'], out: { tools: 3 }, count: 1 },
  },

  STATION_TYPES: {
    bus:   { name: 'Bus Stop',     net: 'road', cls: 'pax',   r: 3, cost: 600,  icon: '🚏' },
    truck: { name: 'Truck Stop',   net: 'road', cls: 'cargo', r: 3, cost: 800,  icon: '📦' },
    train: { name: 'Rail Station', net: 'rail', cls: 'both',  r: 4, cost: 4500, icon: '🚉' },
  },

  DEPOT_TYPES: {
    road: { name: 'Road Depot', cost: 1500, icon: '🛻' },
    rail: { name: 'Rail Depot', cost: 4000, icon: '🚧' },
  },

  // speed in tiles per real second at 1x
  MODELS: [
    { id: 'bus50', name: 'Omnibus',        net: 'road', cls: 'pax',   cap: 16,  speed: 2.2, cost: 9000,   run: 60,  year: 1950, icon: '🚌' },
    { id: 'bus75', name: 'City Bus',       net: 'road', cls: 'pax',   cap: 30,  speed: 2.8, cost: 16000,  run: 95,  year: 1975, icon: '🚌' },
    { id: 'bus00', name: 'Bendy Bus',      net: 'road', cls: 'pax',   cap: 48,  speed: 3.0, cost: 27000,  run: 140, year: 2000, icon: '🚌' },
    { id: 'trk50', name: 'Flatbed Truck',  net: 'road', cls: 'cargo', cap: 12,  speed: 2.0, cost: 10000,  run: 70,  year: 1950, icon: '🚚' },
    { id: 'trk75', name: 'Box Truck',      net: 'road', cls: 'cargo', cap: 24,  speed: 2.6, cost: 18000,  run: 105, year: 1975, icon: '🚚' },
    { id: 'trk00', name: 'Semi Trailer',   net: 'road', cls: 'cargo', cap: 38,  speed: 2.8, cost: 29000,  run: 150, year: 2000, icon: '🚚' },
    { id: 'stmp',  name: 'Steam Express',  net: 'rail', cls: 'pax',   cap: 80,  speed: 3.2, cost: 48000,  run: 260, year: 1950, icon: '🚂' },
    { id: 'dslp',  name: 'Diesel Railcar', net: 'rail', cls: 'pax',   cap: 130, speed: 4.4, cost: 85000,  run: 380, year: 1980, icon: '🚆' },
    { id: 'emup',  name: 'Electric EMU',   net: 'rail', cls: 'pax',   cap: 190, speed: 5.4, cost: 150000, run: 520, year: 2005, icon: '🚄' },
    { id: 'stmf',  name: 'Steam Freight',  net: 'rail', cls: 'cargo', cap: 100, speed: 2.6, cost: 52000,  run: 280, year: 1950, icon: '🚂' },
    { id: 'dslf',  name: 'Diesel Freight', net: 'rail', cls: 'cargo', cap: 170, speed: 3.4, cost: 95000,  run: 420, year: 1980, icon: '🚆' },
    { id: 'hvyf',  name: 'Heavy Hauler',   net: 'rail', cls: 'cargo', cap: 260, speed: 4.0, cost: 160000, run: 560, year: 2005, icon: '🚄' },
  ],

  TOWN_NAMES: ['Aldburg','Brookfield','Carlswick','Dunmore','Eastvale','Fairpoint','Granton','Hartfield','Ivydale','Kingsmoor','Larkhill','Midvale','Northam','Oakcrest','Pinewick','Queensferry','Redmont','Stonebridge','Thornby','Ulverton','Westre','Yarrow'],

  LINE_COLORS: ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316','#14b8a6','#ec4899','#84cc16','#06b6d4'],
};
