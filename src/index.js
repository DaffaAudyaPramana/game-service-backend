import express from "express";
import orderRoutes from "./routes/orderRoutes.js";

const app = express();

app.use(express.json());

// test route
app.get("/", (req, res) => {
  res.send("API Running 🚀");
});

// pakai route order
app.use("/orders", orderRoutes);

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});