import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true
    },
    stravaActivityId: {
      type: String,
      required: true
    },
    source: {
      type: String,
      enum: ["strava", "manual"],
      default: "strava"
    },
    type: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    distanceKm: {
      type: Number,
      default: 0
    },
    movingTimeMinutes: {
      type: Number,
      default: 0
    },
    elevationGain: {
      type: Number,
      default: 0
    },
    pointsAwarded: {
      type: Number,
      default: 0
    },
    startedAt: {
      type: Date,
      required: true
    }
  },
  { timestamps: true }
);

activitySchema.index({ user: 1, group: 1, stravaActivityId: 1 }, { unique: true });

export const Activity = mongoose.model("Activity", activitySchema);
