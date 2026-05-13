const DEMO_TOKEN = "fitclash-demo-token";
const now = () => new Date();
const daysAgo = (days) => new Date(now().getTime() - 86400000 * days).toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const demoUser = {
  _id: "demo-user-1",
  name: "Aarav",
  email: "aarav@fitclash.demo",
  avatar: "",
  bio: "Always chasing the next podium finish.",
  totalPoints: 246,
  streakDays: 6,
  stravaConnected: true,
  demo: true
};

const users = [
  demoUser,
  {
    _id: "demo-user-2",
    name: "Riya",
    email: "riya@fitclash.demo",
    avatar: "",
    bio: "Consistency over intensity.",
    totalPoints: 213,
    streakDays: 4,
    stravaConnected: true
  },
  {
    _id: "demo-user-3",
    name: "Kabir",
    email: "kabir@fitclash.demo",
    avatar: "",
    bio: "Weekend rides and surprise comebacks.",
    totalPoints: 126,
    streakDays: 5,
    stravaConnected: true
  },
  {
    _id: "demo-user-4",
    name: "Meera",
    email: "meera@fitclash.demo",
    avatar: "",
    bio: "Fast walks, long hikes, steady points.",
    totalPoints: 98,
    streakDays: 3,
    stravaConnected: true
  }
];

const defaultRules = {
  runPerKm: 12,
  ridePerKm: 5,
  swimPerKm: 20,
  walkPerKm: 4,
  hikePerKm: 6,
  workoutPerMinute: 1 / 6
};

const initialGroups = [
  {
    _id: "demo-group-1",
    name: "Sunrise Striders",
    description: "A demo league for previewing the app without a real account.",
    challengeDuration: "monthly",
    visibility: "private",
    inviteCode: "DEMO24",
    scoringRules: defaultRules,
    members: [
      { user: users[0], role: "owner" },
      { user: users[1], role: "member" },
      { user: users[2], role: "member" }
    ]
  },
  {
    _id: "demo-group-2",
    name: "Weekend Warriors",
    description: "A lighter weekly challenge with runs, walks, hikes, and gym sessions.",
    challengeDuration: "weekly",
    visibility: "public",
    inviteCode: "WEEKLY",
    scoringRules: defaultRules,
    members: [
      { user: users[0], role: "owner" },
      { user: users[1], role: "member" },
      { user: users[3], role: "member" }
    ]
  }
];

const initialActivities = [
  ["demo-activity-1", "demo-user-1", "demo-group-1", "strava", "Run", "Morning Tempo Run", 8.4, 46, 72, daysAgo(2)],
  ["demo-activity-2", "demo-user-1", "demo-group-1", "strava", "Ride", "Sunday Ride", 12.6, 41, 110, daysAgo(1)],
  ["demo-activity-3", "demo-user-2", "demo-group-1", "strava", "Run", "Steady Evening Run", 7.1, 39, 40, daysAgo(3)],
  ["demo-activity-4", "demo-user-2", "demo-group-1", "strava", "Workout", "Strength Session", 0, 50, 0, daysAgo(1)],
  ["demo-activity-5", "demo-user-3", "demo-group-1", "strava", "Ride", "Hill Loop", 25.2, 73, 220, daysAgo(2)],
  ["demo-activity-6", "demo-user-1", "demo-group-2", "manual", "Walk", "Lunch Walk", 5.2, 54, 18, daysAgo(4)],
  ["demo-activity-7", "demo-user-1", "demo-group-2", "in_app", "Run", "Demo Park Run", 5.1, 29, 24, daysAgo(2)],
  ["demo-activity-8", "demo-user-2", "demo-group-2", "strava", "Weight Training", "Upper Body Circuit", 0, 45, 0, daysAgo(3)],
  ["demo-activity-9", "demo-user-2", "demo-group-2", "strava", "Ride", "Coffee Spin", 12.6, 38, 64, daysAgo(1)],
  ["demo-activity-10", "demo-user-4", "demo-group-2", "strava", "Hike", "Hill Trail Hike", 10.4, 122, 320, daysAgo(2)],
  ["demo-activity-11", "demo-user-4", "demo-group-2", "manual", "Walk", "Evening Recovery Walk", 9, 95, 30, daysAgo(1)]
].map((activity) => ({
  _id: activity[0],
  user: activity[1],
  group: activity[2],
  source: activity[3],
  sourceLabel: activity[3] === "in_app" ? "In-app run" : activity[3] === "manual" ? "Manual" : "Strava",
  type: activity[4],
  title: activity[5],
  distanceKm: activity[6],
  movingTimeMinutes: activity[7],
  elevationGain: activity[8],
  pointsAwarded: calculatePoints({ type: activity[4], distanceKm: activity[6], movingTimeMinutes: activity[7] }),
  startedAt: activity[9],
  createdAt: activity[9]
}));

const getState = () => {
  const stored = localStorage.getItem("fitclash-demo-state");
  if (stored) {
    return JSON.parse(stored);
  }

  const state = { groups: initialGroups, activities: initialActivities };
  localStorage.setItem("fitclash-demo-state", JSON.stringify(state));
  return state;
};

const saveState = (state) => localStorage.setItem("fitclash-demo-state", JSON.stringify(state));
const getUser = (id) => users.find((user) => user._id === id);
export const isDemoRequest = (path) => path === "/auth/demo" || localStorage.getItem("fitclash-token") === DEMO_TOKEN;

function calculatePoints(activity) {
  const type = (activity.type || "").toLowerCase();
  if (type.includes("run")) return Math.round(Number(activity.distanceKm || 0) * defaultRules.runPerKm);
  if (type.includes("ride") || type.includes("cycle")) return Math.round(Number(activity.distanceKm || 0) * defaultRules.ridePerKm);
  if (type.includes("swim")) return Math.round(Number(activity.distanceKm || 0) * defaultRules.swimPerKm);
  if (type.includes("walk")) return Math.round(Number(activity.distanceKm || 0) * defaultRules.walkPerKm);
  if (type.includes("hike")) return Math.round(Number(activity.distanceKm || 0) * defaultRules.hikePerKm);
  return Math.round(Number(activity.movingTimeMinutes || 0) * defaultRules.workoutPerMinute);
}

const getLeaderboard = (group, activities) =>
  group.members
    .map((member) => {
      const playerActivities = activities.filter((activity) => activity.user === member.user._id);
      const points = playerActivities.reduce((sum, activity) => sum + Number(activity.pointsAwarded || 0), 0);
      const activeDays = new Set(playerActivities.map((activity) => new Date(activity.startedAt).toISOString().slice(0, 10))).size;
      return { user: member.user, role: member.role, points, basePoints: points, consistencyPoints: 0, activeDays, activityCount: playerActivities.length };
    })
    .sort((left, right) => right.points - left.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

const hydrateActivity = (activity) => ({ ...activity, user: getUser(activity.user) });

const getGroupDetails = (groupId) => {
  const state = getState();
  const group = state.groups.find((entry) => entry._id === groupId);
  if (!group) throw new Error("Group not found.");
  const activities = state.activities.filter((activity) => activity.group === groupId);
  return {
    ...clone(group),
    leaderboard: getLeaderboard(group, activities),
    recentActivities: activities.map(hydrateActivity).sort((left, right) => new Date(right.startedAt) - new Date(left.startedAt)).slice(0, 12)
  };
};

const getCumulativeSeries = (activities) => {
  let runningTotal = 0;
  return [...activities]
    .sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt))
    .map((activity) => {
      runningTotal += Number(activity.pointsAwarded || 0);
      return { date: new Date(activity.startedAt).toISOString().slice(0, 10), points: runningTotal };
    });
};

const getPlayerCard = (groupId, userId) => {
  const group = getGroupDetails(groupId);
  const playerEntry = group.leaderboard.find((entry) => entry.user._id === userId);
  const playerActivities = getState().activities.filter((activity) => activity.group === groupId && activity.user === userId);
  const nearbyCompetitors = group.leaderboard.filter((entry) => entry.user._id !== userId).slice(0, 2);
  const competitor = nearbyCompetitors[0];
  const competitorActivities = competitor ? getState().activities.filter((activity) => activity.group === groupId && activity.user === competitor.user._id) : [];

  return {
    player: playerEntry.user,
    points: playerEntry.points,
    basePoints: playerEntry.basePoints,
    consistencyPoints: playerEntry.consistencyPoints,
    activeDays: playerEntry.activeDays,
    rank: playerEntry.rank,
    highestEverRank: playerEntry.rank,
    activityCount: playerActivities.length,
    monthlyDistanceKm: Number(playerActivities.filter((activity) => activity.type === "Run").reduce((sum, activity) => sum + activity.distanceKm, 0).toFixed(1)),
    monthlyWorkoutHours: Number((playerActivities.reduce((sum, activity) => sum + activity.movingTimeMinutes, 0) / 60).toFixed(1)),
    consistency: getCumulativeSeries(playerActivities),
    competitorTrend: competitor ? { user: competitor.user, series: getCumulativeSeries(competitorActivities) } : null,
    nearbyCompetitors
  };
};

export const demoRequest = async (path, options = {}) => {
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};
  const state = getState();

  if (path === "/auth/demo" && method === "POST") return { token: DEMO_TOKEN, user: demoUser };
  if (path === "/auth/me") return demoUser;
  if (path === "/strava/connect-url") return { demo: true, message: "Demo mode already includes sample Strava-connected athletes." };
  if (path === "/strava/sync" && method === "POST") return { message: "Demo activities are already loaded for this group.", syncedActivities: 0, ignoredActivities: 0 };

  if (path === "/groups" && method === "GET") {
    return state.groups.map((group) => {
      const leaderboard = getLeaderboard(group, state.activities.filter((activity) => activity.group === group._id));
      const currentUser = leaderboard.find((entry) => entry.user._id === demoUser._id);
      return { ...clone(group), leaderboard, userRank: currentUser?.rank || 0, userActivityCount: currentUser?.activityCount || 0 };
    });
  }

  if (path === "/groups" && method === "POST") {
    const group = { _id: `demo-group-${Date.now()}`, ...body, inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(), scoringRules: defaultRules, members: [{ user: demoUser, role: "owner" }] };
    state.groups.unshift(group);
    saveState(state);
    return group;
  }

  if (path === "/groups/join" && method === "POST") {
    const group = state.groups.find((entry) => entry.inviteCode === body.inviteCode);
    if (!group) throw new Error("Group not found.");
    if (!group.members.some((member) => member.user._id === demoUser._id)) group.members.push({ user: demoUser, role: "member" });
    saveState(state);
    return group;
  }

  const manualMatch = path.match(/^\/groups\/([^/]+)\/activities\/manual$/);
  if (manualMatch && method === "POST") {
    const pointsAwarded = calculatePoints(body);
    state.activities.unshift({ _id: `demo-activity-${Date.now()}`, user: demoUser._id, group: manualMatch[1], source: body.source || "manual", sourceLabel: body.source === "in_app" ? "In-app run" : "Manual", ...body, pointsAwarded, startedAt: new Date(body.startedAt).toISOString(), createdAt: new Date().toISOString() });
    saveState(state);
    return { message: body.source === "in_app" ? "In-app run saved successfully." : "Manual activity added successfully.", pointsAwarded };
  }

  const activityMatch = path.match(/^\/groups\/([^/]+)\/activities\/([^/]+)$/);
  if (activityMatch && (method === "PATCH" || method === "DELETE")) {
    const index = state.activities.findIndex((activity) => activity.group === activityMatch[1] && activity._id === activityMatch[2] && activity.user === demoUser._id);
    if (index === -1) throw new Error("Activity not found.");
    if (method === "DELETE") state.activities.splice(index, 1);
    if (method === "PATCH") state.activities[index] = { ...state.activities[index], ...body, pointsAwarded: calculatePoints(body) };
    saveState(state);
    return { message: method === "DELETE" ? "Activity deleted successfully." : "Activity updated successfully." };
  }

  const playerMatch = path.match(/^\/groups\/([^/]+)\/players\/([^/]+)$/);
  if (playerMatch) return getPlayerCard(playerMatch[1], playerMatch[2]);

  const groupMatch = path.match(/^\/groups\/([^/]+)$/);
  if (groupMatch) return getGroupDetails(groupMatch[1]);

  throw new Error("Demo route not found.");
};
