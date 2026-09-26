// SkyWings — shared destinations & route data
// Single source of truth used by destinations.html (directory), booking.html (search + results)
// and my-booking.html (route map). lat/lon are approximate airport coordinates.
const SWA_ROUTES = [
  { city: "New York", country: "United States", code: "JFK", region: "Americas", img: "swa-new-york", days: "Daily", duration: "7h 40m", freqPerWeek: 7, priceFrom: 480, lat: 40.64, lon: -73.78 },
  { city: "Toronto", country: "Canada", code: "YYZ", region: "Americas", img: "swa-toronto", days: "Mon–Sat", duration: "8h 10m", freqPerWeek: 6, priceFrom: 510, lat: 43.68, lon: -79.63 },
  { city: "São Paulo", country: "Brazil", code: "GRU", region: "Americas", img: "swa-sao-paulo", days: "Tue, Thu, Sat", duration: "10h 55m", freqPerWeek: 3, priceFrom: 690, lat: -23.43, lon: -46.47 },
  { city: "London", country: "United Kingdom", code: "LHR", region: "Europe", img: "swa-london", days: "Daily", duration: "6h 20m", freqPerWeek: 7, priceFrom: 420, lat: 51.47, lon: -0.45 },
  { city: "Paris", country: "France", code: "CDG", region: "Europe", img: "swa-paris", days: "Daily", duration: "6h 45m", freqPerWeek: 7, priceFrom: 430, lat: 49.01, lon: 2.55 },
  { city: "Rome", country: "Italy", code: "FCO", region: "Europe", img: "swa-rome", days: "Mon, Wed, Fri, Sun", duration: "7h 10m", freqPerWeek: 4, priceFrom: 445, lat: 41.80, lon: 12.24 },
  { city: "Frankfurt", country: "Germany", code: "FRA", region: "Europe", img: "swa-frankfurt", days: "Daily", duration: "7h 05m", freqPerWeek: 7, priceFrom: 410, lat: 50.03, lon: 8.57 },
  { city: "Dubai", country: "United Arab Emirates", code: "DXB", region: "Middle East", img: "swa-dubai", days: "Daily", duration: "8h 30m", freqPerWeek: 7, priceFrom: 520, lat: 25.25, lon: 55.36 },
  { city: "Doha", country: "Qatar", code: "DOH", region: "Middle East", img: "swa-doha", days: "Mon–Sat", duration: "8h 50m", freqPerWeek: 6, priceFrom: 505, lat: 25.27, lon: 51.61 },
  { city: "Tokyo", country: "Japan", code: "HND", region: "Asia", img: "swa-tokyo", days: "Daily", duration: "13h 15m", freqPerWeek: 7, priceFrom: 780, lat: 35.55, lon: 139.78 },
  { city: "Singapore", country: "Singapore", code: "SIN", region: "Asia", img: "swa-singapore", days: "Daily", duration: "14h 05m", freqPerWeek: 7, priceFrom: 810, lat: 1.36, lon: 103.99 },
  { city: "Beijing", country: "China", code: "PEK", region: "Asia", img: "swa-china", days: "Tue, Thu, Sat, Sun", duration: "12h 40m", freqPerWeek: 4, priceFrom: 750, lat: 40.08, lon: 116.58 },
  { city: "Mumbai", country: "India", code: "BOM", region: "Asia", img: "swa-mumbai", days: "Daily", duration: "9h 20m", freqPerWeek: 7, priceFrom: 640, lat: 19.09, lon: 72.87 },
  { city: "Cairo", country: "Egypt", code: "CAI", region: "Africa", img: "swa-cairo", days: "Mon, Thu, Sat", duration: "9h 45m", freqPerWeek: 3, priceFrom: 560, lat: 30.11, lon: 31.41 },
  { city: "Lagos", country: "Nigeria", code: "LOS", region: "Africa", img: "swa-lagos", days: "Wed, Fri, Sun", duration: "10h 30m", freqPerWeek: 3, priceFrom: 590, lat: 6.58, lon: 3.32 },
  { city: "Nairobi", country: "Kenya", code: "NBO", region: "Africa", img: "swa-nairobi", days: "Tue, Fri", duration: "11h 15m", freqPerWeek: 2, priceFrom: 610, lat: -1.32, lon: 36.93 },
  { city: "Sydney", country: "Australia", code: "SYD", region: "Oceania", img: "swa-sydney", days: "Mon, Wed, Fri, Sun", duration: "15h 40m", freqPerWeek: 4, priceFrom: 920, lat: -33.95, lon: 151.18 },
  { city: "Auckland", country: "New Zealand", code: "AKL", region: "Oceania", img: "swa-auckland", days: "Wed, Sat", duration: "16h 20m", freqPerWeek: 2, priceFrom: 960, lat: -37.01, lon: 174.79 },
];

// SkyWings hub / origin airports (used as "From" options and as map origins)
const SWA_HUBS = [
  { city: "New York", code: "JFK", lat: 40.64, lon: -73.78 },
  { city: "London", code: "LHR", lat: 51.47, lon: -0.45 },
  { city: "Dubai", code: "DXB", lat: 25.25, lon: 55.36 },
  { city: "Singapore", code: "SIN", lat: 1.36, lon: 103.99 },
];

// Look up coordinates for any city known to SkyWings (hub or destination)
function swaFindCoords(cityName) {
  const hub = SWA_HUBS.find(h => h.city === cityName);
  if (hub) return hub;
  const route = SWA_ROUTES.find(r => r.city === cityName);
  return route || null;
}
