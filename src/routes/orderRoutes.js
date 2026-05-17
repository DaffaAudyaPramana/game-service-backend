import express from "express";
import {
  createOrder,
  getOrderByOrderId,
  uploadPaymentProof,
  getAllOrders,
  updatePaymentStatus,
  getMyOrders,
} from "../controllers/orderController.js";
import upload from "../utils/upload.js";
import { protect } from "../middlewares/auth.js";
import { adminOnly } from "../middlewares/admin.js";

const router = express.Router();

// GET MY ORDERS
router.get("/my", protect, getMyOrders);

// CREATE ORDER (LOGIN REQUIRED)
router.post("/", protect, createOrder);

// GET ALL ORDERS
router.get("/", getAllOrders);

// GET SINGLE ORDER
router.get("/:orderId", getOrderByOrderId);

// UPLOAD PAYMENT PROOF
router.post(
  "/:orderId/upload-proof",
  upload.single("file"),
  uploadPaymentProof
);

// UPDATE PAYMENT STATUS
router.patch(
  "/:orderId/payment-status",
  protect,
  adminOnly,
  updatePaymentStatus
);

export default router;