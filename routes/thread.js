import { Router } from "express";
import "dotenv/config";
import { deleteObjects, listObjects, uploadMulter } from "../utils/s3Utils.js";
import {
  getImages,
  getThreads,
  getSingleThread,
  createThread,
  createReply,
} from "../controllers/threadController.js";

const router = Router();

// GET every threads
router.get("/", getThreads);

// GET images
router.get("/images/:imageKey", getImages);

// GET one thread
router.get("/:id", getSingleThread);

// PATCH one thread (replies)
router.patch("/:id", uploadMulter.single("image"), createReply);

// POST one thread
router.post("/", uploadMulter.single("image"), createThread);

export default router;
