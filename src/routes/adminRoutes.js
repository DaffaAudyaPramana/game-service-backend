import express from "express";
import { 
    getAllUsersWithOrders,
    getRewardRedemptions,
    updateRewardRedemptionStatus,
 } from "../controllers/adminController.js";
import { protect } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/admin.js";

const router = express.Router();

router.get("/users", protect, adminOnly, getAllUsersWithOrders);

router.get(
  "/reward-redemptions",
  protect,
  adminOnly,
  getRewardRedemptions
);

router.patch(
  "/reward-redemptions/:redemptionId/status",
  protect,
  adminOnly,
  updateRewardRedemptionStatus
);

export default router;