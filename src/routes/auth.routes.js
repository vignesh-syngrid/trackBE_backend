import express from "express";
import { login, mobileLogin, requestOtp, firebaseStatus } from "../controllers/auth.controller.js";
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication
 */
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email & password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT token and user info
 */
export const authRouter = express.Router();
authRouter.post("/login", login);

/**
 * @swagger
 * /auth/mobile-login:
 *   post:
 *     summary: Login via Firebase Phone OTP (mobile)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string, description: Firebase ID token after phone auth }
 *               firebaseToken: { type: string, description: Alias of idToken }
 *     responses:
 *       200:
 *         description: JWT token and user info (same as /auth/login)
 */
authRouter.post("/mobile-login", mobileLogin);

/**
 * @swagger
 * /auth/request-otp:
 *   post:
 *     summary: Precheck phone before sending OTP (client initiates Firebase OTP)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone]
 *             properties:
 *               phone: { type: string, description: Phone number (any format) }
 *     responses:
 *       200:
 *         description: Phone recognized; proceed with Firebase client OTP
 *       404:
 *         description: No account mapped to phone
 */
authRouter.post("/request-otp", requestOtp);

// Simple health check for Firebase Admin configuration
/**
 * @swagger
 * /auth/firebase-status:
 *   get:
 *     summary: Firebase Admin readiness
 *     description: Returns whether the server has Firebase Admin configured.
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Readiness status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                   description: True when Firebase Admin is initialized
 */
authRouter.get("/firebase-status", firebaseStatus);
