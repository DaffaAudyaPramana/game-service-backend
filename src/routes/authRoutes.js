import express from "express";
import {
  login,
  register,
  me,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";
import {
  authLimiter,
  forgotPasswordLimiter,
} from "../middlewares/rateLimit.js";

const router = express.Router();

router.post("/login", authLimiter, login);
router.post("/register", authLimiter, register);

router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", forgotPasswordLimiter, resetPassword);

router.get("/me", protect, me);
router.post("/logout", protect, logout);

export default router;