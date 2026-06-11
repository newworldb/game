# BudgetTrip 🇹🇭

**Plan your Thailand trip budget in 30 seconds** — a mobile-first MVP web app.
Pure vanilla JavaScript, no dependencies, no build step beyond a one-file
bundler, everything saves locally in the browser.

## What it does

**The app plans the whole trip for you** — pick a place + budget and the
Itinerary tab lays out a best-value hotel (auto-downgraded to fit your
budget), a day-by-day schedule with real activities and restaurants, and a
total that stays within budget. Every line has a Book button. No searching
needed.


1. **Budget estimator** — pick a destination (12 popular Thai spots from
   Bangkok to Pai), nights, travelers and travel style (backpacker /
   comfortable / premium) and get an instant THB budget broken down into
   accommodation, food, local transport, activities, optional flights,
   shopping and a buffer — built from realistic per-day averages.
2. **Expense tracker** — log spending against the budget while traveling;
   per-category progress bars, remaining-budget header, over-budget warnings.
3. **Monetization: affiliate booking hub** — every trip gets a "Book" tab
   with deep links pre-filled with the trip's destination, dates and party
   size: **Agoda** and **Booking.com** (hotels), **Trip.com** (flights),
   **12Go Asia** (bus/train/ferry — route from Bangkok pre-selected),
   **Klook** (tours & tickets), plus the required affiliate disclosure.
4. **Bilingual** — full ไทย/English toggle, persisted.
5. **Multiple trips, share** — trip cards with budget-vs-spent bars, share a
   trip summary via the native share sheet.

## Affiliate setup (the business part)

Put your partner IDs in [`js/config.js`](js/config.js):

| Field | Program | Sign up |
|-------|---------|---------|
| `agoda_cid` | Agoda Partners | partners.agoda.com |
| `booking_aid` | Booking.com Affiliate | partner.booking.com |
| `klook_aid` | Klook Affiliate (Kreator) | affiliate.klook.com |
| `t12go_z` | 12Go Asia Partner | 12go.asia/en/affiliate |
| `trip_allianceid` + `trip_sid` | Trip.com Affiliate | trip.com/partners |

Links work without IDs (no tracking); with IDs every booking earns your
commission. After editing any `js/*.js` file run `node tools/build.js`.

## Run

```bash
python3 -m http.server 8000   # or: npx serve .
```

## Test

```bash
node test/smoke.js   # destination data, estimates, expense math, affiliate links
```
