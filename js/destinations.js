// SkyWings — destinations directory: search + region filter
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('route-grid');
  const searchInput = document.getElementById('route-search');
  const filterBar = document.getElementById('region-filters');
  const countEl = document.getElementById('results-count');
  let activeRegion = 'All';

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = SWA_ROUTES.filter(r => {
      const matchesRegion = activeRegion === 'All' || r.region === activeRegion;
      const matchesQuery = !q || r.city.toLowerCase().includes(q) || r.country.toLowerCase().includes(q);
      return matchesRegion && matchesQuery;
    });

    countEl.textContent = filtered.length
      ? `Showing ${filtered.length} of ${SWA_ROUTES.length} destinations`
      : '';

    grid.innerHTML = filtered.length ? filtered.map(r => `
      <div class="route-card">
        <img src="https://picsum.photos/seed/${r.img}/600/400" alt="${r.city}, ${r.country}" loading="lazy">
        <div class="route-body">
          <div class="route-top">
            <h4>${r.city} <span class="small" style="color:#8199ad;">${r.code}</span></h4>
            <span class="route-region">${r.region}</span>
          </div>
          <p class="small" style="color:#56697d;margin:0;">${r.country}</p>
          <div class="route-meta">
            <span>✈ ${r.days}</span>
            <span>⏱ ${r.duration}</span>
          </div>
          <div class="route-price">
            <div><span class="from">Fares from</span><br><strong>$${r.priceFrom}</strong></div>
            <a href="booking.html?to=${encodeURIComponent(r.city)}">Book flight →</a>
          </div>
        </div>
      </div>
    `).join('') : `<p class="no-results">No destinations match your search. Try a different city or country.</p>`;
  }

  searchInput.addEventListener('input', render);
  filterBar.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRegion = btn.dataset.region;
      render();
    });
  });

  render();
});
