export default async function handler(req, res) {
  // ✅ Dozvoljeni domeni
  const allowedOrigins = [
    "https://urosbarbershop.framer.website",
    "https://framer.com",
    "http://localhost:3000"
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // ✅ Uvek dodaj standardna CORS zaglavlja
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ OPTIONS preflight mora odmah da vrati 200
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

  try {
    if (req.method === "GET") {
      const query = new URLSearchParams(req.query).toString();
      const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);
      const text = await response.text();

      if (text.trim().startsWith("<")) {
        return res.status(502).json({ ok: false, error: "HTML umesto JSON" });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();
      if (text.trim().startsWith("<")) {
        return res.status(502).json({ ok: false, error: "HTML umesto JSON" });
      }

      const data = JSON.parse(text);
      return res.status(200).json(data);
    }

    // ✅ Ako nije GET/POST/OPTIONS
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("❌ API Error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
