// SkyWings — booking wizard: search -> flights -> fare -> seats -> details -> payment -> confirmation
document.addEventListener('DOMContentLoaded', () => {
  const HUBS = ["New York", "London", "Dubai", "Singapore"];
  const CABIN_MULTIPLIER = { economy: 1, premium: 1.6, business: 2.8 };
  const CABIN_LABEL = { economy: "Economy", premium: "Premium Economy", business: "Business" };
  const SEAT_ADDON = { economy: 0, premium: 35, business: 120 };
  const FARE_TYPES = {
    basic: { key: 'basic', label: 'Basic', tag: null, multiplier: 0.85, bags: 0, changes: false, refundable: false, priority: false },
    standard: { key: 'standard', label: 'Standard', tag: 'Most popular', multiplier: 1.0, bags: 1, changes: 'fee', refundable: false, priority: false },
    flex: { key: 'flex', label: 'Flex', tag: 'Best flexibility', multiplier: 1.35, bags: 2, changes: true, refundable: true, priority: true },
  };
  const PROMO_CODES = { SKY10: 0.10, WELCOME15: 0.15 };

  const state = {
    step: 1,
    tripType: 'round',
    from: '', to: '',
    departDate: '', returnDate: '',
    adults: 1, children: 0,
    cabin: 'economy',
    flights: [],
    selectedFlight: null,
    fareType: null,
    seatsNeeded: 1,
    selectedSeats: [],
    seatMap: [],
    passengers: [],
    contact: { email: '', phone: '' },
    extras: { bag: false, meal: false, insurance: false },
    promoCode: null,
    discountPct: 0,
    confirmed: false,
    bookingRef: null,
  };

  // ---------- Setup selects ----------
  const fromSelect = document.getElementById('from-city');
  const toSelect = document.getElementById('to-city');
  HUBS.forEach(h => fromSelect.add(new Option(h, h)));
  SWA_ROUTES.forEach(r => toSelect.add(new Option(`${r.city}, ${r.country}`, r.city)));

  const params = new URLSearchParams(window.location.search);
  const preselectTo = params.get('to');
  if (preselectTo && SWA_ROUTES.some(r => r.city === preselectTo)) {
    toSelect.value = preselectTo;
  }
  const preselectFrom = params.get('from');
  fromSelect.value = (preselectFrom && HUBS.includes(preselectFrom)) ? preselectFrom : HUBS[0];

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('depart-date').min = today;
  document.getElementById('return-date').min = today;
  document.getElementById('depart-date').value = params.get('date') || today;

  const preselectCabin = params.get('cabin');
  if (preselectCabin && CABIN_LABEL[preselectCabin]) {
    document.getElementById('cabin-class').value = preselectCabin;
  }
  const preselectTrip = params.get('trip');
  if (preselectTrip === 'oneway') {
    document.querySelectorAll('[data-trip]').forEach(b => b.classList.toggle('active', b.dataset.trip === 'oneway'));
    state.tripType = 'oneway';
    document.getElementById('return-date-wrap').style.display = 'none';
  }

  // ---------- Trip type ----------
  document.querySelectorAll('[data-trip]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-trip]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tripType = btn.dataset.trip;
      document.getElementById('return-date-wrap').style.display = state.tripType === 'round' ? 'block' : 'none';
    });
  });

  // ---------- Passenger steppers ----------
  document.querySelectorAll('[data-adj]').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.adj;
      const dir = parseInt(btn.dataset.dir, 10);
      const min = field === 'adults' ? 1 : 0;
      const max = field === 'adults' ? 6 : 4;
      state[field] = Math.min(max, Math.max(min, state[field] + dir));
      document.getElementById(`${field}-count`).textContent = state[field];
    });
  });

  // ---------- Step navigation ----------
  function goToStep(n) {
    state.step = n;
    document.querySelectorAll('.wizard-step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    document.querySelectorAll('#wizard-progress li').forEach(li => {
      const s = Number(li.dataset.step);
      li.classList.toggle('done', s < n);
      li.classList.toggle('current', s === n);
    });
    window.scrollTo({ top: document.querySelector('.wizard-progress').offsetTop - 90, behavior: 'smooth' });
  }
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => goToStep(Number(btn.dataset.back)));
  });

  // ---------- Step 1 -> search ----------
  document.getElementById('to-step-2').addEventListener('click', () => {
    const errEl = document.getElementById('search-error');
    state.from = fromSelect.value;
    state.to = toSelect.value;
    state.departDate = document.getElementById('depart-date').value;
    state.returnDate = document.getElementById('return-date').value;
    state.cabin = document.getElementById('cabin-class').value;

    if (state.from === state.to) {
      errEl.textContent = 'Please choose two different cities.';
      errEl.style.display = 'block';
      return;
    }
    if (!state.departDate || (state.tripType === 'round' && !state.returnDate)) {
      errEl.textContent = 'Please select your travel date(s).';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    state.seatsNeeded = state.adults + state.children;

    buildFlights();
    renderFlights();
    renderSummary();
    goToStep(2);
  });

  // ---------- Build mock flight options ----------
  function buildFlights() {
    const route = SWA_ROUTES.find(r => r.city === state.to);
    const base = route ? route.priceFrom : 500;
    const paxCount = state.adults + Math.max(state.children * 0.75, 0);
    const cabinMult = CABIN_MULTIPLIER[state.cabin];

    const options = [
      { id: 'f1', depart: '08:20', stops: 'Nonstop', duration: route ? route.duration : '—', priceEach: base * cabinMult, amenities: ['Wi-Fi', 'Meal included', 'Entertainment'] },
      { id: 'f2', depart: '18:45', stops: 'Nonstop', duration: route ? route.duration : '—', priceEach: (base + 40) * cabinMult, amenities: ['Wi-Fi', 'Meal included', 'Extra legroom'] },
      { id: 'f3', depart: '05:10', stops: '1 stop', duration: route ? addHours(route.duration, 3) : '—', priceEach: Math.max(base - 60, 120) * cabinMult, amenities: ['Wi-Fi', 'Snack service'] },
    ];
    state.flights = options.map(o => ({ ...o, total: Math.round(o.priceEach * paxCount) }));
  }

  function addHours(durationStr, extra) {
    const m = durationStr.match(/(\d+)h\s*(\d+)?m?/);
    if (!m) return durationStr;
    const h = parseInt(m[1], 10) + extra;
    const min = m[2] || '00';
    return `${h}h ${min}m`;
  }

  function renderFlights() {
    const el = document.getElementById('flight-results');
    document.getElementById('results-summary').textContent =
      `${state.from} → ${state.to} · ${state.departDate}${state.tripType === 'round' ? ' – ' + state.returnDate : ''} · ${CABIN_LABEL[state.cabin]} · ${state.seatsNeeded} passenger(s)`;

    el.innerHTML = state.flights.map(f => `
      <div class="flight-card" data-flight="${f.id}">
        <div>
          <div class="flight-route">
            <div class="flight-time"><strong>${f.depart}</strong><span>${state.from.slice(0,3).toUpperCase()}</span></div>
            <div class="flight-line"><span>${f.duration}</span><hr>${f.stops}</div>
            <div class="flight-time"><strong>—</strong><span>${state.to.slice(0,3).toUpperCase()}</span></div>
          </div>
          <div class="flight-info">SkyWings · ${CABIN_LABEL[state.cabin]}</div>
          <div class="flight-amenities">${f.amenities.map(a => `<span>${a}</span>`).join('')}</div>
        </div>
        <div class="flight-price"><strong>$${f.total}</strong><span>total for ${state.seatsNeeded} pax</span></div>
      </div>
    `).join('');

    el.querySelectorAll('.flight-card').forEach(card => {
      card.addEventListener('click', () => {
        el.querySelectorAll('.flight-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.selectedFlight = state.flights.find(f => f.id === card.dataset.flight);
        document.getElementById('to-step-3').disabled = false;
        renderSummary();
      });
    });
  }

  document.getElementById('to-step-3').addEventListener('click', () => {
    renderFareGrid();
    goToStep(3);
  });

  // ---------- Step 3: fare type ----------
  function renderFareGrid() {
    const grid = document.getElementById('fare-grid');
    const baseTotal = state.selectedFlight ? state.selectedFlight.total : 0;

    grid.innerHTML = Object.values(FARE_TYPES).map(f => `
      <div class="fare-card ${state.fareType === f.key ? 'selected' : ''}" data-fare="${f.key}">
        ${f.tag ? `<span class="fare-badge">${f.tag}</span>` : ''}
        <h4>${f.label}</h4>
        <div class="fare-price">$${Math.round(baseTotal * f.multiplier)}<span> total</span></div>
        <ul>
          <li>${f.bags} checked bag${f.bags === 1 ? '' : 's'} included</li>
          <li class="${f.changes ? '' : 'no'}">${f.changes === true ? 'Free date changes' : f.changes === 'fee' ? 'Changes for a fee' : 'No date changes'}</li>
          <li class="${f.refundable ? '' : 'no'}">${f.refundable ? 'Refundable' : 'Non-refundable'}</li>
          <li class="${f.priority ? '' : 'no'}">${f.priority ? 'Priority boarding' : 'Standard boarding'}</li>
        </ul>
      </div>
    `).join('');

    grid.querySelectorAll('.fare-card').forEach(card => {
      card.addEventListener('click', () => {
        grid.querySelectorAll('.fare-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        state.fareType = card.dataset.fare;
        document.getElementById('to-step-4').disabled = false;
        updateBagExtraUI();
        renderSummary();
      });
    });
  }

  function updateBagExtraUI() {
    const fare = FARE_TYPES[state.fareType];
    const priceEl = document.getElementById('bag-price');
    const descEl = document.getElementById('bag-desc');
    if (!fare) return;
    if (fare.bags > 0) {
      priceEl.textContent = 'Included';
      descEl.textContent = `Included with your ${fare.label} fare`;
    } else {
      priceEl.textContent = '$40';
      descEl.textContent = 'Per passenger';
    }
  }

  document.getElementById('to-step-4').addEventListener('click', () => {
    buildSeatMap();
    renderSeatMap();
    document.getElementById('seats-needed').textContent = state.seatsNeeded;
    goToStep(4);
  });

  // ---------- Step 4: seat map ----------
  function buildSeatMap() {
    if (state.seatMap.length) return; // build once per session
    const rows = 10;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const map = [];
    for (let r = 1; r <= rows; r++) {
      let type = 'economy';
      if (r <= 2) type = 'business';
      else if (r <= 4) type = 'premium';
      cols.forEach(c => {
        map.push({ id: `${r}${c}`, row: r, col: c, type, taken: Math.random() < 0.15 });
      });
    }
    state.seatMap = map;
  }

  function renderSeatMap() {
    state.selectedSeats = [];
    document.getElementById('to-step-5').disabled = true;
    const el = document.getElementById('seat-map');
    el.innerHTML = state.seatMap.map(s =>
      `<div class="seat ${s.type} ${s.taken ? 'taken' : ''}" data-seat="${s.id}" title="Seat ${s.id} · ${s.type}${SEAT_ADDON[s.type] ? ' +$' + SEAT_ADDON[s.type] : ''}">${s.id}</div>`
    ).join('');

    el.querySelectorAll('.seat:not(.taken)').forEach(seatEl => {
      seatEl.addEventListener('click', () => {
        const id = seatEl.dataset.seat;
        const idx = state.selectedSeats.indexOf(id);
        if (idx > -1) {
          state.selectedSeats.splice(idx, 1);
          seatEl.classList.remove('selected');
        } else {
          if (state.selectedSeats.length >= state.seatsNeeded) return;
          state.selectedSeats.push(id);
          seatEl.classList.add('selected');
        }
        document.getElementById('to-step-5').disabled = state.selectedSeats.length !== state.seatsNeeded;
        renderSummary();
      });
    });
  }

  document.getElementById('to-step-5').addEventListener('click', () => {
    renderPassengerForms();
    goToStep(5);
  });

  // ---------- Step 5: passenger details + extras ----------
  function renderPassengerForms() {
    const wrap = document.getElementById('passenger-form-list');
    if (!state.passengers.length || state.passengers.length !== state.seatsNeeded) {
      state.passengers = Array.from({ length: state.seatsNeeded }, () => ({ name: '' }));
    }
    wrap.innerHTML = state.passengers.map((p, i) => `
      <div class="passenger-form-item">
        <h4>Passenger ${i + 1}${i === 0 ? ' (Lead passenger)' : ''} · Seat ${state.selectedSeats[i] || '—'}</h4>
        <div class="form-grid">
          <div class="full">
            <label for="pax-name-${i}">Full name</label>
            <input type="text" id="pax-name-${i}" placeholder="As shown on ID or passport" value="${p.name}">
          </div>
        </div>
      </div>
    `).join('');
  }

  ['extra-bag', 'extra-meal', 'extra-insurance'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      const key = id.replace('extra-', '');
      state.extras[key] = e.target.checked;
      renderSummary();
    });
  });

  document.getElementById('to-step-6').addEventListener('click', () => {
    const errEl = document.getElementById('details-error');
    let allNamed = true;
    state.passengers = state.passengers.map((p, i) => {
      const val = document.getElementById(`pax-name-${i}`).value.trim();
      if (!val) allNamed = false;
      return { name: val };
    });
    const email = document.getElementById('pax-email').value.trim();
    const phone = document.getElementById('pax-phone').value.trim();

    if (!allNamed || !email || !phone) {
      errEl.textContent = "Please enter every passenger's name and your contact email and phone.";
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';
    state.contact = { email, phone };
    renderPayment();
    goToStep(6);
  });

  // ---------- Pricing ----------
  function computeTotals() {
    const fare = FARE_TYPES[state.fareType] || { multiplier: 1, bags: 0 };
    const base = state.selectedFlight ? Math.round(state.selectedFlight.total * fare.multiplier) : 0;
    const seatAddon = state.selectedSeats.reduce((sum, id) => {
      const seat = state.seatMap.find(s => s.id === id);
      return sum + (seat ? SEAT_ADDON[seat.type] : 0);
    }, 0);
    const pax = state.seatsNeeded || 1;
    const bagPrice = fare.bags > 0 ? 0 : 40;
    const extrasTotal = (state.extras.bag ? bagPrice * pax : 0) + (state.extras.meal ? 15 * pax : 0) + (state.extras.insurance ? 25 * pax : 0);
    const preDiscount = base + seatAddon + extrasTotal;
    const discountAmount = Math.round(preDiscount * (state.discountPct || 0));
    return { base, seatAddon, extrasTotal, discountAmount, total: preDiscount - discountAmount };
  }

  // ---------- Sidebar summary ----------
  function renderSummary() {
    const el = document.getElementById('summary-body');
    if (!state.selectedFlight && state.step < 2) {
      el.innerHTML = `<p class="summary-empty">Search a route to see your fare summary here.</p>`;
      return;
    }
    const t = computeTotals();
    el.innerHTML = `
      <div class="summary-row"><span>${state.from} → ${state.to}</span><span>${state.departDate}</span></div>
      <div class="summary-row"><span>Cabin</span><span>${CABIN_LABEL[state.cabin]}</span></div>
      ${state.fareType ? `<div class="summary-row"><span>Fare</span><span>${FARE_TYPES[state.fareType].label}</span></div>` : ''}
      <div class="summary-row"><span>Passengers</span><span>${state.seatsNeeded}</span></div>
      ${state.selectedFlight ? `<div class="summary-row"><span>Base fare</span><span>$${t.base}</span></div>` : ''}
      ${state.selectedSeats.length ? `<div class="summary-row"><span>Seats (${state.selectedSeats.join(', ')})</span><span>$${t.seatAddon}</span></div>` : ''}
      ${t.extrasTotal ? `<div class="summary-row"><span>Extras</span><span>$${t.extrasTotal}</span></div>` : ''}
      ${t.discountAmount ? `<div class="summary-row"><span>Promo (${state.promoCode})</span><span>−$${t.discountAmount}</span></div>` : ''}
      <div class="summary-row total"><span>Total</span><span>$${t.total}</span></div>
    `;
  }

  // ---------- Step 6: payment ----------
  function renderPayment() {
    const t = computeTotals();
    const fare = FARE_TYPES[state.fareType];
    document.getElementById('payment-content').innerHTML = `
      <h2>Review &amp; pay</h2>
      <div class="pay-summary">
        <div class="summary-row"><span><strong>${state.from} → ${state.to}</strong></span><span>${state.departDate}</span></div>
        <div class="summary-row"><span>${fare.label} fare · ${CABIN_LABEL[state.cabin]}</span><span>${state.seatsNeeded} passenger(s)</span></div>
        <div class="summary-row"><span>Seats</span><span>${state.selectedSeats.join(', ')}</span></div>
        <div class="summary-row"><span>Lead passenger</span><span>${state.passengers[0].name}</span></div>
      </div>

      <div class="promo-row">
        <input type="text" id="promo-input" placeholder="Promo code (try SKY10)" value="${state.promoCode || ''}">
        <button type="button" class="btn btn-ghost" id="apply-promo">Apply</button>
      </div>
      <p id="promo-msg" class="promo-msg"></p>

      <div class="summary-row"><span>Base fare</span><span>$${t.base}</span></div>
      <div class="summary-row"><span>Seat selection</span><span>$${t.seatAddon}</span></div>
      <div class="summary-row"><span>Extras</span><span>$${t.extrasTotal}</span></div>
      ${t.discountAmount ? `<div class="summary-row"><span>Discount</span><span>−$${t.discountAmount}</span></div>` : ''}
      <div class="summary-row total" id="payment-total-row"><span>Total due</span><span>$${t.total}</span></div>

      <h3 style="margin-top:22px;">Pay with card</h3>
      <div class="pay-tabs">
        <button type="button" class="active">Credit / Debit Card</button>
      </div>

      <div class="card-visual">
        <div class="card-row"><span>SkyWings Card</span><span>💳</span></div>
        <div class="card-number" id="card-visual-number">•••• •••• •••• ••••</div>
        <div class="card-row">
          <div><span>Card holder</span><strong id="card-visual-name">YOUR NAME</strong></div>
          <div><span>Expires</span><strong id="card-visual-expiry">MM/YY</strong></div>
        </div>
      </div>

      <div class="card-form-grid">
        <div class="full">
          <label for="card-name">Name on card</label>
          <input type="text" id="card-name" placeholder="Full name">
          <div class="field-error-msg" id="err-card-name">Enter the name on the card.</div>
        </div>
        <div class="full">
          <label for="card-number">Card number</label>
          <input type="text" id="card-number" inputmode="numeric" placeholder="1234 5678 9012 3456" maxlength="23">
          <div class="field-error-msg" id="err-card-number">Enter a valid card number.</div>
        </div>
        <div>
          <label for="card-expiry">Expiry (MM/YY)</label>
          <input type="text" id="card-expiry" inputmode="numeric" placeholder="MM/YY" maxlength="5">
          <div class="field-error-msg" id="err-card-expiry">Enter a valid, unexpired date.</div>
        </div>
        <div>
          <label for="card-cvv">CVV</label>
          <input type="text" id="card-cvv" inputmode="numeric" placeholder="123" maxlength="4">
          <div class="field-error-msg" id="err-card-cvv">Enter a valid CVV.</div>
        </div>
        <div class="full">
          <label for="card-zip">Billing ZIP / postal code</label>
          <input type="text" id="card-zip" placeholder="10001">
          <div class="field-error-msg" id="err-card-zip">Enter your billing ZIP/postal code.</div>
        </div>
      </div>

      <label class="terms-row">
        <input type="checkbox" id="terms-check">
        <span>I agree to the fare rules for my selected fare (${fare.label}) and SkyWings' terms of carriage.</span>
      </label>
      <div class="field-error-msg" id="err-terms">Please accept the terms to continue.</div>

      <div class="wizard-actions">
        <button class="btn btn-ghost" data-back="5">Back</button>
        <button class="btn btn-primary" id="pay-now">Pay $${t.total}</button>
      </div>
      <p class="secure-note">🔒 Demo payment form — no real card data is sent or stored.</p>
    `;

    // re-bind back button (new DOM)
    document.querySelector('#payment-content [data-back="5"]').addEventListener('click', () => goToStep(5));

    // promo
    document.getElementById('apply-promo').addEventListener('click', applyPromo);
    document.getElementById('promo-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });

    // card formatting + live visual
    const numberInput = document.getElementById('card-number');
    numberInput.addEventListener('input', () => {
      numberInput.value = numberInput.value.replace(/[^\d]/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
      document.getElementById('card-visual-number').textContent = numberInput.value || '•••• •••• •••• ••••';
    });
    const nameInput = document.getElementById('card-name');
    nameInput.addEventListener('input', () => {
      document.getElementById('card-visual-name').textContent = nameInput.value.toUpperCase() || 'YOUR NAME';
    });
    const expiryInput = document.getElementById('card-expiry');
    expiryInput.addEventListener('input', () => {
      let v = expiryInput.value.replace(/[^\d]/g, '').slice(0, 4);
      if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
      expiryInput.value = v;
      document.getElementById('card-visual-expiry').textContent = v || 'MM/YY';
    });
    document.getElementById('card-cvv').addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
    });

    document.getElementById('pay-now').addEventListener('click', handlePay);
    renderSummary();
  }

  function applyPromo() {
    const code = document.getElementById('promo-input').value.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      state.promoCode = code;
      state.discountPct = PROMO_CODES[code];
    } else {
      state.promoCode = code ? null : null;
      state.discountPct = 0;
    }
    const invalidCode = code && !PROMO_CODES[code];
    renderPayment();
    document.getElementById('promo-input').value = code;
    const msgEl = document.getElementById('promo-msg');
    if (state.promoCode) {
      msgEl.textContent = `Code applied — ${Math.round(state.discountPct * 100)}% off your fare and seats.`;
      msgEl.className = 'promo-msg ok';
    } else if (invalidCode) {
      msgEl.textContent = "That code isn't valid.";
      msgEl.className = 'promo-msg err';
    }
  }

  function luhnValid(num) {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 13) return false;
    let sum = 0, alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i], 10);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function expiryValid(str) {
    const m = str.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    const month = parseInt(m[1], 10);
    const year = 2000 + parseInt(m[2], 10);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const expiry = new Date(year, month, 0, 23, 59, 59);
    return expiry >= now;
  }

  function showFieldError(id, show) {
    const err = document.getElementById(`err-${id}`);
    const input = document.getElementById(id === 'terms' ? 'terms-check' : id);
    if (err) err.style.display = show ? 'block' : 'none';
    if (input && id !== 'terms') input.classList.toggle('field-error', show);
  }

  function handlePay() {
    const name = document.getElementById('card-name').value.trim();
    const number = document.getElementById('card-number').value;
    const expiry = document.getElementById('card-expiry').value;
    const cvv = document.getElementById('card-cvv').value;
    const zip = document.getElementById('card-zip').value.trim();
    const terms = document.getElementById('terms-check').checked;

    const nameOk = name.length > 1;
    const numberOk = luhnValid(number);
    const expiryOk = expiryValid(expiry);
    const cvvOk = cvv.length >= 3;
    const zipOk = zip.length >= 3;

    showFieldError('card-name', !nameOk);
    showFieldError('card-number', !numberOk);
    showFieldError('card-expiry', !expiryOk);
    showFieldError('card-cvv', !cvvOk);
    showFieldError('card-zip', !zipOk);
    showFieldError('terms', !terms);

    if (!(nameOk && numberOk && expiryOk && cvvOk && zipOk && terms)) return;

    confirmBooking(number.replace(/\s/g, '').slice(-4));
  }

  // ---------- Confirmation ----------
  function confirmBooking(cardLast4) {
    state.confirmed = true;
    state.bookingRef = 'SWA-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const t = computeTotals();
    const fare = FARE_TYPES[state.fareType];

    saveBooking({
      ref: state.bookingRef,
      from: state.from,
      to: state.to,
      departDate: state.departDate,
      returnDate: state.tripType === 'round' ? state.returnDate : null,
      tripType: state.tripType,
      cabin: state.cabin,
      cabinLabel: CABIN_LABEL[state.cabin],
      fareType: fare.key,
      fareLabel: fare.label,
      passengers: state.seatsNeeded,
      passengerNames: state.passengers.map(p => p.name),
      seats: state.selectedSeats,
      passengerName: state.passengers[0].name,
      passengerEmail: state.contact.email,
      flightTime: state.selectedFlight ? state.selectedFlight.depart : '',
      promoCode: state.promoCode,
      total: t.total,
      cardLast4,
      bookedAt: new Date().toISOString(),
    });

    document.getElementById('payment-content').innerHTML = `
      <div class="confirmation">
        <div class="check">✓</div>
        <h2>Payment successful — booking confirmed</h2>
        <p>Charged to card ending <strong>${cardLast4}</strong>. A confirmation has been sent to <strong>${state.contact.email}</strong>.</p>
        <div class="booking-ref">${state.bookingRef}</div>
        <p class="small" style="color:#56697d;">${state.from} → ${state.to} · ${state.departDate} · ${fare.label} · ${CABIN_LABEL[state.cabin]} · Seats ${state.selectedSeats.join(', ')} · Total paid $${t.total}</p>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;flex-wrap:wrap;">
          <a href="my-booking.html?ref=${state.bookingRef}&email=${encodeURIComponent(state.contact.email)}" class="btn btn-primary" style="text-decoration:none;">View my trip &amp; flight map</a>
          <a href="index.html" class="btn btn-ghost" style="text-decoration:none;">Back to home</a>
        </div>
      </div>
    `;
    document.querySelectorAll('#wizard-progress li').forEach(li => li.classList.add('done'));
  }

  function saveBooking(booking) {
    let bookings = [];
    try { bookings = JSON.parse(localStorage.getItem('swa_bookings')) || []; } catch (e) { bookings = []; }
    bookings.push(booking);
    localStorage.setItem('swa_bookings', JSON.stringify(bookings));
  }

});
