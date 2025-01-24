import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/vedio.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//getting all comments for a specific video
const getVideoComments = asyncHandler(async (req, res) => {
  //1.getting the videoId, page and limit
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videId");

  //2.finding the video from the Video model
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found");

  //3.creating the pipleline to get all the comment on the particular video
  const allComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      //getting the owners of the comment
      $lookup: {
        from: "users",
        localField: "onwer",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      //getting the likes on each comment
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
        isLikedByVideoOwner: {
          $cond: {
            if: { $in: [video.owner, "$likes.likedBy"] },
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
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
        isLikedByVideoOwner: 1,
      },
    },
  ]);

  //4.for aggregating the pages to display comment
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const comments = await Comment.aggregatePaginate(allComments, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

//for adding comment to a specific video
const addComment = asyncHandler(async (req, res) => {
  //1.getting the videoId and content of the comment
  const { videoId } = req.params;
  const { content } = req.body;

  //2.validating them
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");
  if (!content) throw new ApiError(400, "No content found");

  //3.if no error, creating the new comment document
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!comment)
    throw new ApiError(500, "Failed to add comment please try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment addded successfully"));
});

//for updating the existing doucment
const updateComment = asyncHandler(async (req, res) => {
  //1.getting the commentId and the udpatedContent
  const { commentId } = req.params;
  const { content } = req.body;

  //2.validating them
  if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid commentId");
  if (!content) throw new ApiError(400, "No content found");

  //3.finding the comment doc in the model
  const comment = await Comment.findById(commentId);

  if (!comment) throw new ApiError(404, "Comment not found!");

  //4.verifying the onwer of the comment
  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Only the owner can edit their comment");
  }

  //5.updating the comment doucment
  const updatedComment = await Comment.findByIdAndUpdate(
    comment?._id,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  if (!updateComment)
    throw new ApiError(500, "Failed to edit comment please try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment eidted successfully"));
});

//for delteing the comment
const deleteComment = asyncHandler(async (req, res) => {
  //1.getting the commentId to be deleted & validating it
  const { commentId } = req.params;
  if (!isValidObjectId(commentId)) throw new ApiError(400, "Invalid commentId");

  //2.finding the comment doucment
  const comment = await Comment.findById(commentId);

  if (!comment) throw new ApiError(404, "Comment not found!");

  //3.verifying the user
  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Only owner can delete their comment");
  }

  //deleting the comment and likes in it
  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({
    comment: commentId,
    likedBy: req.user,
  });

  return res
    .status(200)
    .json(
      new ApiResponse(200, { isDelted: true }, "Comment deleted successfully")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
