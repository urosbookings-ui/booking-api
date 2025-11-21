// /api/index.js

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxGrTefJIb-17dJQQZAEVRF7SJQzkdemy4oc3Kei-GXczjHNv5_14Ced5Hdv-U373Iu/exec";

// CORS
const ALLOWED_ORIGIN = "*"; // promeni u domen Framer sajta kada deployuješ

// -----------------------------------------
// Helper: Bezbedan JSON fetch iz GAS-a
// -----------------------------------------
async function safeFetchJSON(url, options = {}) {
  try {
    const r = await fetch(url, options);
    const text = await r.text();

    // 🔹 1) probaj direktan JSON
    try {
      return { ok: true, data: JSON.parse(text), raw: text };
    } catch (e) {}

    // 🔹 2) probaj izdvojiti JSON iz HTML (GAS ponekad doda <script> / <pre>)
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { ok: true, data: JSON.parse(match[0]), raw: text };
      } catch (e) {}
    }

    return { ok: false, error: "Upstream not JSON", raw: text };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

// -----------------------------------------
// API Handler
// -----------------------------------------
export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
  const action = params.get("action");

  // -----------------------------------------
  // GET
  // -----------------------------------------
  if (req.method === "GET") {
    // ❗ CANCEL — vrati plain text direktno
    if (action === "cancel") {
      const bookingId = params.get("bookingId");
      if (!bookingId) return res.status(400).send("Nedostaje bookingId");

      try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=cancel&bookingId=${bookingId}`);
        const text = await response.text();

        res.setHeader("Content-Type", "text/plain");
        return res.status(200).send(text);
      } catch (err) {
        return res.status(502).send("GAS error: " + err.message);
      }
    }

    // ❗ SLOTS — prosledi GAS i vrati JSON
    if (action === "slots" || action === "getAvailableSlots") {
      const barber = params.get("barber");
      const date = params.get("date") || params.get("dateStr");
      if (!barber || !date) return res.status(400).json({ ok: false, error: "Nedostaje barber ili date" });

      const queryString = params.toString();
      const upstream = await safeFetchJSON(`${GOOGLE_SCRIPT_URL}?${queryString}`);

      if (!upstream.ok) return res.status(502).json({ ok: false, error: "GAS error", detail: upstream.raw });
      return res.status(200).json(upstream.data);
    }

    // ❗ Ostalo GET — prosledi GAS
    const queryString = params.toString();
    const upstream = await safeFetchJSON(`${GOOGLE_SCRIPT_URL}?${queryString}`);
    if (!upstream.ok) return res.status(502).json({ ok: false, error: "GAS error", detail: upstream.raw });
    return res.status(200).json(upstream.data);
  }

  // -----------------------------------------
  // POST — CREATE BOOKING
  // -----------------------------------------
  if (req.method === "POST") {
    const payload = req.body || {};
    const { name, email, phone, service, barber, dateStr, timeStr } = payload;

    if (!name || !email || !phone || !service || !barber || !dateStr || !timeStr) {
      return res.status(400).json({ ok: false, error: "Nedostaju obavezna polja" });
    }

    const upstream = await safeFetchJSON(`${GOOGLE_SCRIPT_URL}?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) return res.status(502).json({ ok: false, error: "Upstream error", detail: upstream.raw });
    return res.status(200).json(upstream.data);
  }

  // -----------------------------------------
  // DEFAULT
  // -----------------------------------------
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
