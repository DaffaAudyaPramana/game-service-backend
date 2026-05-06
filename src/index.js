console.log("ESM ACTIVE");

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import orderRoutes from "./routes/orderRoutes.js";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(express.json());

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(cookieParser());

app.use("/uploads", express.static("uploads"));
app.use("/auth", authRoutes);
app.use("/orders", orderRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});