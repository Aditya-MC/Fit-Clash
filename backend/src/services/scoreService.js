const round = (value) => Math.round(value);

const formatDateKey = (value) => new Date(value).toISOString().slice(0, 10);
const normalizeType = (value) => (value || "").toLowerCase();

const DEFAULT_SCORING_RULES = {
  runPerKm: 12,
  ridePerKm: 5,
  swimPerKm: 20,
  walkPerKm: 4,
  hikePerKm: 6,
  workoutPerMinute: 1 / 6,
  consistencyWeekly: {
    3: 15,
    5: 35,
    7: 60
  },
  consistencyMonthly: {
    8: 30,
    12: 60,
    16: 100,
    20: 150
  }
};

export const getScoringRules = (rules = {}) => ({
  ...DEFAULT_SCORING_RULES,
  ...rules,
  workoutPerMinute:
    rules.workoutPerMinute === undefined || Number(rules.workoutPerMinute) === 0.5
      ? DEFAULT_SCORING_RULES.workoutPerMinute
      : Number(rules.workoutPerMinute),
  consistencyWeekly: {
    ...DEFAULT_SCORING_RULES.consistencyWeekly,
    ...(rules.consistencyWeekly || {})
  },
  consistencyMonthly: {
    ...DEFAULT_SCORING_RULES.consistencyMonthly,
    ...(rules.consistencyMonthly || {})
  }
});

export const isScoredActivityType = (type) => {
  const normalized = normalizeType(type);

  return (
    normalized.includes("run") ||
    normalized.includes("ride") ||
    normalized.includes("cycle") ||
    normalized.includes("swim") ||
    normalized.includes("workout") ||
    normalized.includes("weight") ||
    normalized.includes("strength") ||
    normalized.includes("walk") ||
    normalized.includes("hike")
  );
};

export const isWorkoutType = (type) => {
  const normalized = normalizeType(type);
  return normalized.includes("workout") || normalized.includes("weight") || normalized.includes("strength");
};

export const validateActivityForScoring = (activity) => {
  const type = normalizeType(activity.type);
  const distanceKm = Number(activity.distanceKm || 0);
  const movingTimeMinutes = Number(activity.movingTimeMinutes || 0);

  if (!type) {
    return "Activity type is required.";
  }

  if (distanceKm < 0 || movingTimeMinutes < 0 || Number(activity.elevationGain || 0) < 0) {
    return "Activity values cannot be negative.";
  }

  if (type.includes("run") || type.includes("walk") || type.includes("hike") || type.includes("ride") || type.includes("cycle") || type.includes("swim")) {
    if (distanceKm <= 0 && movingTimeMinutes <= 0) {
      return "Distance-based activities require distance or duration.";
    }
  }

  if (isWorkoutType(type) && movingTimeMinutes <= 0) {
    return "Workouts require duration.";
  }

  return null;
};

export const calculatePoints = (activity, scoringRules) => {
  const rules = getScoringRules(scoringRules);
  const distanceKm = Number(activity.distanceKm || 0);
  const movingTimeMinutes = Number(activity.movingTimeMinutes || 0);
  const type = normalizeType(activity.type);

  if (type.includes("run")) {
    return round(distanceKm * rules.runPerKm);
  }

  if (type.includes("ride") || type.includes("cycle")) {
    return round(distanceKm * rules.ridePerKm);
  }

  if (type.includes("swim")) {
    return round(distanceKm * rules.swimPerKm);
  }

  if (type.includes("walk")) {
    return round(distanceKm * rules.walkPerKm);
  }

  if (type.includes("hike")) {
    return round(distanceKm * rules.hikePerKm);
  }

  return round(movingTimeMinutes * rules.workoutPerMinute);
};

export const getPeriodStart = (challengeDuration, referenceDate = new Date()) => {
  const current = new Date(referenceDate);
  current.setHours(0, 0, 0, 0);

  if (challengeDuration === "weekly") {
    const day = current.getDay();
    const mondayOffset = (day + 6) % 7;
    current.setDate(current.getDate() - mondayOffset);
    return current;
  }

  return new Date(current.getFullYear(), current.getMonth(), 1);
};

export const getPeriodEnd = (challengeDuration, referenceDate = new Date()) => {
  const start = getPeriodStart(challengeDuration, referenceDate);
  const end = new Date(start);

  if (challengeDuration === "weekly") {
    end.setDate(end.getDate() + 7);
    return end;
  }

  end.setMonth(end.getMonth() + 1);
  return end;
};

export const getActivitiesInPeriod = (activities, challengeDuration, referenceDate = new Date()) => {
  const start = getPeriodStart(challengeDuration, referenceDate);
  const end = getPeriodEnd(challengeDuration, referenceDate);

  return activities.filter((activity) => {
    const startedAt = new Date(activity.startedAt);
    return startedAt >= start && startedAt < end;
  });
};

export const getActiveDayCount = (activities, challengeDuration, referenceDate = new Date()) =>
  new Set(getActivitiesInPeriod(activities, challengeDuration, referenceDate).map((activity) => formatDateKey(activity.startedAt))).size;

export const calculateConsistencyBonus = (activities, challengeDuration, scoringRules, referenceDate = new Date()) => {
  const rules = getScoringRules(scoringRules);
  const activeDays = getActiveDayCount(activities, challengeDuration, referenceDate);
  const thresholdTable = challengeDuration === "weekly" ? rules.consistencyWeekly : rules.consistencyMonthly;

  const matchedThreshold = Object.keys(thresholdTable)
    .map(Number)
    .sort((left, right) => left - right)
    .filter((threshold) => activeDays >= threshold)
    .at(-1);

  return {
    activeDays,
    consistencyBonus: matchedThreshold ? thresholdTable[matchedThreshold] : 0
  };
};

export const getConsistencySeries = (activities, days = 7) => {
  const buckets = new Map();

  activities.forEach((activity) => {
    const dateKey = formatDateKey(activity.startedAt);
    const total = buckets.get(dateKey) || 0;
    buckets.set(dateKey, total + activity.pointsAwarded);
  });

  const today = new Date();
  const series = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);
    currentDate.setDate(today.getDate() - index);
    const dateKey = formatDateKey(currentDate);

    series.push({
      date: dateKey,
      points: buckets.get(dateKey) || 0
    });
  }

  return series;
};

export const getCumulativeSeries = (activities, days = 14) => {
  const buckets = new Map();

  activities.forEach((activity) => {
    const dateKey = formatDateKey(activity.startedAt);
    const total = buckets.get(dateKey) || 0;
    buckets.set(dateKey, total + activity.pointsAwarded);
  });

  const today = new Date();
  const series = [];
  let runningTotal = 0;

  for (let index = days - 1; index >= 0; index -= 1) {
    const currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);
    currentDate.setDate(today.getDate() - index);
    const dateKey = formatDateKey(currentDate);
    runningTotal += buckets.get(dateKey) || 0;

    series.push({
      date: dateKey,
      points: runningTotal
    });
  }

  return series;
};
