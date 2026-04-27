import express from "express";
import { getMe, getStravaLoginUrl, loginUser, loginWithStrava, registerUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/strava/url", getStravaLoginUrl);
router.post("/strava", loginWithStrava);
router.get("/me", protect, getMe);

export default router;
