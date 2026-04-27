import express from "express";
import { connectStrava, getConnectUrl, syncActivities } from "../controllers/stravaController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/connect-url", getConnectUrl);
router.post("/connect", connectStrava);
router.post("/sync", syncActivities);

export default router;
