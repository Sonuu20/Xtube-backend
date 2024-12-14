import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId, //mtlb jo subscribe kr raha h
    ref: "User",
  },
  channel: {
    type: Schema.Types.ObjectId, //mtlb jis channel ko user subscribe kr raha h
    ref: "User",
  },
}, {timestamps: true});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
