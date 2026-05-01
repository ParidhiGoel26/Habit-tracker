require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());

// ================= ROUTES =================
app.use("/api/auth", require("./routes/auth"));
app.use("/api/habits", require("./routes/habit"));

// ================= DATABASE =================
const connectToAtlas = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("❌ MONGO_URI is missing");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Atlas DB Connected");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  }
};

// ================= SERVE FRONTEND =================
if (process.env.NODE_ENV === "production") {
  const clientPath = path.join(__dirname, "../client/build");

  app.use(express.static(clientPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectToAtlas();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();