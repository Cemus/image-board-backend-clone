import { validateImageType, getMimeType } from "../utils/validateImageType.js";
import getImageMetadata from "../utils/getImageMetadata.js";
import threadPurge from "../utils/threadPurge.js";
import uniqueIdGeneration from "../utils/uniqueIdGeneration.js";
import { Types } from "mongoose";
import { Thread, Reply } from "../models/threadModel.js";
import "dotenv/config";

import { downloadImageFromS3 } from "../utils/s3Utils.js";

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
    return res.status(404).json({ error: "l'ID ne renvoie à aucun thread" });
  }
  const thread = await Thread.findById(id).populate("replies");

  if (!thread) {
    return res.status(404).json({ error: "Pas de thread trouvé." });
  }

  res.status(200).json(thread);
};

//GET images
const getImages = async (req, res) => {
  try {
    const imageKey = req.params.imageKey;
    // Utilisez cette clé pour récupérer l'image depuis S3
    const imageBuffer = await downloadImageFromS3(imageKey);
    const mimeType = await getMimeType(imageBuffer);
    // Envoyez l'image au client
    res.setHeader("Content-Type", mimeType); // Assurez-vous que le type de contenu est correct
    res.send(imageBuffer);
  } catch (error) {
    console.error("Erreur lors de la récupération de l'image :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

//POST a thread
const createThread = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Rien n'a été téléchargé" });
  }
  const imageKey = req.file.key;
  // Télécharger l'image depuis S3
  const imageBuffer = await downloadImageFromS3(imageKey);

  // Valider l'image
  const isValidImage = await validateImageType(imageBuffer);
  if (!isValidImage) {
    console.error(result.error);
    return res.status(400).json({ error: "Fichier au format invalide" });
  }
  const metadata = await getImageMetadata(imageBuffer);
  const { width, height } = metadata;

  try {
    const { opName, subject, comment } = req.body;
    const { size } = req.file;

    const thread = await Thread.create({
      opName,
      subject,
      comment,
      image: imageKey,
      imageWidth: width,
      imageHeight: height,
      imageSize: Math.floor(size / 1000),
      replies: [],
    });
    await thread.save();
    thread.bumpDate = thread.createdAt;
    thread.formatedId = await uniqueIdGeneration();
    await thread.save();

    //Supprime les vieux threads
    await threadPurge();

    res.status(200).json(thread);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: error.message });
  }
};

// PATCH reply
const createReply = async (req, res) => {
  //Image
  let imageKey = null;
  let width = 0;
  let height = 0;
  console.log("req");
  console.log(req);
  if (req.file) {
    console.log("req file");
    console.log(req.file);
    imageKey = req.file.key;
    // Télécharger l'image depuis S3
    const imageBuffer = await downloadImageFromS3(imageKey);
    // Valider l'image
    const isValidImage = await validateImageType(imageBuffer);
    if (!isValidImage) {
      console.error(result.error);
      return res.status(400).json({ error: "Fichier au format invalide" });
    }
    const metadata = await getImageMetadata(imageBuffer);
    width = metadata.width;
    height = metadata.height;
  }
  const size = req.file ? req.file.size : 0;
  // Test ID
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) {
    return res.status(404).json({ error: "Mauvaise ID" });
  }
  //Creation de la réponse
  const { name, comment } = req.body;
  const newReply = await Reply.create({
    name,
    comment,
    image: imageKey,
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
    return res.status(404).json({ error: "Thread non trouvé" });
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
          console.log(`Pas de commentaire lié à : ${match}`);
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

export { getImages, getThreads, getSingleThread, createThread, createReply };
