import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//for subscribe and unsubscirbe the channel
const toggleSubscription = asyncHandler(async (req, res) => {
  //getting the channel from params
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel Id");
  }

  //find the channel
  const isSubscribed = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });

  if (isSubscribed) {
    //if subscribed, unsubscirbing
    await isSubscribed.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Channel unsubscirbed successfully"));
  } else {
    //if not subscribed, subscribing
    const newSubscription = await Subscription.create({
      channel: channelId,
      subscriber: req.user?._id,
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, newSubscription, "Channel subscribed successfully")
      );
  }
});

//controller to return subscribers to a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  //getting channelId from params,
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  //fetching the userIds from the subsciriber using pipepline
  const subscribers = await Subscription.aggregate([
    {
      //finding the channel
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    //getting subscriber details from the "users" collection
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
      },
    },
    //Unwind the subscriber array to simplify the structure
    {
      $unwind: "$subscriber",
    },
    //Adding the subscriber count field
    {
      $lookup: {
        from: "subscriptions",
        localField: "subscriber._id",
        foreignField: "subscriber",
        as: "subscriberSubscriptions",
      },
    },
    //counting the total subscribers
    {
      $addFields: {
        "subscriber.subscribersCount": { $size: "$subscriberSubscriptions" },
      },
    },
    //projecting the data to be send to frontend
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
          subscribersCount: 1,
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid susbscriber id");
  }

  const subscribedChannels = await Subscription.aggregate([
    // Matching subscriptions for the given subscriberId
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    // Lookup channel details from the "users" collection for the details about the channels
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    //Unwind the channel array to Object to simplify
    {
      $unwind: {
        path: "$channel",
        preserveNullAndEmptyArrays: true, //keep the result even if the channel list is null
      },
    },
    //ye return karega ki har channel ki kitne subscirebers h
    {
      $lookup: {
        from: "subscriptions",
        localField: "channel._id",
        foreignField: "channel", //channel se subscribers milega
        as: "channelSubscribers",
      },
    },
    // Add subscirbersCount field to each channel
    {
      $addFields: {
        "channel.subscribersCount": { $size: "$channelSubscribers" },
      },
    },
    //jo fields frontend ko bhejna h
    {
      $project: {
        _id: 0,
        subscriber: 1,
        channel: {
          _id: 1,
          username: 1,
          fullName: 1,
          "avatar.url": 1,
          subscribersCount: 1,
        },
      },
    },
  ]);

  if (!subscribedChannels.length) {
    throw new ApiError(404, "No channels found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { subscribedChannels },
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
