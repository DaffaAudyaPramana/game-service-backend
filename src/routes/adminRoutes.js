import express from "express";
import { getAllUsersWithOrders } from "../controllers/adminController.js";
import { protect } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/admin.js";

const router = express.Router();

router.get("/users", protect, adminOnly, getAllUsersWithOrders);

export default router;