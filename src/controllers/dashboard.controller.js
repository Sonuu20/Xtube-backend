import mongoose from "mongoose";
import { Video } from "../models/vedio.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//for getting the stats of the specific channel
const getChannelStats = asyncHandler(async (req, res) => {
  //1.extracting the userId
  const userId = req.user?._id;

  //2.getting total no of subscribers
  const totalSubscribers = await Subscription.aggregate([
    {
      //getting the total no of subscriber through channel
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        subscribersCount: {
          $sum: 1,
        },
      },
    },
  ]);

  //3.getting all stats related to video
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      //getting the total no of likes on each video
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $project: {
        //total count of like, totalViews & totalVideos of each video
        totalLikes: {
          $size: "$likes",
        },
        totalViews: "$views",
        totalVideos: 1,
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: "$totalLikes",
        },
        totalViews: {
          $sum: "totalViews",
        },
        totalVideos: {
          $sum: 1,
        },
      },
    },
  ]);

  //4.getting all channelStats
  const channelStats = {
    ownerName: req.user?.fullName,
    totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
    totalLikes: videoStats[0]?.totalLikes || 0,
    totalViews: videoStats[0]?.totalViews || 0,
    totalVideos: videoStats[0]?.totalVideos || 0,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel stats fetched successfully")
    );
});

//for getting all channel uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {
  //1.extracting the userId
  const userId = req.user?._id;

  //2.creating a new pipeline
  const allVideos = await Video.aggregate([
    {
      //getting all vidoes from vidoes using userId
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      //getting lies on each videos
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        createdAt: {
          $dateToParts: { date: "$createdAt" },
        },
        //for total no likesCount
        likesCount: {
          $size: "$likes",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      //displaying all data of the video
      $project: {
        _id: 1,
        "videoFile.url": 1,
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        createdAt: {
          year: 1,
          month: 1,
          day: 1,
        },
        isPublished: 1,
        likesCount: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "All vdioes fetched successfully"));
});

export { getChannelStats, getChannelVideos };
