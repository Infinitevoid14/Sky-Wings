// SkyWings — homepage hero search widget: populate cities + min date
document.addEventListener('DOMContentLoaded', () => {
  const HUBS = ["New York", "London", "Dubai", "Singapore"];
  const fromSelect = document.getElementById('hs-from');
  const toSelect = document.getElementById('hs-to');
  const dateInput = document.getElementById('hs-date');
  if (!fromSelect || !toSelect) return;

  HUBS.forEach(h => fromSelect.add(new Option(h, h)));
  SWA_ROUTES.forEach(r => toSelect.add(new Option(`${r.city}, ${r.country}`, r.city)));

  const today = new Date().toISOString().split('T')[0];
  dateInput.min = today;
  dateInput.value = today;
});
