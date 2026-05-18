import express from "express";
import { createFeedback } from "../controllers/feedbackController.js";
import { feedbackLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/", feedbackLimiter, createFeedback);

export default router;