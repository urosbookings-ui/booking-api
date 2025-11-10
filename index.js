import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Tvoj Google Apps Script URL
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby9TMUnxI0BnhAURQLMxAFAj_sWnO24O84JOZvynv3K1WkPF2_RgR5JfSvmS2RVZl_j/exec";

// Test ruta — da proveriš da API radi
app.get("/", (req, res) => {
  res.json({ ok: true, msg: "Booking proxy API radi na Vercelu 🚀" });
});

// GET proxy — koristi se za slots i slične upite
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

// POST proxy — koristi se za kreiranje bookinga
app.post("/api", async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default app;
export const config = { runtime: "edge" };
