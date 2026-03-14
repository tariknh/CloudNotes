import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";

import { supabase } from "@/lib/supabase";

export const NOTE_IMAGES_BUCKET = "note-images";

function guessImageContentType(uri: string) {
  const normalizedUri = uri.split("?")[0].toLowerCase();

  if (normalizedUri.endsWith(".png")) {
    return "image/png";
  }

  if (normalizedUri.endsWith(".webp")) {
    return "image/webp";
  }

  if (normalizedUri.endsWith(".heic") || normalizedUri.endsWith(".heif")) {
    return "image/heic";
  }

  return "image/jpeg";
}

function getFileExtension(uri: string) {
  const contentType = guessImageContentType(uri);
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic") return "heic";
  return "jpeg";
}

/*
 * Generates a unique path for the image to prevent overwriting.
 */
export function generateNoteImagePath(noteId: string, uri: string) {
  const ext = getFileExtension(uri);
  const filename = `${uuidv4()}.${ext}`;
  return `notes/${noteId}/${filename}`;
}

export async function validateImage(uri: string) {
  const fileInfo = await FileSystem.getInfoAsync(uri);

  if (!fileInfo.exists) {
    throw new Error("Image file does not exist locally.");
  }

  const MAX_SIZE = 15 * 1024 * 1024;

  if (fileInfo.size > MAX_SIZE) {
    throw new Error("Image size exceeds 15MB limit.");
  }

  const contentType = guessImageContentType(uri);
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];

  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      "Invalid image format. Only JPG, PNG, and WebP are allowed.",
    );
  }
}

export function getNoteImagePublicUrl(
  imagePath?: string | null,
  cacheKey?: string,
) {
  if (!imagePath) {
    return undefined;
  }

  const { data } = supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .getPublicUrl(imagePath);

  if (!cacheKey) {
    return data.publicUrl;
  }

  const separator = data.publicUrl.includes("?") ? "&" : "?";
  return `${data.publicUrl}${separator}v=${encodeURIComponent(cacheKey)}`;
}

export async function uploadNoteImage(noteId: string, sourceUri: string) {
  await validateImage(sourceUri);

  const imagePath = generateNoteImagePath(noteId, sourceUri);

  const base64Image = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const imageBuffer = decode(base64Image);

  const { error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .upload(imagePath, imageBuffer, {
      upsert: false,
      contentType: guessImageContentType(sourceUri),
    });

  if (error) {
    throw error;
  }

  return imagePath;
}

export async function removeNoteImage(imagePath?: string | null) {
  if (!imagePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .remove([imagePath]);

  if (error) {
    throw error;
  }
}
