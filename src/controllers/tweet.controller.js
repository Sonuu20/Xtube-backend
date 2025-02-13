import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//for creating new tweets
const createTweet = asyncHandler(async (req, res) => {
  //1.getting the content
  const { content } = req.body;

  //2.verifying new document
  if (!content) throw new ApiError(400, "Content is required");

  //3.Creating the tweet document
  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet)
    throw new ApiError(500, "Error while creating new tweet, try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

//for getting all tweets by a user
const getUserTweets = asyncHandler(async (req, res) => {
  //1.getting the userId & validating it
  const { userId } = req.params;
  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");
  //2.getting the tweets documents through pipeline
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      //for gettin onwers details
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      //for getting no likes on each tweet by the user
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeDetails",
        pipeline: [
          {
            $project: {
              likedBy: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likeDetails",
        },
        ownerDetails: {
          $first: "$ownerDetails",
        },
        //finding if the tweet has himself liked by the user
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "likeDetails.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        content: 1,
        ownerDetails: 1,
        likesCount: 1,
        createdAt: 1,
        isLiked: 1,
      },
    },
  ]);

  //3. returning the response
  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

//for updating the tweets of the user
const udpateTweet = asyncHandler(async (req, res) => {
  //1. getting the tweetId and contentId
  const { content } = req.body;
  const { tweetId } = req.params;

  //2. validating it
  if (!content) throw new ApiError(400, "Content is required");
  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Content is required");

  //3.finding the tweet doc
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet not found");

  //4. verifying the users
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only owner can edit thier tweet");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updatedTweet)
    throw new ApiError(500, "Failed to edit the tweet, try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

//for deleting the tweets of the user
const deleteTweet = asyncHandler(async (req, res) => {
  //1.getting the tweetId
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) throw new ApiError(400, "Invlid tweetId");

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) throw new ApiError(404, "Tweet not found");

  //2.verifying the user
  if (tweet?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "only owner can delete their tweet");
  }

  //3.deleting the tweet
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
  if (!deleteTweet) throw new ApiError(500, "tweet not found");

  //4.deleting the likes of the tweet
  const deleteLikes = await Like.deleteMany({
    tweet: new mongoose.Types.ObjectId(tweetId),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, udpateTweet, deleteTweet };
