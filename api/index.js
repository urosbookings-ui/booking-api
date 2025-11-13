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

  // 🔗 Tvoj Google Apps Script URL
  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbwd8EPwHdfHG6F4D_G5zl3TxPl-6ysOY5e1nhYSPD8BUbuGAMVlMBPHmm5BAFMyynBD/exec";

  try {
    // ✅ GET zahtev
    if (req.method === "GET") {
      const { action, barber } = req.query;

      // ⚡ NOVO: poseban endpoint za brzo vraćanje dostupnih datuma
      if (action === "slotsSummary" && barber) {
        // pozovi Google Script samo jednom — bez prolaska kroz sve datume
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

        // Google Script ti vrati sve termine po danima
        // filtriramo samo one datume koji imaju bar 1 slobodan slot
        const availableDates = Object.keys(data)
          .filter((d) => Array.isArray(data[d]) && data[d].length > 0);

        return res.status(200).json({ ok: true, availableDates });
      }

      // ✅ Standardni GET (slots, bookings, itd.)
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

    // ✅ POST zahtev (rezervacija)
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

    // ❌ ako metoda nije GET/POST
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
