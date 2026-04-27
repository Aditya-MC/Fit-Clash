import { Activity } from "../models/Activity.js";
import { Group } from "../models/Group.js";
import { User } from "../models/User.js";
import { demoStore } from "../services/demoStore.js";
import { calculatePoints } from "../services/scoreService.js";
import { exchangeCodeForToken, fetchRecentActivities, getStravaAuthUrl } from "../services/stravaService.js";

export const getConnectUrl = async (_req, res) => {
  return res.json({ url: getStravaAuthUrl() });
};

export const connectStrava = async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Authorization code is required." });
  }

  const tokens = await exchangeCodeForToken(code);

  if (demoStore.isEnabled()) {
    demoStore.markStravaConnected(req.user._id, tokens);
    return res.json({
      message: "Strava connected.",
      stravaConnected: true
    });
  }

  await User.findByIdAndUpdate(req.user._id, {
    $set: {
      strava: tokens
    }
  });

  return res.json({
    message: "Strava connected.",
    stravaConnected: true
  });
};

export const syncActivities = async (req, res) => {
  const { groupId } = req.body;

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const isMember = group.members.some((member) => member.user === req.user._id);
    if (!isMember) {
      return res.status(403).json({ message: "Join the group before syncing activities." });
    }

    const { activities: recentActivities } = await fetchRecentActivities(req.user);
    let added = 0;

    for (const activity of recentActivities) {
      const points = calculatePoints(activity, group.scoringRules);
      const created = demoStore.addActivityIfNew({
        userId: req.user._id,
        groupId,
        activity,
        points
      });
      if (created) {
        added += 1;
      }
    }

    return res.json({
      message: added ? "Activities synced successfully." : "No new Strava activities found.",
      syncedActivities: added
    });
  }

  const group = await Group.findById(groupId);

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const isMember = group.members.some((member) => member.user.toString() === req.user._id.toString());
  if (!isMember) {
    return res.status(403).json({ message: "Join the group before syncing activities." });
  }

  const { activities: recentActivities, tokens } = await fetchRecentActivities(req.user);
  let added = 0;

  for (const activity of recentActivities) {
    const points = calculatePoints(activity, group.scoringRules);

    try {
      await Activity.create({
        user: req.user._id,
        group: group._id,
        stravaActivityId: activity.id,
        type: activity.type,
        title: activity.name,
        distanceKm: activity.distanceKm,
        movingTimeMinutes: activity.movingTimeMinutes,
        elevationGain: activity.elevationGain,
        pointsAwarded: points,
        startedAt: activity.startedAt
      });

      const member = group.members.find((entry) => entry.user.toString() === req.user._id.toString());
      member.points += points;
      added += 1;
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  await group.save();

  const totalPoints = group.members.find((entry) => entry.user.toString() === req.user._id.toString())?.points || 0;
  const updatePayload = {
    totalPoints
  };

  if (tokens) {
    updatePayload.strava = tokens;
  }

  await User.findByIdAndUpdate(req.user._id, { $set: updatePayload });

  return res.json({
    message: added ? "Activities synced successfully." : "No new Strava activities found.",
    syncedActivities: added
  });
};
