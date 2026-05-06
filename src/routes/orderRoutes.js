import express from "express";

import {
  createOrder,
  getOrderByOrderId,
  uploadPaymentProof,
  getAllOrders,
  updatePaymentStatus,
} from "../controllers/orderController.js";

import upload from "../utils/upload.js";

import { protect } from "../middlewares/auth.js";

const router = express.Router();

// GET ALL ORDERS
router.get("/", getAllOrders);

// GET SINGLE ORDER
router.get("/:orderId", getOrderByOrderId);

// CREATE ORDER (LOGIN REQUIRED)
router.post("/", protect, createOrder);

// UPLOAD PAYMENT PROOF
router.post(
  "/:orderId/upload-proof",
  upload.single("file"),
  uploadPaymentProof
);

// UPDATE PAYMENT STATUS
router.patch("/:orderId/payment", updatePaymentStatus);

export default router;