import express from "express";
// import { createOrder } from "../controllers/orderController.js";
import { createOrder, getOrderByOrderId } from "../controllers/orderController.js";
import upload from "../utils/upload.js";
import { uploadPaymentProof } from "../controllers/orderController.js";

const router = express.Router();

// endpoint
router.get("/:orderId", getOrderByOrderId);
router.post("/", createOrder);

// endpoint upload bukti
router.post(
  "/:orderId/upload-proof",
  upload.single("file"),
  uploadPaymentProof
);

export default router;