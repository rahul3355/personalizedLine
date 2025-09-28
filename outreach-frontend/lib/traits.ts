export async function collectTraits() {
  // 1. geo with 1 retry + fallback
  let geo: any = await fetch("https://ipapi.co/json")
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .catch(() =>
      fetch("https://freeipapi.com/api/json")
        .then(r => (r.ok ? r.json() : {}))
        .catch(() => ({}))
    );

  // 2. if still null → log so you know
  if (!geo.ip) console.warn("Geo lookup failed; all location fields will be null");

  return {
    ip_address: geo.ip || null,
    country: geo.country_name || geo.country || null,
    city: geo.city || null,
    timezone: geo.timezone || null,
    screen_width: window.screen.width,
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    memory_gb: (navigator as any).deviceMemory || null
  };
}