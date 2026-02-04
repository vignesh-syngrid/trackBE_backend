import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const required = ["AWS_REGION", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "S3_BUCKET"];

function assertEnv() {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    const err = new Error(
      `Missing AWS/S3 env vars: ${missing.join(", ")}. Configure .env before uploading.`
    );
    err.status = 500;
    throw err;
  }
}

function getS3() {
  assertEnv();
  return new S3Client({ region: process.env.AWS_REGION });
}

function randomKey(prefix = "uploads/") {
  const id = crypto.randomBytes(16).toString("hex");
  return `${prefix}${new Date().toISOString().slice(0, 10)}/${id}`;
}

export async function uploadBufferToS3({ buffer, contentType, keyPrefix = "uploads/", filename }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const err = new Error("Invalid buffer for upload");
    err.status = 400;
    throw err;
  }
  const bucket = process.env.S3_BUCKET;
  const keyBase = randomKey(keyPrefix);
  const ext = filename && filename.includes(".") ? filename.split(".").pop().toLowerCase() : null;
  const key = ext ? `${keyBase}.${ext}` : keyBase;

  const s3 = getS3();
  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
  });
  await s3.send(cmd);

  // Prefer custom CDN domain when provided
  const cdn = process.env.S3_PUBLIC_BASE_URL; // e.g., https://cdn.example.com
  const url = cdn
    ? `${cdn.replace(/\/$/, "")}/${key}`
    : `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${encodeURI(key)}`;

  return { bucket, key, url, contentType };
}
