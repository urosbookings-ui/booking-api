import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Tvoj Google Apps Script URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

// test ruta
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Booking proxy API radi na Vercelu 🚀" });
});

// GET proxy
app.get("/api", async (req, res) => {
  try {
    const query = new URLSearchParams(req.query).toString();
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${query}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ✅ POST proxy — bez rušenja ako GAS pošalje HTML
app.post("/api", async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(500).json({
        ok: false,
        error: "Invalid JSON from Google Script",
        raw: text.slice(0, 200)
      });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Vercel zahteva eksplicitni export handlera
export default app;
