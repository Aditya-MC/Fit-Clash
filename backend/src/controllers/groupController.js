import { Activity } from "../models/Activity.js";
import { Group } from "../models/Group.js";
import { User } from "../models/User.js";
import { demoStore } from "../services/demoStore.js";
import { calculatePoints, isScoredActivityType } from "../services/scoreService.js";
import { getConsistencySeries, getCumulativeSeries } from "../services/scoreService.js";

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const makeManualActivityId = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const getMonthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
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
  const activities = await Activity.find({ group: { $in: groupIds }, user: req.user._id }).select("group");

  const activityCountByGroup = activities.reduce((accumulator, activity) => {
    const key = activity.group.toString();
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  const summaries = groups.map((group) => {
    const leaderboard = [...group.members].sort((left, right) => right.points - left.points);
    const userRank = leaderboard.findIndex((entry) => entry.user._id.toString() === req.user._id.toString()) + 1;

    return {
      ...group.toObject(),
      userRank,
      userActivityCount: activityCountByGroup.get(group._id.toString()) || 0
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
    const activities = demoStore.listActivitiesForGroup(group._id);
    const leaderboard = populatedGroup.members
      .map((member) => {
        const playerActivities = activities.filter((activity) => activity.user === member.user._id);
        return {
          user: member.user,
          role: member.role,
          points: member.points,
          activityCount: playerActivities.length,
          recentForm: getConsistencySeries(playerActivities).slice(-7)
        };
      })
      .sort((left, right) => right.points - left.points)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return res.json({
      ...populatedGroup,
      leaderboard,
      recentActivities: activities
        .slice()
        .sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt))
        .slice(0, 12)
        .map((activity) => ({
          ...activity,
          user: populatedGroup.members.find((member) => member.user._id === activity.user)?.user || null
        }))
    });
  }

  const group = await Group.findById(req.params.groupId).populate("members.user", "name avatar bio totalPoints streakDays");

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const memberIds = group.members.map((member) => member.user._id);
  const activities = await Activity.find({ group: group._id, user: { $in: memberIds } }).sort({ startedAt: -1 });

  const leaderboard = group.members
    .map((member) => {
      const playerActivities = activities.filter((activity) => activity.user.toString() === member.user._id.toString());
      return {
        user: member.user,
        role: member.role,
        points: member.points,
        activityCount: playerActivities.length,
        recentForm: getConsistencySeries(playerActivities).slice(-7)
      };
    })
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

  return res.json({
    ...group.toObject(),
    leaderboard,
    recentActivities: activities.slice(0, 12).map((activity) => ({
      ...activity.toObject(),
      user: group.members.find((member) => member.user._id.toString() === activity.user.toString())?.user || null
    }))
  });
};

export const getPlayerCard = async (req, res) => {
  const { groupId, userId } = req.params;

  if (demoStore.isEnabled()) {
    const group = demoStore.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const member = group.members.find((entry) => entry.user === userId);
    if (!member) {
      return res.status(404).json({ message: "Player not found in group." });
    }

    const activities = demoStore.listActivitiesForPlayer(groupId, userId).sort((left, right) =>
      new Date(left.startedAt) - new Date(right.startedAt)
    );
    const monthStart = getMonthStart();
    const thisMonthActivities = activities.filter((activity) => new Date(activity.startedAt) >= monthStart);
    const monthlyDistanceKm = thisMonthActivities
      .filter((activity) => activity.type?.toLowerCase().includes("run"))
      .reduce((sum, activity) => sum + Number(activity.distanceKm || 0), 0);
    const monthlyWorkoutHours =
      thisMonthActivities.reduce((sum, activity) => sum + Number(activity.movingTimeMinutes || 0), 0) / 60;
    const leaderboard = [...group.members].sort((left, right) => right.points - left.points);
    const playerRank = leaderboard.findIndex((entry) => entry.user === userId) + 1;
    const nearbyCompetitors = leaderboard
      .slice(Math.max(0, playerRank - 2), playerRank + 1)
      .filter((entry) => entry.user !== userId)
      .map((entry) => ({
        user: demoStore.safeUser(demoStore.getUserById(entry.user)),
        points: entry.points
      }));
    const primaryCompetitor = nearbyCompetitors[0] || null;
    const competitorActivities = primaryCompetitor
      ? demoStore.listActivitiesForPlayer(groupId, primaryCompetitor.user._id).sort((left, right) =>
          new Date(left.startedAt) - new Date(right.startedAt)
        )
      : [];

    return res.json({
      player: demoStore.safeUser(demoStore.getUserById(userId)),
      points: member.points,
      rank: playerRank,
      highestEverRank: playerRank,
      activityCount: activities.length,
      monthlyDistanceKm: Number(monthlyDistanceKm.toFixed(1)),
      monthlyWorkoutHours: Number(monthlyWorkoutHours.toFixed(1)),
      consistency: getCumulativeSeries(activities, 14),
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

  const activities = await Activity.find({ group: groupId, user: userId }).sort({ startedAt: 1 });
  const monthStart = getMonthStart();
  const thisMonthActivities = activities.filter((activity) => new Date(activity.startedAt) >= monthStart);
  const monthlyDistanceKm = thisMonthActivities
    .filter((activity) => activity.type?.toLowerCase().includes("run"))
    .reduce((sum, activity) => sum + Number(activity.distanceKm || 0), 0);
  const monthlyWorkoutHours =
    thisMonthActivities.reduce((sum, activity) => sum + Number(activity.movingTimeMinutes || 0), 0) / 60;
  const leaderboard = [...group.members].sort((left, right) => right.points - left.points);
  const playerRank = leaderboard.findIndex((entry) => entry.user._id.toString() === userId) + 1;
  const nearbyCompetitors = await Promise.all(
    leaderboard
      .slice(Math.max(0, playerRank - 2), playerRank + 1)
      .filter((entry) => entry.user._id.toString() !== userId)
      .map(async (entry) => {
        const profile = await User.findById(entry.user._id).select("name avatar");
        return {
          user: profile,
          points: entry.points
        };
      })
  );
  const primaryCompetitor = nearbyCompetitors[0] || null;
  const competitorActivities = primaryCompetitor
    ? await Activity.find({ group: groupId, user: primaryCompetitor.user._id }).sort({ startedAt: 1 })
    : [];

  return res.json({
    player: member.user,
    points: member.points,
    rank: playerRank,
    highestEverRank: playerRank,
    activityCount: activities.length,
    monthlyDistanceKm: Number(monthlyDistanceKm.toFixed(1)),
    monthlyWorkoutHours: Number(monthlyWorkoutHours.toFixed(1)),
    consistency: getCumulativeSeries(activities, 14),
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
  const { title, type, distanceKm, movingTimeMinutes, elevationGain, startedAt } = req.body;

  if (!title || !type || !startedAt) {
    return res.status(400).json({ message: "Title, activity type, and date are required." });
  }

  if (!isScoredActivityType(type)) {
    return res.status(400).json({ message: "This activity type is not supported for scoring." });
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
      source: "manual"
    });

    return res.status(201).json({
      message: "Manual activity added successfully.",
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
    source: "manual",
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
    message: "Manual activity added successfully.",
    pointsAwarded: points
  });
};
