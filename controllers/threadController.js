import { validateImageType, getImageType } from "../utils/validateImageType.js";
import getImageMetadata from "../utils/getImageMetadata.js";
import uniqueIdGeneration from "../utils/uniqueIdGeneration.js";
import { Types } from "mongoose";
import { Thread, Reply } from "../models/threadModel.js";
import "dotenv/config";

import { downloadImageFromS3, getImageUrl } from "../utils/s3Utils.js";

// GET every threads
const getThreads = async (req, res) => {
  const threads = await Thread.find({}).sort({ bumpDate: -1 });
  if (!threads) {
    return res.status(204);
  }
  res.status(200).json(threads);
};

// GET one thread
const getSingleThread = async (req, res) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "No such thread" });
  }
  const thread = await Thread.findById(id).populate("replies");

  if (!thread) {
    return res.status(404).json({ error: "No such thread" });
  }

  res.status(200).json(thread);
};

//POST a thread
const createThread = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file has been downloaded." });
  }
  const imageKey = req.file.key;
  console.log(req.file);
  console.log("location");
  console.log(req.file.location);
  // Télécharger l'image depuis S3
  const imageBuffer = await downloadImageFromS3(imageKey);

  // Valider le type d'image
  const isValidImage = await validateImageType(imageBuffer);
  if (!isValidImage) {
    console.error(result.error);
    return res.status(400).json({ error: "Invalid file format." });
  }
  const metadata = await getImageMetadata(imageBuffer);
  const dataUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const { width, height } = metadata;

  try {
    const { opName, subject, comment } = req.body;
    const { size } = req.file;
    const imageUrl = `${getImageUrl(imageKey)}${getImageType}`;
    console.log("url :");
    console.log(imageUrl);
    const thread = await Thread.create({
      opName,
      subject,
      comment,
      image: dataUrl,
      imageWidth: width,
      imageHeight: height,
      imageSize: Math.floor(size / 1000),
      replies: [],
    });
    await thread.save();
    thread.bumpDate = thread.createdAt;
    thread.formatedId = await uniqueIdGeneration();
    await thread.save();

    const allThreads = await Thread.find({}).sort({ bumpDate: 1 });
    const maxThreads = 16;
    if (allThreads.length > maxThreads) {
      await Thread.findByIdAndDelete(allThreads[0]._id);
    }

    res.status(200).json(thread);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
};

// PATCH reply
const createReply = async (req, res) => {
  //Image
  let imagePath = null;
  let width = 0;
  let height = 0;
  if (req.file) {
    imagePath = req.file.path;
    const result = await validateImageType(imagePath);
    if (!result.ok) {
      console.error(result.error);
      return res.status(400).json({ error: "Invalid file format." });
    }
    const metadata = await getImageMetadata(imagePath);
    width = metadata.width;
    height = metadata.height;
  }
  size = req.file ? req.file.size : 0;
  // Test ID
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "bad ID" });
  }
  //Creation de la réponse
  const { name, comment } = req.body;
  const newReply = await Reply.create({
    name,
    comment,
    image: imagePath,
    imageWidth: width,
    imageHeight: height,
    imageSize: Math.floor(size / 1000),
    date: Date.now(),
  });
  await newReply.save();

  newReply.formatedId = await uniqueIdGeneration();
  await newReply.save();

  //Le thread
  const thread = await Thread.findById(id);
  if (!thread) {
    return res.status(404).json({ error: "No such thread" });
  }
  //La reponse est-elle une réponse à quelqu'un ?
  try {
    const regex = /(\d{8})/g;
    if (regex.test(comment)) {
      const matches = comment.match(regex);
      let parentReply;
      for (const match of matches) {
        parentReply = await Reply.findOne({
          formatedId: match,
        });
        if (!parentReply) {
          parentReply = await Thread.findOne({
            formatedId: match,
          });
        }
        if (parentReply) {
          parentReply.directReplies.push(newReply.formatedId);
          await parentReply.save();
        } else {
          console.log(`No comment found : ${match}`);
        }
      }
    }

    thread.replies.push(newReply);
    thread.bumpDate = newReply.createdAt;
    await thread.save();
    res.status(200).json(thread);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export { getThreads, getSingleThread, createThread, createReply };
