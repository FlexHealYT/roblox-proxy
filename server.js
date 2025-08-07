const express = require("express");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const simpleGit = require("simple-git");
const git = simpleGit();

// ✅ Configuration Git (avec ordre assuré)
async function configureGitIdentity() {
  try {
    await git.addConfig("user.name", "Render Bot");
    await git.addConfig("user.email", "render@bot.com");
    console.log("✅ Identité Git configurée.");
  } catch (err) {
    console.error("❌ Erreur de configuration Git :", err.message);
  }
}
configureGitIdentity();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const UNIVERSE_ID = "8261040437";
const OPEN_CLOUD_TOKEN = process.env.ROBLOX_API_KEY;

// 📁 Fichiers JSON
const STATS_PATH = path.join(__dirname, "stats.json");
const DEVPRODS_PATH = path.join(__dirname, "developer-products.json");

// 📊 Base temporaire
let statsDB = {};

// Charger stats existantes au démarrage
if (fs.existsSync(STATS_PATH)) {
  statsDB = JSON.parse(fs.readFileSync(STATS_PATH, "utf-8"));
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

    // Sauvegarde dans un fichier
    fs.writeFileSync(DEVPRODS_PATH, JSON.stringify(response.data, null, 2));
    await commitFile("developer-products.json", "🔄 MAJ des Developer Products");

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /stats/:userId
app.post("/stats/:userId", async (req, res) => {
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

  newStats.name = existingStats.name || data.name || "Unknown";
  newStats.timestamp = data.timestamp || Date.now();

  statsDB[userId] = newStats;

  // Sauvegarder dans le fichier
  fs.writeFileSync(STATS_PATH, JSON.stringify(statsDB, null, 2));
  await commitFile("stats.json", `💾 MAJ stats utilisateur ${userId}`);

  res.json({ success: true, message: "Stats mises à jour." });
});

// GET /stats/:userId
app.get("/stats/:userId", (req, res) => {
  const { userId } = req.params;
  const stats = statsDB[userId];
  if (!stats) return res.status(404).json({ error: "Aucune donnée trouvée." });
  res.json(stats);
});

// GET /stats
app.get("/stats", (req, res) => {
  res.json(statsDB);
});

// 🔧 Commit + Push d’un fichier
async function commitFile(filename, message) {
  try {
    await git.add(filename);
    await git.commit(message);
    await git.push("origin", "main");
    console.log(`✅ Fichier ${filename} poussé avec succès`);
  } catch (err) {
    console.error("❌ Erreur lors du push :", err.message);
  }
}

app.listen(PORT, () =>
  console.log(`✅ Serveur proxy actif sur le port ${PORT}`)
);
