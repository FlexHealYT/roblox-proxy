const express = require("express");
const axios = require("axios");
const app = express();

const PORT = process.env.PORT || 3000;
const UNIVERSE_ID = "8261040437";
const OPEN_CLOUD_TOKEN = process.env.ROBLOX_API_KEY;

app.get("/developer-products", async (req, res) => {
  try {
    const response = await axios.get(`https://apis.roblox.com/developer-products/v2/universes/${UNIVERSE_ID}/developerproducts?limit=100`, {
      headers: {
        "x-api-key": OPEN_CLOUD_TOKEN,
        "Content-Type": "application/json"
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Proxy actif sur le port ${PORT}`));
