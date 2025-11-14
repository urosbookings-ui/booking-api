export default async function handler(req, res) {
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxKCOnUxevY0wVQYZMR7dQJMwJumWheEwkIaPkqo8CMx0HDho7ecqU7cMKgT_VZyhrG/exec";

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  // SAFETY FETCH
  async function safeFetch(url, options = {}) {
    try {
      const r = await fetch(url, options);
      const text = await r.text();

      // pokuša da parsira JSON
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

  // ============ CANCEL HANDLER =============
  if (req.method === "GET" && req.query.action === "cancel") {
    const id = req.query.bookingId;
    const resp = await safeFetch(`${GOOGLE_SCRIPT_URL}?action=cancel&bookingId=${id}`);

    let msg = "Termin uspešno otkazan.";
    if (!resp.ok || !resp.data?.ok) msg = "Greška prilikom otkazivanja.";

    return res
      .status(200)
      .send(`
        <html>
          <body style="font-family: Arial; padding: 40px;">
            <h2>${msg}</h2>
          </body>
        </html>
      `);
  }

  // ============ GET (slots, slotsSummary, itd.) =============
  if (req.method === "GET") {
    const query = new URLSearchParams(req.query).toString();
    const resp = await safeFetch(`${GOOGLE_SCRIPT_URL}?${query}`);

    if (!resp.ok) return res.status(502).json(resp);
    return res.status(200).json(resp.data);
  }

  // ============ POST (rezervacija) =============
  if (req.method === "POST") {
    const resp = await safeFetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!resp.ok) return res.status(502).json(resp);
    return res.status(200).json(resp.data);
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
