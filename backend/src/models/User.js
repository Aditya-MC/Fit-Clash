import mongoose from "mongoose";

const stravaSchema = new mongoose.Schema(
  {
    athleteId: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Number
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: ""
    },
    bio: {
      type: String,
      default: "Ready to climb the podium."
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    streakDays: {
      type: Number,
      default: 0
    },
    strava: stravaSchema
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
