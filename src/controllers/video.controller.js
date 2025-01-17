import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/vedio.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

//fot gettng vedios based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
  //extracting parameters
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  console.log(userId);

  //initailzing the pipeline
  const pipeline = [];

  //full-text search if query is there
  if (query) {
    pipeline.push({
      $search: {
        index: "search-vidoes",
        text: {
          query: query,
          path: ["title", "description"], //searches only on title, descending order
        },
      },
    });
  }

  //filtering using the userId
  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: {
          owner: new mongoose.Types.ObjectId(userId),
        },
      },
    });
  }

  //fetching videos that are publised only(not the unpublised one)
  pipeline.push({ $match: { isPublished: true } });

  //sortBy can be views, createdAt, duration
  //sortType can be ascending(-1) or decending(1)
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  //getting channel details which had uploaded the videos
  pipeline.push(
    {
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
      $unwind: "$ownerDetails",
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Vidoes fetched successfully"));
});

//for uploading the vedio on the cloudinary
const publishAVideo = asyncHandler(async (req, res) => {
  //getting the title and description
  const { title, description } = req.body;
  if (!title) throw new ApiError(400, "Title is required");

  if ([title, description].some((filed) => filed.trim() === "")) {
    throw new ApiError(400, "All the fields are required");
  }

  //to get the localpath of both the files
  const vedioFileLocalPath = req.files?.vedioFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0].path;

  //checking for error
  if (!vedioFileLocalPath) {
    throw new ApiError(400, "vedioFileLocalPath is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnailLocalPath is required");
  }

  //uploading the file on the cloudinary
  const vedioFile = await uploadOnCloudinary(vedioFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!vedioFile) throw new ApiError(500, "Error while uploading vedioFile");
  if (!thumbnail) throw new ApiError(400, "Error while uploading thumbnail");

  //creating the new vedio document
  const vedio = await Video.create({
    title,
    description: description || "No description provided",
    duration: vedioFile.duration,
    vedioFile: {
      url: vedioFile.url,
      public_id: vedioFile.public_id,
    },
    thumbnail: {
      url: thumbnail.url,
      public_id: thumbnail.public_id,
    },
    owner: req.user?._id,
    isPublished: false,
  });

  const vedioUploaded = await Video.findById(vedio._id);

  //if the upload failed
  if (!vedioUploaded)
    throw new ApiError(500, "vedioUpload failed, please try again!!");

  return res
    .status(200)
    .json(new ApiResponse(200, vedio, "Vedio uploaded successfully"));
});

//for finding a vedio based on id
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //checking the validity fo the videoId
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  //creating the pipeline
  const video = await Video.aggregate([
    //find the vedio through match
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      //gives the number of likes from the like model in array
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    //fetching the owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        //getting the subscribers
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscirbers",
              },
              //finding if the user has subscribed the channel
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          //things to give to the frontend
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
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
        //checking if the user had liked the video or not
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!video) throw new ApiError(500, "Error while fetching the vedio by Id");

  //increment the view of the video if fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  //add this video to the user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video details fetched successfully"));
});

//for updating the video by the owner
const updateVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { videoId } = req.params;

  // Validate the videoId
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

  // Validate title
  if (!title || typeof title !== "string" || title.trim() === "") {
    throw new ApiError(400, "Invalid title");
  }

  // Validate description
  if (
    !description ||
    typeof description !== "string" ||
    description.trim() === ""
  ) {
    throw new ApiError(400, "Invalid description");
  }

  // Find the video
  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(400, "No video found");

  // Check if the user is authorized to edit the video
  if (video.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(403, "You can't edit this video, access denied");
  }

  // Prepare the update object
  const updateData = {
    title,
    description,
  };

  // Handle thumbnail update
  if (req.file?.path) {
    const thumbnailToDelete = video.thumbnail.public_id;

    try {
      const thumbnail = await uploadOnCloudinary(req.file.path);
      if (!thumbnail) {
        throw new ApiError(500, "Error while uploading Thumbnail, try again!");
      }

      updateData.thumbnail = {
        public_id: thumbnail.public_id,
        url: thumbnail.url,
      };

      // Delete old thumbnail after successful upload
      if (thumbnailToDelete) {
        await deleteOnCloudinary(thumbnailToDelete);
      }
    } catch (error) {
      throw new ApiError(
        500,
        `Error processing the thumbnail: ${error.message}`
      );
    }
  }

  // Update the video
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateData },
    { new: true }
  );
  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video, please try again!");
  }

  // Return the updated video
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

//for deleting the video
const deleteVideo = asyncHandler(async (req, res) => {
  //1.getting the video by videoid
  const { videoId } = req.params;

  //2.validating tthe video id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }
  //3.finding the video
  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "No video found");

  //4.authenciating the user
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't delete this video as you are not the owner"
    );
  }

  //5.deleting the video document
  const videoDeleted = await Video.findByIdAndDelete(video?._id);

  if (!videoDeleted)
    throw new ApiError(500, "Failed to delete the video please try again!");

  //6.deleting the thumbnail & video from cloudinary
  await deleteOnCloudinary(video.thumbnail.public_id);
  await deleteOnCloudinary(video.videoFile.public_id, "video"); // specify video while deleting video

  //7.deleting video from Comment, Like model
  await Like.deleteMany({
    video: videoId,
  });

  await Comment.deleteMany({
    video: videoId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "video deleted successfully"));
});

//for changing the publish or unpublish of video
const togglePublishStatus = asyncHandler(async (req, res) => {
  //1.geting the videoId
  const { videoId } = req.params;

  //2.authenticating the videoId
  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId ");

  //3.getting the video document
  const video = await Video.findById(videoId);

  if (!video) throw new ApiError(404, "No video found");

  //4.authenticating the user
  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You can't toogle the publish status, access denied! "
    );
  }

  //5.toggling the isPublished from video
  const toggleVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video?.isPublished,
      },
    },
    { new: true }
  );

  if (!toggleVideoPublish)
    throw new ApiError(500, "Failed to toggle publish status, try again!");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: togglePublishStatus.isPublished },
        "Video toggle successfully "
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
