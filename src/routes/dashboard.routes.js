import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getChannelStats,
  getChannelVideos,
} from "../controllers/dashboard.controller";

const router = Router();

router.route(verifyJWT); // Applying verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStats);
router.route("/videos").get(getChannelVideos);

export default router;
