import express from "express";
import { 
    getAllUsersWithOrders,
    getRewardRedemptions,
    updateRewardRedemptionStatus,
 } from "../controllers/adminController.js";
import { protect } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/admin.js";
import { adminLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.use(protect, adminOnly, adminLimiter);

router.get("/users", getAllUsersWithOrders);

router.get("/reward-redemptions", getRewardRedemptions);

router.patch(
  "/reward-redemptions/:redemptionId/status",
  updateRewardRedemptionStatus
);

export default router;