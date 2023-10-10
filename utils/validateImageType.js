import { fileTypeFromBuffer } from "file-type";

const allowedMimeTypes = [
  "image/jpeg",
  "image/gif",
  "image/png",
  "image/jpg",
  "image/svg+xml",
];

async function getMimeType(imageBuffer) {
  const fileInfo = await fileTypeFromBuffer(imageBuffer);
  return fileInfo.mime;
}

async function validateImageType(imageBuffer) {
  try {
    const fileInfo = await fileTypeFromBuffer(imageBuffer);
    if (fileInfo && allowedMimeTypes.includes(fileInfo.mime)) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error validating image type", error);
    throw error;
  }
}

export { validateImageType, getMimeType };
