import express from "express";
import {
  getRewards,
  getMyPoints,
  redeemReward,
} from "../controllers/rewardController.js";
import { protect } from "../middlewares/auth.js";
import { rewardLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.get("/", getRewards);
router.get("/me", protect, getMyPoints);
router.post("/:rewardId/redeem", protect, rewardLimiter, redeemReward);

export default router;