console.log("ESM ACTIVE");

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import hpp from "hpp";

import { generalLimiter } from "./middlewares/rateLimit.js";

import authRoutes from "./routes/authRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import rewardRoutes from "./routes/rewardRoutes.js"
import feedbackRoutes from "./routes/feedbackRoutes.js";

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.message?.includes("Format file tidak didukung")) {
    return res.status(400).json({
      error: err.message,
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "Ukuran file maksimal 5MB",
    });
  }

  return res.status(500).json({
    error: "Terjadi kesalahan server",
  });
});

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(hpp());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(generalLimiter);

app.use("/uploads", express.static("uploads", {
  dotfiles: "deny",
  index: false,
}));

app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);
app.use("/admin", adminRoutes);
app.use("/rewards", rewardRoutes);
app.use("/feedback", feedbackRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});