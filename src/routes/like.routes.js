import { Router } from "express";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT); //applying verifyJWT middleware to all routes

router.route("/toggle/v/:videoId").post(toggleVideoLike);
router.route("/toggle/v/:commentId").post(toggleCommentLike);
router.route("/toggle/v/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router;