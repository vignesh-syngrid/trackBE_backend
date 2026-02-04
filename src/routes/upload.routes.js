import express from "express";
import multer from "multer";
import { uploadBufferToS3 } from "../utils/s3.js";
import { rbac } from "../middleware/rbac.js";

export const uploadRouter = express.Router();

// Store file in memory for direct S3 upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024) }, // default 10MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype);
    if (!ok) return cb(new Error("Only image uploads are allowed"));
    cb(null, true);
  },
});

// Allow image or PDF
const uploadAny = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\//i.test(file.mimetype) || file.mimetype === "application/pdf";
    if (!ok) return cb(new Error("Only image or PDF uploads are allowed"));
    cb(null, true);
  },
});

/**
 * POST /uploads/image
 * Form-data: field name "image" (single file)
 * Returns: { url, key, bucket, contentType }
 */
/**
 * @openapi
 * /uploads/image:
 *   post:
 *     summary: Upload a single image
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       201:
 *         description: Uploaded image info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResult'
 *       400:
 *         description: Validation error
 */
uploadRouter.post(
  "/image",
  rbac("Manage Job", "edit"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        const err = new Error("No image provided");
        err.status = 400;
        throw err;
      }
      const { buffer, mimetype, originalname } = req.file;
      const result = await uploadBufferToS3({
        buffer,
        contentType: mimetype,
        filename: originalname,
        keyPrefix: process.env.S3_KEY_PREFIX || "uploads/images/",
      });
      res.status(201).json(result);
    } catch (e) {
      if (String(e?.message || "").includes("Only image uploads")) {
        e.status = 400;
      }
      next(e);
    }
  }
);

/**
 * POST /uploads/file
 * Form-data: field name "file" (image or PDF)
 */
/**
 * @openapi
 * /uploads/file:
 *   post:
 *     summary: Upload an image or PDF
 *     tags: [Uploads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image or PDF file
 *     responses:
 *       201:
 *         description: Uploaded file info
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadResult'
 *       400:
 *         description: Validation error
 */
uploadRouter.post(
  "/file",
  rbac("Manage Job", "edit"),
  uploadAny.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        const err = new Error("No file provided");
        err.status = 400;
        throw err;
      }
      const { buffer, mimetype, originalname } = req.file;
      const result = await uploadBufferToS3({
        buffer,
        contentType: mimetype,
        filename: originalname,
        keyPrefix: process.env.S3_KEY_PREFIX_MISC || "uploads/files/",
      });
      res.status(201).json(result);
    } catch (e) {
      if (String(e?.message || "").includes("uploads are allowed")) e.status = 400;
      next(e);
    }
  }
);
