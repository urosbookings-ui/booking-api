import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ✅ Ručni CORS middleware – dozvoljavamo samo Framer i localhost
app.use((req, res, next) => {
  const allowedOrigins = [
    "https://urosbarbershop.framer.website",
    "https://framer.com",
    "http://localhost:3000",
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// 🔗 Google Apps Script URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

// ✅ Test ruta
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Booking proxy API radi na Vercelu 🚀" });
});

// ✅ GET proxy
app.get("/api", async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);
    const text = await response.text();

    if (text.trim().startsWith("<")) {
      return res.status(502).json({
        ok: false,
        error: "Google Script returned HTML instead of JSON",
        htmlSnippet: text.slice(0, 200),
      });
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
      return res.status(502).json({
        ok: false,
        error: "Google Script returned HTML instead of JSON",
        htmlSnippet: text.slice(0, 200),
      });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        ok: false,
        error: "Invalid JSON from Google Script",
        rawSnippet: text.slice(0, 200),
      });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ POST /api error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ Ključni deo: eksplicitni handler za Vercel
const handler = app;
export default handler;
