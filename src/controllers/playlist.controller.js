import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//for creating new playlist
const createPlaylist = asyncHandler(async (req, res) => {
  //1.getting the name & description of the playlist
  const { name, description } = req.body;

  //2.checking of the name & description
  if (!name || !description)
    throw new ApiError(400, " Name & description are required ");

  //3. creating the playlist
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  if (!playlist)
    throw new ApiError(500, "Error while creating new playlist, try again! ");

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

//for getting the existing user playlist
const getUserPlaylist = asyncHandler(async (req, res) => {
  //1.getting the userId
  const { userId } = req.params;

  //2.validating the userId
  if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId");

  //3.find the playlist by userId from the Playlist model
  const playlists = await Playlist.find({ owner: userId });

  if (!playlists) throw new ApiError(404, "No Playlist found");

  return res
    .status(201)
    .json(new ApiResponse(200, playlists, "Playlist fetched successfully"));
});

//getting a specific Playlist by id
const getPlaylistById = asyncHandler(async (req, res) => {
  //1.getting the playlistId
  const { playlistId } = req.params;

  //2.validating teh playlistId
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlist id");

  //3. finding the playist from the Playlist model
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "No Playlist found");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

//add a new video to a specific playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  //1.getting the video & playlist id to add
  const { playlistId, videoId } = req.params;

  //.2 validating the playlist & video id
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlistId or videoId");
  }

  //3.finding the playist from the Playlist model
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");

  //4.validating if the playlist and user are same
  if (playlist.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only the owner can add video to the playlist");
  }

  //5.adding the videoid to the playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: {
        videos: videoId,
      },
    },
    { new: true }
  );

  if (!updatedPlaylist)
    throw new ApiError(
      500,
      "Error while adding video to the playlist, try again!"
    );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isAdded: true },
        "Video added to the playlist successfully "
      )
    );
});

//removing the video from the playlsit
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  //getting the playistId & videoId
  const { playlistId, videoId } = req.params;

  //validating it
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid playlistId & videoId ");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");

  //checking if the video is there is playlist or not
  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(404, "Video not found in playlist");
  }

  //checking the user authentication
  if (!playlist.owner.equals(req.user?._id)) {
    throw new ApiError(
      403,
      "You are not allowed to remove video from the playlist"
    );
  }

  //removing the playlist from the array
  playlist.videos.pull(videoId);
  const checkSaved = await playlist.save();

  if (!checkSaved)
    throw new ApiError(500, "Failed to remove video from playlist, try again!");

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isSuccess: true },
        "Video removed from the playlist successfully "
      )
    );
});

//removing a specific playlist from the users playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  //getting the playlistId
  const { playlistId } = req.params;

  //authenticating it
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlistId");

  //finding the playlist in the Playlist model
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "Playlist not found");

  //authenticating the user
  if (!playlist.owner.equals(req.user?._id)) {
    throw new ApiError(403, "You are not allowed to delete the playlist");
  }

  //deleting the playlist
  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

  if (!deletedPlaylist)
    throw new ApiError(500, "Error while deleting the playlist, try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, "Playlist deleted successfully"));
});

//for upating the name & description of the playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  //getting the playlistId, name & description
  const { playlistId } = req.params;
  const { name, description } = req.body;

  //validating them
  if (!isValidObjectId(playlistId))
    throw new ApiError(400, "Invalid playlistId");

  if (!name && !description)
    throw new ApiError(400, "Name & description are required");

  //finding the playlist from Playlist model
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) throw new ApiError(404, "No playlist found");

  //authenticating the user
  if (!playlist.owner.equals(req.user?._id)) {
    throw new ApiError(403, "You are not allowed to update the playlist");
  }

  //updating the playlist
  playlist.name = name;
  playlist.description = description;
  const checkUpdated = await playlist.save();

  if (!checkUpdated)
    throw new ApiError(500, "Error while updating the playlist, try again!");

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
};
