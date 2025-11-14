export default async function handler(req, res) {
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbz_Utqg-o26GR5Hjuqux-YsD0Sw3SteYFupKOXdVGK0czjN9Bebv91I7xZb3hjx1AkU/exec";

  // -------- CORS --------
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // -------- Helpers --------
  async function safeFetchJSON(url, options = {}) {
    try {
      const r = await fetch(url, options);
      const text = await r.text();
      try {
        const json = JSON.parse(text);
        return { ok: true, data: json };
      } catch {
        return { ok: false, error: "Upstream not JSON", raw: text };
      }
    } catch (e) {
      return { ok: false, error: e.message || "Fetch error" };
    }
  }

  async function safeFetchText(url, options = {}) {
    try {
      const r = await fetch(url, options);
      const text = await r.text();
      return { ok: true, text };
    } catch (e) {
      return { ok: false, error: e.message || "Fetch error" };
    }
  }

  // -------- CANCEL Handler --------
  if (req.method === "GET" && req.query.action === "cancel") {
    const bookingId = req.query.bookingId;
    if (!bookingId) {
      return res.status(400).send(`
        <html><body style="font-family:Arial;padding:40px;">
          <h2>❌ Nedostaje bookingId</h2>
        </body></html>
      `);
    }

    const resp = await safeFetchText(`${GOOGLE_SCRIPT_URL}?action=cancel&bookingId=${bookingId}`);
    let msg = "✅ Termin uspešno otkazan.";
    if (!resp.ok) msg = "⚠️ Greška prilikom otkazivanja.";

    return res.status(200).send(`
      <html>
        <body style="font-family: Arial; padding: 40px;">
          <h2>${msg}</h2>
        </body>
      </html>
    `);
  }

  // -------- GET Handler (slots, etc.) --------
  if (req.method === "GET") {
    // 🔥 Ovo 100% radi na Vercelu — sigurno parsira query string
    const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const action = params.get("action");

    // Validacija slotova
    if (action === "slots") {
      const barber = params.get("barber");
      const date = params.get("date");

      if (!barber || !date) {
        return res.status(400).json({ ok: false, error: "Nedostaje barber ili date" });
      }
    }

    // Prosleđivanje GAS-u
    const queryString = params.toString();
    const resp = await safeFetchJSON(`${GOOGLE_SCRIPT_URL}?${queryString}`);

    if (!resp.ok) return res.status(502).json(resp);
    return res.status(200).json(resp.data);
  }

  // -------- POST Handler (booking) --------
  if (req.method === "POST") {
    const { name, email, phone, service, barber, dateStr, timeStr } = req.body || {};

    if (!name || !email || !phone || !service || !barber || !dateStr || !timeStr) {
      return res.status(400).json({ ok: false, error: "Nedostaju obavezna polja" });
    }

    const resp = await safeFetchJSON(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!resp.ok) return res.status(502).json(resp);
    return res.status(200).json(resp.data);
  }

  // -------- Default --------
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
