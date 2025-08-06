const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const UNIVERSE_ID = "8261040437";
const OPEN_CLOUD_TOKEN = process.env.ROBLOX_API_KEY;

const STATS_FILE = path.join(__dirname, "stats.json");
const DEV_PRODUCTS_FILE = path.join(__dirname, "developer-products.json");

// 🔄 Charger les stats depuis le fichier (si existant)
let statsDB = {};
try {
  if (fs.existsSync(STATS_FILE)) {
    statsDB = JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  }
} catch (err) {
  console.error("❌ Erreur de chargement de stats.json :", err);
}

// 💾 Sauvegarder les stats
function saveStats() {
  fs.writeFileSync(STATS_FILE, JSON.stringify(statsDB, null, 2));
}

// 🔁 Récupérer les Developer Products Roblox
app.get("/developer-products", async (req, res) => {
  try {
    const response = await axios.get(
      `https://apis.roblox.com/developer-products/v2/universes/${UNIVERSE_ID}/developerproducts?limit=100`,
      {
        headers: {
          "x-api-key": OPEN_CLOUD_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    // Enregistrer dans developer-products.json
    fs.writeFileSync(
      DEV_PRODUCTS_FILE,
      JSON.stringify(response.data, null, 2)
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📤 Enregistrer les stats d’un joueur (ancienne version)
app.post("/stats", (req, res) => {
  const { userId, data } = req.body;

  if (!userId || !data) {
    return res.status(400).json({ error: "userId et data sont requis." });
  }

  statsDB[userId] = data;
  saveStats();

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

// 📤 Enregistrer ou mettre à jour les stats (version cumulée)
app.post("/stats/:userId", (req, res) => {
  const { userId } = req.params;
  const data = req.body;

  if (!userId || !data) {
    return res
      .status(400)
      .json({ error: "userId dans l’URL et données JSON requises." });
  }

  const existingStats = statsDB[userId] || {};
  const newStats = { ...existingStats };

  const keysToUpdate = ["donatedExperience", "donatedStudio", "total"];
  for (const key of keysToUpdate) {
    const oldValue =
      typeof existingStats[key] === "number" ? existingStats[key] : 0;
    const newValue = typeof data[key] === "number" ? data[key] : 0;
    newStats[key] = oldValue + newValue;
  }

  newStats.name = existingStats.name || data.name || "Unknown";
  newStats.timestamp = data.timestamp || Date.now();

  statsDB[userId] = newStats;
  saveStats();

  res.json({ success: true, message: "Stats mises à jour." });
});

// 🧾 Obtenir toutes les stats
app.get("/stats", (req, res) => {
  res.json(statsDB);
});

app.listen(PORT, () =>
  console.log(`✅ Serveur proxy actif sur le port ${PORT}`)
);
