import { kassalFetch } from "../../../lib/kassal-fetch.mjs";

export default async function handler(req, res) {
  try {
    const { group } = req.query;
    const { status, data } = await kassalFetch("/physical-stores", { group, size: 1 });
    const store = data?.data?.[0];
    res.status(status).json({ logo: store?.logo ?? null, name: store?.name ?? null });
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
}
