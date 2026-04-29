import bcrypt from "bcryptjs";

const now = new Date();

const demoState = {
  users: [],
  groups: [],
  activities: []
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar || "",
  bio: user.bio || "Ready to climb the podium.",
  totalPoints: user.totalPoints || 0,
  streakDays: user.streakDays || 0,
  stravaConnected: Boolean(user.strava?.athleteId)
});

const seedDemoData = async () => {
  if (demoState.users.length) {
    return;
  }

  const password = await bcrypt.hash("demo123", 10);
  const users = [
    {
      _id: "demo-user-1",
      name: "Aarav",
      email: "aarav@fitclash.demo",
      password,
      avatar: "",
      bio: "Always chasing the next podium finish.",
      totalPoints: 164,
      streakDays: 6,
      strava: { athleteId: "athlete-1" }
    },
    {
      _id: "demo-user-2",
      name: "Riya",
      email: "riya@fitclash.demo",
      password,
      avatar: "",
      bio: "Consistency over intensity.",
      totalPoints: 142,
      streakDays: 4,
      strava: { athleteId: "athlete-2" }
    },
    {
      _id: "demo-user-3",
      name: "Kabir",
      email: "kabir@fitclash.demo",
      password,
      avatar: "",
      bio: "Weekend rides and surprise comebacks.",
      totalPoints: 126,
      streakDays: 5,
      strava: { athleteId: "athlete-3" }
    }
  ];

  const group = {
    _id: "demo-group-1",
    name: "Sunrise Striders",
    slug: "sunrise-striders-demo",
    description: "A demo league for previewing the app without MongoDB.",
    challengeDuration: "monthly",
    visibility: "private",
    inviteCode: "DEMO24",
    scoringRules: {
      runPerKm: 12,
      ridePerKm: 5,
      swimPerKm: 20,
      workoutFlat: 15
    },
    members: [
      { user: "demo-user-1", role: "owner", points: 164, joinedAt: now.toISOString() },
      { user: "demo-user-2", role: "member", points: 142, joinedAt: now.toISOString() },
      { user: "demo-user-3", role: "member", points: 126, joinedAt: now.toISOString() }
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  const activities = [
    {
      _id: "demo-activity-1",
      user: "demo-user-1",
      group: "demo-group-1",
      stravaActivityId: "run-1",
      type: "Run",
      title: "Morning Tempo Run",
      distanceKm: 8.4,
      movingTimeMinutes: 46,
      elevationGain: 72,
      pointsAwarded: 101,
      startedAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    },
    {
      _id: "demo-activity-2",
      user: "demo-user-1",
      group: "demo-group-1",
      stravaActivityId: "ride-1",
      type: "Ride",
      title: "Sunday Ride",
      distanceKm: 12.6,
      movingTimeMinutes: 41,
      elevationGain: 110,
      pointsAwarded: 63,
      startedAt: new Date(now.getTime() - 86400000).toISOString()
    },
    {
      _id: "demo-activity-3",
      user: "demo-user-2",
      group: "demo-group-1",
      stravaActivityId: "run-2",
      type: "Run",
      title: "Steady Evening Run",
      distanceKm: 7.1,
      movingTimeMinutes: 39,
      elevationGain: 40,
      pointsAwarded: 85,
      startedAt: new Date(now.getTime() - 86400000 * 3).toISOString()
    },
    {
      _id: "demo-activity-4",
      user: "demo-user-2",
      group: "demo-group-1",
      stravaActivityId: "workout-1",
      type: "Workout",
      title: "Strength Session",
      distanceKm: 0,
      movingTimeMinutes: 50,
      elevationGain: 0,
      pointsAwarded: 15,
      startedAt: new Date(now.getTime() - 86400000).toISOString()
    },
    {
      _id: "demo-activity-5",
      user: "demo-user-3",
      group: "demo-group-1",
      stravaActivityId: "ride-2",
      type: "Ride",
      title: "Hill Loop",
      distanceKm: 25.2,
      movingTimeMinutes: 73,
      elevationGain: 220,
      pointsAwarded: 126,
      startedAt: new Date(now.getTime() - 86400000 * 2).toISOString()
    }
  ];

  demoState.users = users;
  demoState.groups = [group];
  demoState.activities = activities;
};

await seedDemoData();

export const demoStore = {
  isEnabled: () => process.env.DEMO_MODE === "true",
  safeUser,
  getUserById: (id) => demoState.users.find((user) => user._id === id) || null,
  getUserByEmail: (email) => demoState.users.find((user) => user.email === email) || null,
  createUser: async ({ name, email, password }) => {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: `demo-user-${Date.now()}`,
      name,
      email,
      password: hashedPassword,
      avatar: "",
      bio: "Ready to climb the podium.",
      totalPoints: 0,
      streakDays: 0,
      strava: null
    };
    demoState.users.unshift(user);
    return clone(user);
  },
  listGroupsForUser: (userId) =>
    demoState.groups
      .filter((group) => group.members.some((member) => member.user === userId))
      .map((group) => demoStore.getGroupSummary(group, userId)),
  populateGroup: (group) => ({
    ...clone(group),
    members: group.members.map((member) => ({
      ...member,
      user: safeUser(demoStore.getUserById(member.user))
    }))
  }),
  getGroupSummary: (group, userId) => {
    const populated = demoStore.populateGroup(group);
    const leaderboard = [...group.members].sort((left, right) => right.points - left.points);
    const userRank = leaderboard.findIndex((entry) => entry.user === userId) + 1;
    const userActivityCount = demoState.activities.filter((activity) => activity.group === group._id && activity.user === userId).length;

    return {
      ...populated,
      userRank,
      userActivityCount
    };
  },
  getGroupById: (groupId) => demoState.groups.find((group) => group._id === groupId) || null,
  getGroupByInviteCode: (inviteCode) => demoState.groups.find((group) => group.inviteCode === inviteCode) || null,
  createGroup: ({ name, description, challengeDuration, visibility, ownerId }) => {
    const group = {
      _id: `demo-group-${Date.now()}`,
      name,
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString().slice(-5)}`,
      description: description || "",
      challengeDuration: challengeDuration || "monthly",
      visibility: visibility || "private",
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      scoringRules: {
        runPerKm: 12,
        ridePerKm: 5,
        swimPerKm: 20,
        workoutFlat: 15
      },
      members: [{ user: ownerId, role: "owner", points: 0, joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    demoState.groups.unshift(group);
    return demoStore.populateGroup(group);
  },
  joinGroup: (group, userId) => {
    const existing = group.members.some((member) => member.user === userId);
    if (!existing) {
      group.members.push({ user: userId, role: "member", points: 0, joinedAt: new Date().toISOString() });
      group.updatedAt = new Date().toISOString();
    }
    return demoStore.populateGroup(group);
  },
  listActivitiesForGroup: (groupId) => demoState.activities.filter((activity) => activity.group === groupId).map(clone),
  listActivitiesForPlayer: (groupId, userId) =>
    demoState.activities.filter((activity) => activity.group === groupId && activity.user === userId).map(clone),
  markStravaConnected: (userId, strava) => {
    const user = demoStore.getUserById(userId);
    if (user) {
      user.strava = strava;
    }
  },
  addActivityIfNew: ({ userId, groupId, activity, points, source = "strava" }) => {
    const duplicate = demoState.activities.find(
      (entry) => entry.group === groupId && entry.user === userId && entry.stravaActivityId === activity.id
    );
    if (duplicate) {
      return false;
    }

    demoState.activities.push({
      _id: `demo-activity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user: userId,
      group: groupId,
      stravaActivityId: activity.id,
      source,
      type: activity.type,
      title: activity.name,
      distanceKm: activity.distanceKm,
      movingTimeMinutes: activity.movingTimeMinutes,
      elevationGain: activity.elevationGain,
      pointsAwarded: points,
      startedAt: new Date(activity.startedAt).toISOString()
    });

    const group = demoStore.getGroupById(groupId);
    const member = group?.members.find((entry) => entry.user === userId);
    const user = demoStore.getUserById(userId);

    if (member) {
      member.points += points;
    }
    if (user) {
      user.totalPoints = member?.points || user.totalPoints;
      user.strava = user.strava || { athleteId: `demo-athlete-${userId}` };
    }

    return true;
  }
};
