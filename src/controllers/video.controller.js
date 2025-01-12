import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/vedio.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
const publishAVedio = asyncHandler(async (req, res) => {
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

export { getAllVideos, publishAVedio };
