import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//for toggling like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  // 1. Extracting videoId and validating
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  // 2. Validating the logged-in user
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 3. Toggling the like
  const like = await Like.findOneAndDelete({ video: videoId, likedBy: userId });

  if (like) {
    // If the like already exists, it has been deleted
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  // If the like doesn't exist, create it
  await Like.create({ video: videoId, likedBy: userId });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

//for toggling like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  // 1. Extracting commentId and validating
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid commentId");
  }

  // 2. Validating the logged-in user
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 3. Toggling the like
  const like = await Like.findOneAndDelete({
    comment: commentId,
    likedBy: userId,
  });

  if (like) {
    // If the like already exists, it has been deleted
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  // If the like doesn't exist, create it
  await Like.create({ comment: commentId, likedBy: userId });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

//for toggling like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  //1.getting the tweetId
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invalid tweetId");

  // 2. Validating the logged-in user
  const userId = req.user?._id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized access");
  }
  //3. toggling the like
  const like = await Like.findOneAndDelete({ tweet: tweetId, likedBy: userId });

  //4.if the like already exists, it has been deleted
  if (like) {
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  //5.if it doesn't ,create one
  await Like.create({ tweet: tweetId, likedBy: userId });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

//for getting all liked videos by user
const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        video: { $ne: null },
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$onwerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
