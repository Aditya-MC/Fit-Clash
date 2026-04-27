const round = (value) => Math.round(value);

const formatDateKey = (value) => new Date(value).toISOString().slice(0, 10);

export const calculatePoints = (activity, scoringRules) => {
  const distanceKm = Number(activity.distanceKm || 0);
  const type = activity.type?.toLowerCase() || "";

  if (type.includes("run")) {
    return round(distanceKm * scoringRules.runPerKm);
  }

  if (type.includes("ride") || type.includes("cycle")) {
    return round(distanceKm * scoringRules.ridePerKm);
  }

  if (type.includes("swim")) {
    return round(distanceKm * scoringRules.swimPerKm);
  }

  return scoringRules.workoutFlat;
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
