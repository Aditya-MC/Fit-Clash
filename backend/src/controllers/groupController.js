import { Activity } from "../models/Activity.js";
import { Group } from "../models/Group.js";
import { User } from "../models/User.js";
import { demoStore } from "../services/demoStore.js";
import {
  calculateConsistencyBonus,
  calculatePoints,
  getActivitiesInPeriod,
  getConsistencySeries,
  getCumulativeSeries,
  getScoringRules,
  isScoredActivityType,
  validateActivityForScoring
} from "../services/scoreService.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const makeManualActivityId = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const attachSourceLabel = (activity) => ({
  ...activity,
  source: activity.source || "strava",
  sourceLabel:
    activity.source === "in_app" ? "In-app run" : activity.source === "manual" ? "Manual" : "Strava"
});

const getCurrentPeriodSummary = (activities, challengeDuration, scoringRules) => {
  const periodActivities = getActivitiesInPeriod(activities, challengeDuration);
  const { activeDays, consistencyBonus } = calculateConsistencyBonus(activities, challengeDuration, scoringRules);

  return {
    periodActivities,
    activeDays,
    consistencyBonus
  };
};

const buildLeaderboard = (members, activities, challengeDuration, scoringRules) =>
  members
    .map((member) => {
      const memberId = member.user._id?.toString?.() || member.user.toString();
      const playerActivities = activities.filter((activity) => (activity.user._id?.toString?.() || activity.user.toString()) === memberId);
      const basePoints = playerActivities.reduce((sum, activity) => sum + Number(activity.pointsAwarded || 0), 0);
      const { activeDays, consistencyBonus } = getCurrentPeriodSummary(playerActivities, challengeDuration, scoringRules);

      return {
        user: member.user,
        role: member.role,
        points: basePoints + consistencyBonus,
        basePoints,
        consistencyPoints: consistencyBonus,
        activeDays,
        activityCount: playerActivities.length,
        recentForm: getConsistencySeries(playerActivities).slice(-7)
      };
    })
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

const getMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const getMonthlyMetrics = (activities) => {
  const monthStart = getMonthStart();
  const thisMonthActivities = activities.filter((activity) => new Date(activity.startedAt) >= monthStart);

  return {
    monthlyDistanceKm: Number(
      thisMonthActivities
        .filter((activity) => activity.type?.toLowerCase().includes("run"))
        .reduce((sum, activity) => sum + Number(activity.distanceKm || 0), 0)
        .toFixed(1)
    ),
    monthlyWorkoutHours: Number(
      (
        thisMonthActivities.reduce((sum, activity) => sum + Number(activity.movingTimeMinutes || 0), 0) / 60
      ).toFixed(1)
    )
  };
};

const buildGroupResponse = (group, activities) => {
  const scoringRules = getScoringRules(group.scoringRules);
  const leaderboard = buildLeaderboard(group.members, activities, group.challengeDuration, scoringRules);

  return {
    ...group,
    scoringRules,
    leaderboard,
    recentActivities: activities
      .slice()
      .sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt))
      .slice(0, 12)
      .map(attachSourceLabel)
  };
};

export const createGroup = async (req, res) => {
  const { name, description, challengeDuration, visibility } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Group name is required." });
  }

  if (demoStore.isEnabled()) {
    const group = demoStore.createGroup({
      name,
      description,
      challengeDuration,
      visibility,
      ownerId: req.user._id
    });
    return res.status(201).json(group);
  }

  const group = await Group.create({
    name,
    slug: `${slugify(name)}-${Date.now().toString().slice(-5)}`,
    description,
    challengeDuration: challengeDuration || "monthly",
    visibility: visibility || "private",
    inviteCode: makeInviteCode(),
    members: [
      {
        user: req.user._id,
        role: "owner",
        points: 0
      }
    ]
  });

  const populated = await Group.findById(group._id).populate("members.user", "name email avatar totalPoints");
  return res.status(201).json(populated);
};

export const joinGroup = async (req, res) => {
  const { inviteCode } = req.body;

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupByInviteCode(inviteCode);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    return res.json(demoStore.joinGroup(group, req.user._id));
  }

  const group = await Group.findOne({ inviteCode });

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const alreadyMember = group.members.some((member) => member.user.toString() === req.user._id.toString());
  if (!alreadyMember) {
    group.members.push({
      user: req.user._id,
      role: "member",
      points: 0
    });
    await group.save();
  }

  const populated = await Group.findById(group._id).populate("members.user", "name email avatar totalPoints");
  return res.json(populated);
};

export const getMyGroups = async (req, res) => {
  if (demoStore.isEnabled()) {
    return res.json(demoStore.listGroupsForUser(req.user._id));
  }

  const groups = await Group.find({ "members.user": req.user._id })
    .populate("members.user", "name avatar totalPoints streakDays")
    .sort({ createdAt: -1 });

  const groupIds = groups.map((group) => group._id);
  const allActivities = await Activity.find({ group: { $in: groupIds } }).sort({ startedAt: -1 });

  const summaries = groups.map((group) => {
    const groupActivities = allActivities.filter((activity) => activity.group.toString() === group._id.toString());
    const leaderboard = buildLeaderboard(group.members, groupActivities, group.challengeDuration, group.scoringRules);
    const currentUser = leaderboard.find((entry) => entry.user._id.toString() === req.user._id.toString());

    return {
      ...group.toObject(),
      userRank: currentUser?.rank || 0,
      userActivityCount: currentUser?.activityCount || 0,
      userActiveDays: currentUser?.activeDays || 0,
      userConsistencyPoints: currentUser?.consistencyPoints || 0,
      leaderboard
    };
  });

  return res.json(summaries);
};

export const getGroupDetails = async (req, res) => {
  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const populatedGroup = demoStore.populateGroup(group);
    const activities = demoStore
      .listActivitiesForGroup(group._id)
      .map((activity) => ({
        ...activity,
        user: populatedGroup.members.find((member) => member.user._id === activity.user)?.user || null
      }));

    return res.json(buildGroupResponse(populatedGroup, activities));
  }

  const group = await Group.findById(req.params.groupId).populate("members.user", "name avatar bio totalPoints streakDays");

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const memberIds = group.members.map((member) => member.user._id);
  const activities = await Activity.find({ group: group._id, user: { $in: memberIds } }).sort({ startedAt: -1 });

  const hydratedActivities = activities.map((activity) => ({
    ...activity.toObject(),
    user: group.members.find((member) => member.user._id.toString() === activity.user.toString())?.user || null
  }));

  return res.json(buildGroupResponse(group.toObject(), hydratedActivities));
};

export const getPlayerCard = async (req, res) => {
  const { groupId, userId } = req.params;

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const populatedGroup = demoStore.populateGroup(group);
    const member = populatedGroup.members.find((entry) => entry.user._id === userId);
    if (!member) {
      return res.status(404).json({ message: "Player not found in group." });
    }

    const allActivities = demoStore.listActivitiesForGroup(groupId);
    const leaderboard = buildLeaderboard(populatedGroup.members, allActivities, group.challengeDuration, group.scoringRules);
    const playerActivities = demoStore.listActivitiesForPlayer(groupId, userId).sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt));
    const monthlyMetrics = getMonthlyMetrics(playerActivities);
    const playerRankEntry = leaderboard.find((entry) => entry.user._id === userId);
    const nearbyCompetitors = leaderboard
      .filter((entry) => entry.user._id !== userId)
      .slice(Math.max(0, (playerRankEntry?.rank || 1) - 2), (playerRankEntry?.rank || 1) + 1)
      .map((entry) => ({
        user: entry.user,
        points: entry.points
      }));
    const primaryCompetitor = nearbyCompetitors[0] || null;
    const competitorActivities = primaryCompetitor
      ? demoStore.listActivitiesForPlayer(groupId, primaryCompetitor.user._id).sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt))
      : [];

    return res.json({
      player: member.user,
      points: playerRankEntry?.points || 0,
      basePoints: playerRankEntry?.basePoints || 0,
      consistencyPoints: playerRankEntry?.consistencyPoints || 0,
      activeDays: playerRankEntry?.activeDays || 0,
      rank: playerRankEntry?.rank || 0,
      highestEverRank: playerRankEntry?.rank || 0,
      activityCount: playerActivities.length,
      ...monthlyMetrics,
      consistency: getCumulativeSeries(playerActivities, 14),
      competitorTrend: primaryCompetitor
        ? {
            user: primaryCompetitor.user,
            series: getCumulativeSeries(competitorActivities, 14)
          }
        : null,
      nearbyCompetitors
    });
  }

  const group = await Group.findById(groupId).populate("members.user", "name avatar bio totalPoints streakDays");

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const member = group.members.find((entry) => entry.user._id.toString() === userId);
  if (!member) {
    return res.status(404).json({ message: "Player not found in group." });
  }

  const allActivities = await Activity.find({ group: groupId }).sort({ startedAt: 1 });
  const leaderboard = buildLeaderboard(
    group.members,
    allActivities.map((activity) => activity.toObject()),
    group.challengeDuration,
    group.scoringRules
  );
  const playerActivities = allActivities.filter((activity) => activity.user.toString() === userId);
  const monthlyMetrics = getMonthlyMetrics(playerActivities);
  const playerRankEntry = leaderboard.find((entry) => entry.user._id.toString() === userId);
  const nearbyCompetitors = leaderboard
    .filter((entry) => entry.user._id.toString() !== userId)
    .slice(Math.max(0, (playerRankEntry?.rank || 1) - 2), (playerRankEntry?.rank || 1) + 1)
    .map((entry) => ({
      user: entry.user,
      points: entry.points
    }));
  const primaryCompetitor = nearbyCompetitors[0] || null;
  const competitorActivities = primaryCompetitor
    ? allActivities.filter((activity) => activity.user.toString() === primaryCompetitor.user._id.toString())
    : [];

  return res.json({
    player: member.user,
    points: playerRankEntry?.points || 0,
    basePoints: playerRankEntry?.basePoints || 0,
    consistencyPoints: playerRankEntry?.consistencyPoints || 0,
    activeDays: playerRankEntry?.activeDays || 0,
    rank: playerRankEntry?.rank || 0,
    highestEverRank: playerRankEntry?.rank || 0,
    activityCount: playerActivities.length,
    ...monthlyMetrics,
    consistency: getCumulativeSeries(playerActivities, 14),
    competitorTrend: primaryCompetitor
      ? {
          user: primaryCompetitor.user,
          series: getCumulativeSeries(competitorActivities, 14)
        }
      : null,
    nearbyCompetitors
  });
};

export const addManualActivity = async (req, res) => {
  const { groupId } = req.params;
  const { title, type, distanceKm, movingTimeMinutes, elevationGain, startedAt, source = "manual" } = req.body;

  if (!title || !type || !startedAt) {
    return res.status(400).json({ message: "Title, activity type, and date are required." });
  }

  if (!isScoredActivityType(type)) {
    return res.status(400).json({ message: "This activity type is not supported for scoring." });
  }

  if (!["manual", "in_app"].includes(source)) {
    return res.status(400).json({ message: "Unsupported activity source." });
  }

  const activityPayload = {
    id: makeManualActivityId(),
    name: title.trim(),
    type,
    distanceKm: Number(distanceKm || 0),
    movingTimeMinutes: Number(movingTimeMinutes || 0),
    elevationGain: Number(elevationGain || 0),
    startedAt: new Date(startedAt)
  };

  if (Number.isNaN(activityPayload.startedAt.getTime())) {
    return res.status(400).json({ message: "A valid activity date is required." });
  }

  const validationMessage = validateActivityForScoring(activityPayload);
  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(groupId);

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const isMember = group.members.some((member) => member.user === req.user._id);
    if (!isMember) {
      return res.status(403).json({ message: "Join the group before adding activities." });
    }

    const points = calculatePoints(activityPayload, group.scoringRules);
    demoStore.addActivityIfNew({
      userId: req.user._id,
      groupId,
      activity: activityPayload,
      points,
      source
    });

    return res.status(201).json({
      message: source === "in_app" ? "In-app run saved successfully." : "Manual activity added successfully.",
      pointsAwarded: points
    });
  }

  const group = await Group.findById(groupId);

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const member = group.members.find((entry) => entry.user.toString() === req.user._id.toString());
  if (!member) {
    return res.status(403).json({ message: "Join the group before adding activities." });
  }

  const points = calculatePoints(activityPayload, group.scoringRules);

  await Activity.create({
    user: req.user._id,
    group: group._id,
    stravaActivityId: activityPayload.id,
    source,
    type: activityPayload.type,
    title: activityPayload.name,
    distanceKm: activityPayload.distanceKm,
    movingTimeMinutes: activityPayload.movingTimeMinutes,
    elevationGain: activityPayload.elevationGain,
    pointsAwarded: points,
    startedAt: activityPayload.startedAt
  });

  member.points += points;
  await group.save();
  await User.findByIdAndUpdate(req.user._id, { $set: { totalPoints: member.points } });

  return res.status(201).json({
    message: source === "in_app" ? "In-app run saved successfully." : "Manual activity added successfully.",
    pointsAwarded: points
  });
};

export const updateActivity = async (req, res) => {
  const { groupId, activityId } = req.params;
  const { title, type, distanceKm, movingTimeMinutes, elevationGain, startedAt } = req.body;

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const existing = demoStore
      .listActivitiesForPlayer(groupId, req.user._id)
      .find((activity) => activity._id === activityId);

    if (!existing) {
      return res.status(404).json({ message: "Activity not found." });
    }

    if (existing.source === "strava") {
      return res.status(400).json({ message: "Strava activities cannot be edited manually." });
    }

    const nextActivity = {
      ...existing,
      name: title?.trim?.() || existing.title,
      title: title?.trim?.() || existing.title,
      type: type || existing.type,
      distanceKm: distanceKm === undefined ? Number(existing.distanceKm || 0) : Number(distanceKm || 0),
      movingTimeMinutes:
        movingTimeMinutes === undefined ? Number(existing.movingTimeMinutes || 0) : Number(movingTimeMinutes || 0),
      elevationGain: elevationGain === undefined ? Number(existing.elevationGain || 0) : Number(elevationGain || 0),
      startedAt: startedAt ? new Date(startedAt) : new Date(existing.startedAt)
    };

    const validationMessage = validateActivityForScoring(nextActivity);
    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const points = calculatePoints(nextActivity, group.scoringRules);
    demoStore.updateActivity({
      groupId,
      activityId,
      userId: req.user._id,
      updates: {
        title: nextActivity.title,
        type: nextActivity.type,
        distanceKm: nextActivity.distanceKm,
        movingTimeMinutes: nextActivity.movingTimeMinutes,
        elevationGain: nextActivity.elevationGain,
        startedAt: nextActivity.startedAt.toISOString()
      },
      points
    });

    return res.json({
      message: "Activity updated successfully.",
      pointsAwarded: points
    });
  }

  const group = await Group.findById(groupId);
  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const activity = await Activity.findOne({ _id: activityId, group: groupId, user: req.user._id });
  if (!activity) {
    return res.status(404).json({ message: "Activity not found." });
  }

  if (activity.source === "strava") {
    return res.status(400).json({ message: "Strava activities cannot be edited manually." });
  }

  const nextActivity = {
    ...activity.toObject(),
    name: title?.trim?.() || activity.title,
    type: type || activity.type,
    distanceKm: distanceKm === undefined ? Number(activity.distanceKm || 0) : Number(distanceKm || 0),
    movingTimeMinutes:
      movingTimeMinutes === undefined ? Number(activity.movingTimeMinutes || 0) : Number(movingTimeMinutes || 0),
    elevationGain: elevationGain === undefined ? Number(activity.elevationGain || 0) : Number(elevationGain || 0),
    startedAt: startedAt ? new Date(startedAt) : new Date(activity.startedAt)
  };

  const validationMessage = validateActivityForScoring(nextActivity);
  if (validationMessage) {
    return res.status(400).json({ message: validationMessage });
  }

  activity.title = nextActivity.name;
  activity.type = nextActivity.type;
  activity.distanceKm = nextActivity.distanceKm;
  activity.movingTimeMinutes = nextActivity.movingTimeMinutes;
  activity.elevationGain = nextActivity.elevationGain;
  activity.startedAt = nextActivity.startedAt;
  activity.pointsAwarded = calculatePoints(nextActivity, group.scoringRules);
  await activity.save();

  return res.json({
    message: "Activity updated successfully.",
    pointsAwarded: activity.pointsAwarded
  });
};

export const deleteActivity = async (req, res) => {
  const { groupId, activityId } = req.params;

  if (demoStore.isEnabled()) {
    const deleted = demoStore.deleteActivity({ groupId, activityId, userId: req.user._id });
    if (!deleted) {
      return res.status(404).json({ message: "Activity not found." });
    }

    return res.json({ message: "Activity deleted successfully." });
  }

  const deleted = await Activity.findOneAndDelete({ _id: activityId, group: groupId, user: req.user._id });
  if (!deleted) {
    return res.status(404).json({ message: "Activity not found." });
  }

  return res.json({ message: "Activity deleted successfully." });
};
