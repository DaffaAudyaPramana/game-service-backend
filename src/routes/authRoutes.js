import express from "express";
import { login, register, me } from "../controllers/authController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", protect, me);

export default router;