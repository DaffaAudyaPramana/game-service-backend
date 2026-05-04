console.log("ESM ACTIVE");

import express from "express";
import orderRoutes from "./routes/orderRoutes.js";
import cors from "cors";
import path from "path";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));
app.use(cookieParser());

app.use("/auth", authRoutes);

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// pakai route order
app.use("/orders", orderRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});