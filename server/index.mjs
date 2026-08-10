import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import { kassalFetch } from "../lib/kassal-fetch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json());

if (!process.env.KASSAL_API_TOKEN) {
  console.warn(
    "⚠️  KASSAL_API_TOKEN er ikke satt. Legg den i server/.env (se server/.env.example)."
  );
}

// Search products, defaults to Kiwi only since that's the relevant store for this household.
app.get("/api/kassal/products", async (req, res) => {
  try {
    const { search, size, store } = req.query;
    const { status, data } = await kassalFetch("/products", {
      search,
      size: size ?? 25,
      store: store ?? "KIWI",
    });
    res.status(status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
});

app.get("/api/kassal/products/ean/:ean", async (req, res) => {
  try {
    const { status, data } = await kassalFetch(`/products/ean/${req.params.ean}`);
    res.status(status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
});

app.get("/api/kassal/products/id/:id", async (req, res) => {
  try {
    const { status, data } = await kassalFetch(`/products/id/${req.params.id}`);
    res.status(status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
});

// Returns one representative logo for a store chain (used for the store-picker row).
app.get("/api/kassal/store-logo/:group", async (req, res) => {
  try {
    const { status, data } = await kassalFetch("/physical-stores", { group: req.params.group, size: 1 });
    const store = data?.data?.[0];
    res.status(status).json({ logo: store?.logo ?? null, name: store?.name ?? null });
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
});

// Bulk price refresh — much cheaper than refetching every product individually.
app.post("/api/kassal/prices-bulk", async (req, res) => {
  try {
    const { eans, days, aggregation } = req.body ?? {};
    const url = new URL(`${KASSAL_BASE}/products/prices-bulk`);
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.KASSAL_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eans, days: days ?? 7, aggregation: aggregation ?? "min" }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
});

app.get("/api/kassal/health", (_req, res) => {
  res.json({ status: "ok", tokenConfigured: !!process.env.KASSAL_API_TOKEN });
});

app.listen(PORT, () => {
  console.log(`Kassal proxy kjører på http://localhost:${PORT}`);
});
