// SkyWings — My Trips: booking lookup + simple flight-locator map
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('lookup-form');
  const refInput = document.getElementById('lookup-ref');
  const emailInput = document.getElementById('lookup-email');
  const errorEl = document.getElementById('lookup-error');
  const resultEl = document.getElementById('trip-result');
  const hintEl = document.getElementById('saved-trips-hint');

  function getBookings() {
    try { return JSON.parse(localStorage.getItem('swa_bookings')) || []; }
    catch (e) { return []; }
  }

  function renderHint() {
    const bookings = getBookings();
    if (!bookings.length) {
      hintEl.textContent = "No bookings saved in this browser yet — complete a booking to see it here.";
      return;
    }
    hintEl.innerHTML = `Saved in this browser: ` + bookings.map(b =>
      `<a href="#" class="quick-ref" data-ref="${b.ref}" data-email="${b.passengerEmail}">${b.ref}</a>`
    ).join(', ');
    hintEl.querySelectorAll('.quick-ref').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        refInput.value = a.dataset.ref;
        emailInput.value = a.dataset.email;
        doLookup();
      });
    });
  }

  function doLookup() {
    const ref = refInput.value.trim().toUpperCase();
    const email = emailInput.value.trim().toLowerCase();
    const booking = getBookings().find(b =>
      b.ref.toUpperCase() === ref && b.passengerEmail.toLowerCase() === email
    );
    if (!booking) {
      errorEl.textContent = "We couldn't find a booking with that reference and email. Bookings are only saved in the browser you booked from.";
      errorEl.style.display = 'block';
      resultEl.innerHTML = '';
      return;
    }
    errorEl.style.display = 'none';
    renderTrip(booking);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    doLookup();
  });

  // Auto-fill + auto-search from query params (e.g. redirected from booking confirmation)
  const params = new URLSearchParams(window.location.search);
  if (params.get('ref')) refInput.value = params.get('ref');
  if (params.get('email')) emailInput.value = params.get('email');
  if (params.get('ref') && params.get('email')) doLookup();

  renderHint();

  // ---------- Flight status from stored date/time + route duration ----------
  function parseDurationToMinutes(duration) {
    const m = (duration || '').match(/(\d+)h\s*(\d+)?m?/);
    if (!m) return 8 * 60;
    return parseInt(m[1], 10) * 60 + parseInt(m[2] || '0', 10);
  }

  function getFlightStatus(booking, route) {
    const durationMin = parseDurationToMinutes(route ? route.duration : '8h 00m');
    const [h, m] = (booking.flightTime || '09:00').split(':').map(Number);
    const depart = new Date(booking.departDate);
    depart.setHours(h || 9, m || 0, 0, 0);
    const arrive = new Date(depart.getTime() + durationMin * 60000);
    const now = new Date();

    if (now < depart) return { label: 'Scheduled', progress: 0 };
    if (now > arrive) return { label: 'Landed', progress: 1 };
    const progress = (now - depart) / (arrive - depart);
    return { label: `In flight — ${Math.round(progress * 100)}% complete`, progress };
  }

  // ---------- Render trip card + map ----------
  function renderTrip(booking) {
    const route = swaFindCoords(booking.to);
    const origin = swaFindCoords(booking.from);
    const status = getFlightStatus(booking, route);

    resultEl.innerHTML = `
      <div class="wizard-layout" style="margin-top:10px;">
        <div class="wizard-panel">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
            <div>
              <span class="eyebrow" style="display:block;">${booking.ref}</span>
              <h2 style="margin:4px 0 0;">${booking.from} → ${booking.to}</h2>
            </div>
            <span class="route-region" style="background:${status.label === 'Landed' ? '#e7f8ee' : status.label === 'Scheduled' ? '#e7f3ff' : '#fff3ea'};color:${status.label === 'Landed' ? '#1a9b52' : status.label === 'Scheduled' ? '#0a6cff' : '#c96a1f'};">${status.label}</span>
          </div>
          <div id="route-map"></div>
          <div class="form-grid" style="margin-top:10px;">
            <div><strong>Depart</strong><br>${booking.departDate}${booking.flightTime ? ' · ' + booking.flightTime : ''}</div>
            <div><strong>Trip type</strong><br>${booking.tripType === 'round' ? 'Round trip (return ' + booking.returnDate + ')' : 'One way'}</div>
            <div><strong>Cabin</strong><br>${booking.cabinLabel}${booking.fareLabel ? ' · ' + booking.fareLabel + ' fare' : ''}</div>
            <div><strong>Passengers</strong><br>${(booking.passengerNames && booking.passengerNames.length ? booking.passengerNames.join(', ') : booking.passengers)}</div>
            <div><strong>Seats</strong><br>${booking.seats.join(', ')}</div>
            <div><strong>Total paid</strong><br>$${booking.total}${booking.cardLast4 ? ' · card ••' + booking.cardLast4 : ''}</div>
            <div class="full"><strong>Lead passenger</strong><br>${booking.passengerName} · ${booking.passengerEmail}</div>
          </div>
        </div>
      </div>
    `;
    drawMap(document.getElementById('route-map'), origin, route, status.progress);
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Simple equirectangular route map (SVG, no external map tiles) ----------
  function drawMap(container, origin, dest, progress) {
    const W = 640, H = 320;
    const LON_MIN = -170, LON_MAX = 180, LAT_MAX = 78, LAT_MIN = -58;

    function project(lat, lon) {
      const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
      const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
      return [x, y];
    }

    if (!origin || !dest) {
      container.innerHTML = `<p class="small" style="color:#8199ad;">Map unavailable for this route.</p>`;
      return;
    }

    const [ox, oy] = project(origin.lat, origin.lon);
    const [dx, dy] = project(dest.lat, dest.lon);
    const midX = (ox + dx) / 2;
    const midY = Math.min(oy, dy) - Math.max(40, Math.abs(dx - ox) * 0.15);
    const pathD = `M ${ox} ${oy} Q ${midX} ${midY} ${dx} ${dy}`;

    // graticule (grid) lines for a "map" feel without needing landmass artwork
    let grid = '';
    for (let lon = -150; lon <= 150; lon += 30) {
      const [x1, y1] = project(LAT_MAX, lon);
      const [x2, y2] = project(LAT_MIN, lon);
      grid += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="graticule"/>`;
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [x1, y1] = project(lat, LON_MIN);
      const [x2, y2] = project(lat, LON_MAX);
      grid += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="graticule"/>`;
    }

    // plane position along the quadratic bezier at t = progress
    const t = Math.max(0, Math.min(1, progress));
    const bx = (1 - t) * (1 - t) * ox + 2 * (1 - t) * t * midX + t * t * dx;
    const by = (1 - t) * (1 - t) * oy + 2 * (1 - t) * t * midY + t * t * dy;
    const tx = 2 * (1 - t) * (midX - ox) + 2 * t * (dx - midX);
    const ty = 2 * (1 - t) * (midY - oy) + 2 * t * (dy - midY);
    const angle = Math.atan2(ty, tx) * 180 / Math.PI;

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="route-map-svg" role="img" aria-label="Map showing flight route from ${origin.city} to ${dest.city}">
        <rect x="0" y="0" width="${W}" height="${H}" rx="12" class="map-bg"/>
        ${grid}
        <path d="${pathD}" class="map-route"/>
        <circle cx="${ox}" cy="${oy}" r="6" class="map-pin origin"/>
        <text x="${ox}" y="${oy - 12}" class="map-label">${origin.city}</text>
        <circle cx="${dx}" cy="${dy}" r="6" class="map-pin dest"/>
        <text x="${dx}" y="${dy - 12}" class="map-label">${dest.city}</text>
        ${progress > 0 && progress < 1 ? `<g transform="translate(${bx},${by}) rotate(${angle})"><path d="M -8 0 L 6 -5 L 10 0 L 6 5 Z" class="map-plane"/></g>` : ''}
      </svg>
    `;
  }
});
