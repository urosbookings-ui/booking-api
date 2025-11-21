// /api/index.js

// ❗ PROMENI OVO U ENVIRONMENT VARIJABLU U VERCELU (Settings -> Environment Variables)
// Ili privremeno ostavi hardcoded ako testiraš
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzaS-VSXhxwYbny2Uc-Dcn-lq-KoMfqMb22Tt7LV_yNZ1C1P-KVy5KaMeod0hqTlfu4/exec"; 

const ALLOWED_ORIGIN = "*"; // Kada završiš sajt, stavi npr: "https://mojsajt.framer.website"

// --- Helper ---
async function fetchGAS(params, options = {}) {
  const url = `${GOOGLE_SCRIPT_URL}?${params.toString()}`;
  try {
    const r = await fetch(url, options);
    const text = await r.text();
    
    // GAS ponekad vrati HTML grešku (npr. Google Login)
    if (text.includes("<!DOCTYPE html") || text.includes("Google Docs")) {
       return { ok: false, error: "GAS HTML Error", raw: text };
    }

    try {
      return { ok: true, data: JSON.parse(text) };
    } catch (e) {
      // Ako nije JSON, možda je plain text (za cancel)
      return { ok: true, text: text, isText: true };
    }
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const params = new URL(req.url, `http://${req.headers.host}`).searchParams;
  const action = params.get("action");

  // --- GET REQUESTS ---
  if (req.method === "GET") {
    
    // 1. OTKAZIVANJE (Vraća plain text)
    if (action === "cancel") {
      const upstream = await fetchGAS(params);
      if (upstream.isText) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.status(200).send(upstream.text);
      }
      return res.status(500).send("Greška pri otkazivanju.");
    }

    // 2. NOVO: DOBAVI USLUGE ZA FRIZERA (Frontend zove ovo kad se izabere frizer)
    // Primer poziva: /api?action=getServices&barber=Uros
    if (action === "getServices") {
      const upstream = await fetchGAS(params);
      if (!upstream.ok) return res.status(502).json(upstream);
      return res.status(200).json(upstream.data);
    }

    // 3. SLOBODNI TERMINI
    if (action === "slots" || action === "getAvailableSlots") {
      const upstream = await fetchGAS(params);
      if (!upstream.ok) return res.status(502).json(upstream);
      return res.status(200).json(upstream.data);
    }

    return res.status(404).json({ ok: false, error: "Unknown action" });
  }

  // --- POST REQUEST (CREATE BOOKING) ---
  if (req.method === "POST") {
    const payload = req.body || {};
    
    // Prosleđujemo POST ka GAS-u
    // Moramo koristiti parametre u URL-u za 'action', a body za podatke
    const postParams = new URLSearchParams();
    postParams.append("action", "create");

    try {
      const r = await fetch(`${GOOGLE_SCRIPT_URL}?${postParams.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      const data = JSON.parse(text);
      
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ ok: false, error: "Proxy error", detail: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
