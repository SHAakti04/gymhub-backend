import { getImageUploadSignature } from "../../config/uploads.js";

export const uploadsService = {
  imageSignature(folder?: string) {
    return getImageUploadSignature(folder);
  }
};