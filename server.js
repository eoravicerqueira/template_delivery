const express = require("express");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const port = process.env.PORT || 3000;
const configPath = path.join(__dirname, "restaurant-config.json");
const defaultConfig = {
  restaurantName: "Delivery App",
  companyCep: "77018540",
  deliveryRate: 1,
};

app.use(express.json());
app.use(express.static(path.join(__dirname)));

async function loadConfig() {
  try {
    const content = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(content);
    return Object.assign({}, defaultConfig, parsed);
  } catch (error) {
    await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
    return defaultConfig;
  }
}

async function saveConfig(config) {
  const cleanConfig = {
    restaurantName: config.restaurantName || defaultConfig.restaurantName,
    companyCep: String(config.companyCep || defaultConfig.companyCep).replace(/\D/g, ""),
    deliveryRate: Number(config.deliveryRate) || defaultConfig.deliveryRate,
  };
  await fs.writeFile(configPath, JSON.stringify(cleanConfig, null, 2), "utf8");
  return cleanConfig;
}

app.get("/api/config", async (req, res) => {
  try {
    const config = await loadConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Não foi possível carregar a configuração" });
  }
});

app.post("/api/config", async (req, res) => {
  try {
    const config = await saveConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Não foi possível salvar a configuração" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Servidor local rodando em http://localhost:${port}`);
});
