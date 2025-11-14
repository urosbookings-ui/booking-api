export default async function handler(req, res) {
  // ✅ Dozvoljeni domeni (CORS)
  const allowedOrigins = [
    "https://urosbarbershop.framer.website",
    "https://framer.com",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // fallback - permissive but safe for now (you can restrict later)
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Idempotency-Key"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxKCOnUxevY0wVQYZMR7dQJMwJumWheEwkIaPkqo8CMx0HDho7ecqU7cMKgT_VZyhrG/exec";

  // ---------- helper: robust fetch + safe JSON parse + timeout ----------
  async function fetchJsonSafely(url, opts = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...opts, signal: controller.signal });
      const text = await response.text();
      // quick content-type check if available
      const ct = response.headers.get("content-type") || "";

      // If content-type claims JSON -> try parse
      if (ct.includes("application/json") || ct.includes("text/json")) {
        try {
          const data = JSON.parse(text);
          return { ok: true, status: response.status, data, raw: text };
        } catch (e) {
          return { ok: false, error: "Invalid JSON from upstream", raw: text, status: response.status };
        }
      }

      // If body starts with { or [, attempt parse (robustness for some GAS outputs)
      const trimmed = text.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const data = JSON.parse(trimmed);
          return { ok: true, status: response.status, data, raw: text };
        } catch (e) {
          return { ok: false, error: "Invalid JSON (parse failed)", raw: text, status: response.status };
        }
      }

      // Not JSON -> return safe error + raw for diagnostics
      return { ok: false, error: "Upstream returned non-JSON response", raw: text, status: response.status, contentType: ct };
    } catch (err) {
      if (err.name === "AbortError") {
        return { ok: false, error: "Upstream timeout/aborted", raw: "" };
      }
      return { ok: false, error: err.message || String(err), raw: "" };
    } finally {
      clearTimeout(id);
    }
  }

  try {
    // ======================================================
    // 🚨 SPECIAL HANDLER — CANCEL (korisnik klikne u browseru)
    // ======================================================
    if (req.method === "GET" && req.query.action === "cancel" && req.query.bookingId) {
      const { bookingId } = req.query;

      const u = `${GOOGLE_SCRIPT_URL}?action=cancel&bookingId=${encodeURIComponent(bookingId)}`;
      const upstream = await fetchJsonSafely(u);

      if (!upstream.ok) {
        // Ako GAS vrati HTML (čest slučaj), pokažemo korisniku poruku, ali logujemo raw
        const message = upstream.error || "Greška prilikom otkazivanja.";
        const debug = upstream.raw ? `<pre style="white-space:pre-wrap;max-width:800px">${escapeHtml(upstream.raw)}</pre>` : "";
        return res
          .status(200)
          .send(`
            <html>
              <body style="font-family: Arial; padding: 40px;">
                <h2>${escapeHtml(message)}</h2>
                <div style="margin-top:20px;color:#666;font-size:13px">Debug (upstream):</div>
                ${debug}
              </body>
            </html>
          `);
      }

      // upstream.data expected as JSON
      const data = upstream.data;
      const msg = data.ok ? "Termin uspešno otkazan." : (data.error || "Greška prilikom otkazivanja.");
      return res
        .status(200)
        .send(`
          <html>
            <body style="font-family: Arial; padding: 40px;">
              <h2>${escapeHtml(msg)}</h2>
            </body>
          </html>
        `);
    }

    // ======================================================
    // GET zahtevi (slots, slotsSummary, itd.)
    // ======================================================
    if (req.method === "GET") {
      const { action, barber } = req.query;

      if (action === "slotsSummary" && barber) {
        const response = await fetchJsonSafely(
          `${GOOGLE_SCRIPT_URL}?action=allSlots&barber=${encodeURIComponent(barber)}`
        );

        if (!response.ok) {
          return res.status(502).json({ ok: false, error: response.error || "Upstream error", raw: response.raw || null });
        }

        const data = response.data;
        // guard: if GAS returned something unexpected, handle safely
        if (!data || typeof data !== "object") {
          return res.status(502).json({ ok: false, error: "Invalid data from upstream", raw: response.raw || null });
        }

        const availableDates = Object.keys(data).filter(
          (d) => Array.isArray(data[d]) && data[d].length > 0
        );

        return res.status(200).json({ ok: true, availableDates });
      }

      // standardni GET -> proxy to GAS
      const query = new URLSearchParams(req.query).toString();
      const upstream = await fetchJsonSafely(`${GOOGLE_SCRIPT_URL}?${query}`);
      if (!upstream.ok) {
        return res.status(502).json({ ok: false, error: upstream.error || "Upstream returned non-JSON", raw: upstream.raw || null });
      }
      return res.status(200).json(upstream.data);
    }

    // ======================================================
    // POST — kreiranje rezervacije
    // ======================================================
    if (req.method === "POST") {
      // forward JSON body to GAS
      const upstream = await fetchJsonSafely(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
      });

      if (!upstream.ok) {
        return res.status(502).json({ ok: false, error: upstream.error || "Upstream returned non-JSON", raw: upstream.raw || null });
      }

      return res.status(200).json(upstream.data);
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }

  // ---------- small helper ----------
  function escapeHtml(s = "") {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
