import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//for json data
app.use(
  express.json({
    limit: "16kb",
  })
);

//for endcoding the url
app.use(
  express.urlencoded({
    extended: true,
    limit: "16kb",
  })
);

//for storing the images, pdf in the server in the public folder
app.use(express.static("public"));

//for setting the cookie  in the user browser
app.use(cookieParser());

//HTTP request logger middleware for node.js
app.use(morgan("dev"));

//routes import
import userRouter from "./routes/user.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";

//routes delcration
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter); //jaise hi users url hit hoga, control userRouter ke paas chala jayega
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };
