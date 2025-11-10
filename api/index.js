import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// ✅ Dozvoljeni domeni
const allowedOrigins = [
  "https://urosbarbershop.framer.website",
  "https://framer.com",
  "http://localhost:3000"
];

// ✅ CORS middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// 🔗 Tvoj Google Apps Script URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

// ✅ Test ruta
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Booking API radi i CORS je aktivan 🚀" });
});

// ✅ GET proxy
app.get("/api", async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);
    const text = await response.text();

    if (text.trim().startsWith("<")) {
      return res.status(502).json({ ok: false, error: "HTML umesto JSON" });
    }

    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    console.error("❌ GET /api error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ POST proxy
app.post("/api", async (req, res) => {
  try {
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
    res.json(data);
  } catch (err) {
    console.error("❌ POST /api error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Umesto "export default app", Vercel mora da vidi handler
export default function handler(req, res) {
  app(req, res);
}
