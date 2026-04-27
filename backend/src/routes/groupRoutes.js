import express from "express";
import { createGroup, getGroupDetails, getMyGroups, getPlayerCard, joinGroup } from "../controllers/groupController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyGroups);
router.post("/", createGroup);
router.post("/join", joinGroup);
router.get("/:groupId", getGroupDetails);
router.get("/:groupId/players/:userId", getPlayerCard);

export default router;
