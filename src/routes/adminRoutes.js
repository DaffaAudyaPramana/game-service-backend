import express from "express";
import { 
    getAllUsersWithOrders,
    getManualRevenues,
    createManualRevenue,
    updateManualRevenue,
    deleteManualRevenue,
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

router.get("/manual-revenues", getManualRevenues);

router.post("/manual-revenues", createManualRevenue);

router.patch("/manual-revenues/:id", updateManualRevenue);

router.delete("/manual-revenues/:id", deleteManualRevenue);

router.patch(
  "/reward-redemptions/:redemptionId/status",
  updateRewardRedemptionStatus
);

export default router;