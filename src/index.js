import express from "express";
import orderRoutes from "./routes/orderRoutes.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors());

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// pakai route order
app.use("/orders", orderRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});