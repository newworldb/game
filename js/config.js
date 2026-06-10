'use strict';
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
