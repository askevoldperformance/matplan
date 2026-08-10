export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }
  try {
    const { eans, days, aggregation } = req.body ?? {};
    const token = process.env.KASSAL_API_TOKEN;
    const url = new URL("https://kassal.app/api/v1/products/prices-bulk");
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ eans, days: days ?? 7, aggregation: aggregation ?? "min" }),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ message: "Kunne ikke nå Kassal.app" });
  }
}
