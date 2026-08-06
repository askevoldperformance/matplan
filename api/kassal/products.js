import { kassalFetch } from "../../lib/kassal-fetch.mjs";

export default async function handler(req, res) {
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
}
