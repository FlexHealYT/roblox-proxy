const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json()); // Pour parser le JSON dans les requêtes POST

const PORT = process.env.PORT || 3000;
const UNIVERSE_ID = "8261040437";
const OPEN_CLOUD_TOKEN = process.env.ROBLOX_API_KEY;

// Base temporaire (à remplacer par une base de données plus tard)
const statsDB = {};

// 🔁 Récupérer les Developer Products Roblox
app.get("/developer-products", async (req, res) => {
  try {
    const response = await axios.get(
      `https://apis.roblox.com/developer-products/v2/universes/${UNIVERSE_ID}/developerproducts?limit=100`,
      {
        headers: {
          "x-api-key": OPEN_CLOUD_TOKEN,
          "Content-Type": "application/json",
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📤 Enregistrer les stats d’un joueur (POST depuis Roblox)
app.post("/stats", (req, res) => {
  const { userId, data } = req.body;

  if (!userId || !data) {
    return res.status(400).json({ error: "userId et data sont requis." });
  }

  statsDB[userId] = data;
  res.json({ success: true, message: "Stats sauvegardées." });
});

// 📥 Obtenir les stats d’un joueur spécifique
app.get("/stats/:userId", (req, res) => {
  const { userId } = req.params;

  const stats = statsDB[userId];
  if (!stats) {
    return res.status(404).json({ error: "Aucune donnée trouvée." });
  }

  res.json(stats);
});

// 📤 Enregistrer les stats d’un joueur (nouvelle version compatible Roblox)
app.post("/stats/:userId", (req, res) => {
  const { userId } = req.params;
  const data = req.body;

  if (!userId || !data) {
    return res.status(400).json({ error: "userId dans l’URL et données JSON requises." });
  }

  const existingStats = statsDB[userId] || {};
  const newStats = { ...existingStats };

  const keysToUpdate = ["donatedExperience", "donatedStudio", "total"];

  for (const key of keysToUpdate) {
    const oldValue = typeof existingStats[key] === "number" ? existingStats[key] : 0;
    const newValue = typeof data[key] === "number" ? data[key] : 0;
    newStats[key] = oldValue + newValue;
  }

  statsDB[userId] = newStats;

  res.json({ success: true, message: "Stats mises à jour." });
});


// 🧾 Obtenir toutes les stats (admin ou debug)
app.get("/stats", (req, res) => {
  res.json(statsDB);
});

app.listen(PORT, () =>
  console.log(`✅ Serveur proxy actif sur le port ${PORT}`)
);
