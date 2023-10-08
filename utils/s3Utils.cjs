const {
  ListObjectsCommand,
  DeleteObjectCommand,
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { Readable } = require("stream");
const bucketName = process.env.CYCLIC_BUCKET_NAME;
const s3 = new S3Client();

const multer = require("multer");
const multerS3 = require("multer-s3");
const uploadMulter = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString());
    },
  }),
});

const deleteObjects = async () => {
  try {
    // Liste tous les objets dans le bucket
    const data = await s3.send(new ListObjectsCommand({ Bucket: bucketName }));

    // Supprime chaque objet individuellement
    for (const content of data.Contents) {
      const deleteObjectParams = {
        Bucket: bucketName,
        Key: content.Key,
      };

      await s3.send(new DeleteObjectCommand(deleteObjectParams));

      console.log(`Objet ${content.Key} supprimé.`);
    }

    console.log("Tous les objets ont été supprimés avec succès.");
  } catch (error) {
    console.error("Erreur lors de la suppression des objets :", error);
  }
};

const listObjects = async () => {
  const params = {
    Bucket: bucketName,
  };
  const command = new ListObjectsCommand(params);
  try {
    const data = await s3.send(command);
    console.log("Objets dans le bucket:");
    data.Contents.forEach((object) => {
      console.log(object.Key);
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => {
      chunks.push(chunk);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on("error", (error) => {
      reject(error);
    });
  });
};

const downloadImageFromS3 = async (imagePath) => {
  const params = {
    Bucket: bucketName,
    Key: imagePath,
  };

  try {
    const response = await s3.send(new GetObjectCommand(params));
    const buffer = await streamToBuffer(response.Body);
    console.log("Image Data:", buffer);
    return buffer.toString("base64");
  } catch (error) {
    console.error(
      "Erreur lors du téléchargement de l'image depuis S3 :",
      error
    );
    throw new Error("Impossible de télécharger l'image depuis S3");
  }
};

module.exports = {
  deleteObjects,
  listObjects,
  downloadImageFromS3,
  uploadMulter,
};
