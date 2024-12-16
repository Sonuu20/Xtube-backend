import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT); //beacuse all the routes are the secured and verifyed user routes only

router
  .route("/channel/:channelId")
  .get(getUserChannelSubscribers)
  .post(toggleSubscription);

router.route("/user/:subscriberId").get(getSubscribedChannels);

export default router;
