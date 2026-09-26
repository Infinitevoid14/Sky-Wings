// SkyWings — Flight status: mock lookup by route + date
document.addEventListener('DOMContentLoaded', () => {
  const HUBS = ["New York", "London", "Dubai", "Singapore"];
  const fromSelect = document.getElementById('fs-from');
  const toSelect = document.getElementById('fs-to');
  const dateInput = document.getElementById('fs-date');
  const resultEl = document.getElementById('status-result');

  HUBS.forEach(h => fromSelect.add(new Option(h, h)));
  SWA_ROUTES.forEach(r => toSelect.add(new Option(`${r.city}, ${r.country}`, r.city)));
  toSelect.value = SWA_ROUTES[0].city;

  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;

  function parseDurationToMinutes(duration) {
    const m = (duration || '').match(/(\d+)h\s*(\d+)?m?/);
    if (!m) return 8 * 60;
    return parseInt(m[1], 10) * 60 + parseInt(m[2] || '0', 10);
  }

  document.getElementById('status-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const from = fromSelect.value;
    const to = toSelect.value;
    const date = dateInput.value;
    const route = swaFindCoords(to);
    const origin = swaFindCoords(from);

    if (from === to) {
      resultEl.innerHTML = `<p class="small" style="color:#e0473e;">Please choose two different cities.</p>`;
      return;
    }

    // deterministic-ish mock flight number & scheduled time from route code
    const flightNo = 'SW' + (100 + (route ? route.code.charCodeAt(0) + route.code.charCodeAt(1) : 0) % 800);
    const schedHour = 6 + ((route ? route.code.charCodeAt(2) : 65) % 12);
    const schedTime = `${String(schedHour).padStart(2, '0')}:${route && route.code.length > 2 ? '20' : '00'}`;
    const durationMin = parseDurationToMinutes(route ? route.duration : '8h 00m');

    const depart = new Date(date);
    depart.setHours(schedHour, 20, 0, 0);
    const arrive = new Date(depart.getTime() + durationMin * 60000);
    const now = new Date();

    let status, progress;
    if (now < depart - 40 * 60000) { status = { label: 'Scheduled', cls: 'on-time' }; progress = 0; }
    else if (now < depart) { status = { label: 'Boarding', cls: 'boarding' }; progress = 0; }
    else if (now > arrive) { status = { label: 'Landed', cls: 'landed' }; progress = 1; }
    else { progress = (now - depart) / (arrive - depart); status = { label: `In flight — ${Math.round(progress * 100)}%`, cls: 'boarding' }; }

    const gate = 'A' + (5 + (flightNo.charCodeAt(2) % 20));
    const terminal = 1 + (flightNo.charCodeAt(3) % 3);

    resultEl.innerHTML = `
      <div class="status-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
          <div>
            <span class="eyebrow" style="display:block;">${flightNo}</span>
            <h2 style="margin:4px 0 0;">${from} → ${to}</h2>
          </div>
          <span class="status-pill ${status.cls}">${status.label}</span>
        </div>
        <div class="form-grid" style="margin-top:16px;">
          <div><strong>Scheduled departure</strong><br>${schedTime} · ${date}</div>
          <div><strong>Scheduled arrival</strong><br>${route ? route.duration + ' flight time' : '—'}</div>
          <div><strong>Gate</strong><br>${gate}</div>
          <div><strong>Terminal</strong><br>${terminal}</div>
        </div>
        <div id="fs-map"></div>
      </div>
    `;
    if (origin && route) drawStatusMap(document.getElementById('fs-map'), origin, route, progress);
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function drawStatusMap(container, origin, dest, progress) {
    const W = 640, H = 300;
    const LON_MIN = -170, LON_MAX = 180, LAT_MAX = 78, LAT_MIN = -58;
    function project(lat, lon) {
      const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * W;
      const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;
      return [x, y];
    }
    const [ox, oy] = project(origin.lat, origin.lon);
    const [dx, dy] = project(dest.lat, dest.lon);
    const midX = (ox + dx) / 2;
    const midY = Math.min(oy, dy) - Math.max(40, Math.abs(dx - ox) * 0.15);
    const pathD = `M ${ox} ${oy} Q ${midX} ${midY} ${dx} ${dy}`;

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
