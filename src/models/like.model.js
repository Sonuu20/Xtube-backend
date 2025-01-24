import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Add a validation to ensure only one of video/comment/tweet is populated
likeSchema.pre("save", function (next) {
  const fields = ["video", "comment", "tweet"];
  const populatedFields = fields.filter((field) => this[field]);

  if (populatedFields.length > 1) {
    return next(
      new Error("Only one of video, comment, or tweet can be liked at a time")
    );
  }

  next();
});

export const Like = mongoose.model("Like", likeSchema);
