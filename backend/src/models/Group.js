import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    role: {
      type: String,
      enum: ["owner", "member"],
      default: "member"
    },
    points: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    description: {
      type: String,
      default: ""
    },
    challengeDuration: {
      type: String,
      enum: ["weekly", "monthly"],
      default: "monthly"
    },
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private"
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true
    },
    scoringRules: {
      runPerKm: {
        type: Number,
        default: 12
      },
      ridePerKm: {
        type: Number,
        default: 5
      },
      swimPerKm: {
        type: Number,
        default: 20
      },
      walkPerKm: {
        type: Number,
        default: 4
      },
      hikePerKm: {
        type: Number,
        default: 6
      },
      workoutPerMinute: {
        type: Number,
        default: 1 / 6
      },
      consistencyWeekly: {
        type: Object,
        default: {
          3: 15,
          5: 35,
          7: 60
        }
      },
      consistencyMonthly: {
        type: Object,
        default: {
          8: 30,
          12: 60,
          16: 100,
          20: 150
        }
      }
    },
    members: [memberSchema]
  },
  { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);
