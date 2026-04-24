import express from "express";
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

// endpoint
router.post("/", createOrder);

export default router;