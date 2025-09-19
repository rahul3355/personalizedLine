export type VisitorFingerprint = {
  ip_address: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  utc_offset: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: "mobile" | "tablet" | "desktop";
  device_model: string | null;
  screen_width: number;
  screen_height: number;
  device_pixel_ratio: number;
  cpu_cores: number | null;
  memory_gb: number | null;
  accepts_language: string | null;
  http_version: string | null;
  tls_version: null; // never exposed to JS
  referer_domain: string | null;
};

export async function getVisitorFingerprint(): Promise<VisitorFingerprint> {
  /* ---------- 1.  GEO / IP  (free, no key) ---------- */
  let geo: any = {};
  try {
    const res = await fetch("https://ipapi.co/json");
    if (res.ok) geo = await res.json();
  } catch {
    /* ignore */
  }

  /* ---------- 2.  UA STRING PARSING (crude but works) ---------- */
  const ua = navigator.userAgent;
  let browser_name: string | null = null;
  let browser_version: string | null = null;
  let os_name: string | null = null;
  let os_version: string | null = null;

  // Browser
  const b = ua.match(/(edg|edge|chrome|safari|firefox|brave|opr|opera|vivaldi)\/([\d+.]+)/i);
  if (b) {
    browser_name = b[1].replace(/edg/i, "edge").replace(/opr/i, "opera");
    browser_version = b[2];
  }

  // OS
  const o = ua.match(/\(([^)]+)\)/);
  if (o) {
    const chunk = o[1];
    if (/windows/i.test(chunk)) {
      os_name = "Windows";
      const v = chunk.match(/Windows NT (\d+\.\d+)/);
      if (v) {
        const map: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7", "6.0": "Vista" };
        os_version = map[v[1]] || v[1];
      }
    } else if (/mac/i.test(chunk)) {
      os_name = "macOS";
      const v = chunk.match(/Mac OS X (\d+[_\.]\d+[_\.]?\d*)/);
      if (v) os_version = v[1].replace(/_/g, ".");
    } else if (/linux/i.test(chunk)) {
      os_name = "Linux";
    } else if (/android/i.test(chunk)) {
      os_name = "Android";
      const v = chunk.match(/Android (\d+\.\d*)/);
      if (v) os_version = v[1];
    } else if (/iphone|ipad/i.test(chunk)) {
      os_name = "iOS";
      const v = chunk.match(/OS (\d+[_\.]\d+)/);
      if (v) os_version = v[1].replace(/_/g, ".");
    }
  }

  /* ---------- 3.  DEVICE TYPE ---------- */
  const device_type: "mobile" | "tablet" | "desktop" =
    /Mobi|Android/i.test(ua) ? "mobile" : /iPad|Tablet/i.test(ua) ? "tablet" : "desktop";

  /* ---------- 4.  SCREEN & HARDWARE ---------- */
  const { width: screen_width, height: screen_height } = window.screen;
  const device_pixel_ratio = window.devicePixelRatio || 1;
  const cpu_cores = navigator.hardwareConcurrency || null;
  const memory_gb = (navigator as any).deviceMemory || null;

  /* ---------- 5.  LANGUAGE ---------- */
  const accepts_language = navigator.languages?.join(",") || navigator.language || null;

  /* ---------- 6.  CONNECTION HINT (Chromium) ---------- */
  const conn = (navigator as any).connection;
  const http_version = conn?.effectiveType || null;

  /* ---------- 7.  REFERER ---------- */
  const referer_domain =
    document.referrer &&
    new URL(document.referrer).hostname !== location.hostname
      ? new URL(document.referrer).hostname
      : null;

  return {
    ip_address: geo.ip || null,
    country: geo.country_name || null,
    city: geo.city || null,
    timezone: geo.timezone || null,
    utc_offset: geo.utc_offset || null,
    browser_name,
    browser_version,
    os_name,
    os_version,
    device_type,
    device_model: null, // impossible without UA-CH or 3rd party db
    screen_width,
    screen_height,
    device_pixel_ratio,
    cpu_cores,
    memory_gb,
    accepts_language,
    http_version,
    tls_version: null,
    referer_domain,
  };
}