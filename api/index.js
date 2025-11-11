export default async function handler(req, res) {
  // ✅ Dozvoljeni domeni
  const allowedOrigins = [
    "https://urosbarbershop.framer.website",
    "https://framer.com",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    // fallback ako origin nije poznat — barem otvori API test
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  // ✅ Uvek dodaj CORS zaglavlja
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ OPTIONS preflight — odmah 200
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 🔗 Tvoj Google Apps Script Web App URL
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxq497NK1ds7cajvkKdGlwpDip8PJMMGn9-x498kHk1mUWdI7xWmuFeFvCQgTCbyESg/exec";


  try {
    // ✅ GET zahtev
    if (req.method === "GET") {
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

    // ✅ POST zahtev
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

    // ✅ Nevalidna metoda
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
