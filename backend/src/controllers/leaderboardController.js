import { Group } from "../models/Group.js";

export const getLeaderboard = async (req, res) => {
  const group = await Group.findById(req.params.groupId).populate("members.user", "name avatar streakDays");

  if (!group) {
    return res.status(404).json({ message: "Group not found." });
  }

  const leaderboard = group.members
    .map((member) => ({
      user: member.user,
      role: member.role,
      points: member.points
    }))
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

  return res.json({
    group: {
      _id: group._id,
      name: group.name,
      inviteCode: group.inviteCode
    },
    leaderboard
  });
};
