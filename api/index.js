import fetch from "node-fetch";

// ✅ Dozvoljeni domeni
const allowedOrigins = [
  "https://urosbarbershop.framer.website",
  "https://framer.com",
  "http://localhost:3000"
];

// 🔗 Tvoj Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

// ✅ Glavni handler (Vercel funkcija)
export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // 🔸 OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // 🔹 Test ruta
  if (req.url === "/" || req.query.test) {
    return res
      .status(200)
      .json({ ok: true, msg: "Booking API radi i CORS je aktivan 🚀" });
  }

  try {
    if (req.method === "GET") {
      // Proxy GET zahteva
      const query = new URLSearchParams(req.query).toString();
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);
      const text = await response.text();

      if (text.trim().startsWith("<")) {
        return res
          .status(502)
          .json({ ok: false, error: "HTML umesto JSON", snippet: text.slice(0, 200) });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      // Proxy POST zahteva
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();
      if (text.trim().startsWith("<")) {
        return res
          .status(502)
          .json({ ok: false, error: "HTML umesto JSON", snippet: text.slice(0, 200) });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API greška:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
