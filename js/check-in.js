// SkyWings — Online check-in: look up a saved booking, render a boarding pass
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('checkin-form');
  const errorEl = document.getElementById('checkin-error');
  const resultEl = document.getElementById('boarding-pass-result');

  function getBookings() {
    try { return JSON.parse(localStorage.getItem('swa_bookings')) || []; }
    catch (e) { return []; }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ref = document.getElementById('ci-ref').value.trim().toUpperCase();
    const lastName = document.getElementById('ci-lastname').value.trim().toLowerCase();

    const booking = getBookings().find(b => {
      const leadLast = (b.passengerName || '').trim().split(' ').pop().toLowerCase();
      return b.ref.toUpperCase() === ref && leadLast === lastName;
    });

    if (!booking) {
      errorEl.textContent = "We couldn't find a matching booking. Check your reference and last name, or that you're using the browser you booked from.";
      errorEl.style.display = 'block';
      resultEl.innerHTML = '';
      return;
    }
    errorEl.style.display = 'none';
    renderBoardingPass(booking);
  });

  function seatLabel(booking) {
    return (booking.seats && booking.seats.length) ? booking.seats[0] : '—';
  }

  function renderBoardingPass(booking) {
    const gate = 'B' + (12 + Math.floor(Math.random() * 20));
    const boardingTime = booking.flightTime
      ? shiftTime(booking.flightTime, -40)
      : '—';

    resultEl.innerHTML = `
      <div class="boarding-pass">
        <div class="boarding-pass-main">
          <div class="small" style="color:#cfe8ff;">SkyWings Airlines &middot; Boarding Pass</div>
          <div class="boarding-pass-route">
            <div class="bp-city"><strong>${booking.from.slice(0,3).toUpperCase()}</strong><span class="small" style="color:#cfe8ff;">${booking.from}</span></div>
            <div class="bp-plane">&#9992;&#65039;</div>
            <div class="bp-city"><strong>${booking.to.slice(0,3).toUpperCase()}</strong><span class="small" style="color:#cfe8ff;">${booking.to}</span></div>
          </div>
          <div class="boarding-pass-grid">
            <div><span class="small" style="color:#cfe8ff;">Passenger</span><strong>${booking.passengerName}</strong></div>
            <div><span class="small" style="color:#cfe8ff;">Date</span><strong>${booking.departDate}</strong></div>
            <div><span class="small" style="color:#cfe8ff;">Boarding</span><strong>${boardingTime}</strong></div>
            <div><span class="small" style="color:#cfe8ff;">Seat</span><strong>${seatLabel(booking)}</strong></div>
            <div><span class="small" style="color:#cfe8ff;">Gate</span><strong>${gate}</strong></div>
            <div><span class="small" style="color:#cfe8ff;">Cabin</span><strong>${booking.cabinLabel || '—'}</strong></div>
          </div>
        </div>
        <div class="boarding-pass-stub">
          <div class="small" style="color:#cfe8ff;">${booking.ref}</div>
          <div class="barcode">${booking.ref.replace(/[^A-Z0-9]/g, '')}</div>
        </div>
      </div>
      <p class="small" style="color:#8199ad;text-align:center;margin-top:14px;">You're checked in. Please arrive at the gate at least 30 minutes before boarding.</p>
    `;
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function shiftTime(hhmm, minutesDelta) {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(2000, 0, 1, h, m);
    d.setMinutes(d.getMinutes() + minutesDelta);
    return d.toTimeString().slice(0, 5);
  }
});
