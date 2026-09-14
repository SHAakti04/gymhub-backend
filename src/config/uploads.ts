import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { AppError } from "../common/errors/app-error.js";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET
});

export function getImageUploadSignature(folder?: string) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new AppError(500, "CLOUDINARY_NOT_CONFIGURED", "Cloudinary is not configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const targetFolder = folder ?? env.CLOUDINARY_UPLOAD_FOLDER;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: targetFolder },
    env.CLOUDINARY_API_SECRET
  );

  return {
    timestamp,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    folder: targetFolder
  };
}