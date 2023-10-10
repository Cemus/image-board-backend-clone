import { Router } from "express";
import "dotenv/config";
import { deleteObjects, listObjects, uploadMulter } from "../utils/s3Utils.js";

const router = Router();
import {
  getThreads,
  getSingleThread,
  createThread,
  createReply,
} from "../controllers/threadController.js";

listObjects();

// GET every threads
router.get("/", getThreads);

// GET images

// GET one thread
router.get("/:id", getSingleThread);

// PATCH one thread (replies)
router.patch("/:id", uploadMulter.single("image"), createReply);

// POST one thread
router.post("/", uploadMulter.single("image"), createThread);

export default router;
