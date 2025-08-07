const express = require("express");
const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0"; // Écoute sur toutes les interfaces réseau

const UNIVERSE_ID = "8261040437";
const OPEN_CLOUD_TOKEN = process.env.ROBLOX_API_KEY;

const STATS_FILE = path.join(__dirname, "stats.json");
const DEV_PRODUCTS_FILE = path.join(__dirname, "developer-products.json");

let statsDB = {};

// 🔄 Chargement initial de stats.json
try {
  if (fs.existsSync(STATS_FILE)) {
    const fileData = fs.readFileSync(STATS_FILE, "utf8");
    statsDB = JSON.parse(fileData);
    console.log("✅ Données stats.json chargées.");
  }
} catch (err) {
  console.error("❌ Erreur de chargement de stats.json :", err.message);
}

// 💾 Sauvegarde dans stats.json
function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(statsDB, null, 2));
    console.log("💾 stats.json sauvegardé.");
  } catch (err) {
    console.error("❌ Erreur de sauvegarde stats.json :", err.message);
  }
}

// 🔁 Récupérer les Developer Products avec fallback local
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

    fs.writeFileSync(DEV_PRODUCTS_FILE, JSON.stringify(response.data, null, 2));
    console.log("💾 developer-products.json sauvegardé.");
    return res.json(response.data);
  } catch (error) {
    console.warn("⚠️ API Roblox indisponible :", error.message);

    if (fs.existsSync(DEV_PRODUCTS_FILE)) {
      try {
        const localData = JSON.parse(fs.readFileSync(DEV_PRODUCTS_FILE, "utf8"));
        return res.json(localData);
      } catch (readErr) {
        return res.status(500).json({
          error: "Erreur lors de la lecture du fichier de secours.",
          details: readErr.message,
        });
      }
    }

    return res.status(500).json({
      error: "Impossible de récupérer les Developer Products.",
      originalError: error.message,
    });
  }
});

// 📤 Enregistrement des stats (version directe)
app.post("/stats", (req, res) => {
  const { userId, data } = req.body;

  if (!userId || typeof data !== "object") {
    return res.status(400).json({ error: "userId et data sont requis." });
  }

  statsDB[userId] = data;
  saveStats();

  return res.json({ success: true, message: "Stats sauvegardées." });
});

// 📥 Récupération des stats d’un joueur
app.get("/stats/:userId", (req, res) => {
  const { userId } = req.params;

  const stats = statsDB[userId];
  if (!stats) {
    return res.status(404).json({ error: "Aucune donnée trouvée pour cet utilisateur." });
  }

  return res.json(stats);
});

// 📤 Mise à jour ou cumul des stats d’un joueur
app.post("/stats/:userId", (req, res) => {
  const { userId } = req.params;
  const data = req.body;

  if (!userId || typeof data !== "object") {
    return res.status(400).json({
      error: "userId dans l’URL et données JSON valides requis.",
    });
  }

  const existingStats = statsDB[userId] || {};
  const newStats = { ...existingStats };

  const keysToUpdate = ["donatedExperience", "donatedStudio", "total"];
  for (const key of keysToUpdate) {
    const oldValue = Number(existingStats[key]) || 0;
    const newValue = Number(data[key]) || 0;
    newStats[key] = oldValue + newValue;
  }

  newStats.name = data.name || existingStats.name || "Unknown";
  newStats.timestamp = data.timestamp || Date.now();

  statsDB[userId] = newStats;
  saveStats();

  return res.json({ success: true, message: "Stats mises à jour." });
});

// 📊 Récupération de toutes les stats
app.get("/stats", (req, res) => {
  return res.json(statsDB);
});

// 🌐 Obtenir IP locale (ex: 192.168.x.x)
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

// 🚀 Lancement du serveur avec URL complète
app.listen(PORT, HOST, () => {
  const ip = getLocalIp();
  console.log(`✅ Serveur proxy actif :
➡️  Local : http://localhost:${PORT}
➡️  Réseau : http://${ip}:${PORT}`);
});
