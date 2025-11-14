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
    res.setHeader("Access-Control-Allow-Origin", "*"); // fallback
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 🔗 Google Apps Script Endpoint
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxKCOnUxevY0wVQYZMR7dQJMwJumWheEwkIaPkqo8CMx0HDho7ecqU7cMKgT_VZyhrG/exec";

  try {
    // ======================================================
    // 🚨 SPECIAL HANDLER — CANCEL (korisnik klikne u browseru)
    // ======================================================
    if (req.method === "GET" && req.query.action === "cancel" && req.query.bookingId) {
      const { bookingId } = req.query;

      // poziv Google Script-a
      const response = await fetch(
        `${GOOGLE_SCRIPT_URL}?action=cancel&bookingId=${bookingId}`
      );

      const text = await response.text();

      let message = "Termin uspešno otkazan.";

      try {
        const data = JSON.parse(text);
        if (!data.ok) {
          message = data.error || "Greška prilikom otkazivanja.";
        }
      } catch (e) {
        message = "Greška: Google Script nije vratio validan JSON.";
      }

      // HTML odgovor u browseru
      return res
        .status(200)
        .send(`
          <html>
            <body style="font-family: Arial; padding: 40px;">
              <h2>${message}</h2>
            </body>
          </html>
        `);
    }

    // ======================================================
    // GET zahtevi (slots, slotsSummary, itd.)
    // ======================================================
    if (req.method === "GET") {
      const { action, barber } = req.query;

      // brzi list datuma
      if (action === "slotsSummary" && barber) {
        const response = await fetch(
          `${GOOGLE_SCRIPT_URL}?action=allSlots&barber=${encodeURIComponent(barber)}`
        );

        const text = await response.text();
        if (text.trim().startsWith("<")) {
          return res
            .status(502)
            .json({ ok: false, error: "Google Script returned HTML instead of JSON" });
        }

        const data = JSON.parse(text);

        const availableDates = Object.keys(data).filter(
          (d) => Array.isArray(data[d]) && data[d].length > 0
        );

        return res.status(200).json({ ok: true, availableDates });
      }

      // standardni GET
      const query = new URLSearchParams(req.query).toString();
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);

      const text = await response.text();

      if (text.trim().startsWith("<")) {
        return res
          .status(502)
          .json({ ok: false, error: "Google Script returned HTML instead of JSON" });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    // ======================================================
    // POST — kreiranje rezervacije
    // ======================================================
    if (req.method === "POST") {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();

      if (text.trim().startsWith("<")) {
        return res
          .status(502)
          .json({ ok: false, error: "Google Script returned HTML instead of JSON" });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    // Neodgovarajuća metoda
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
