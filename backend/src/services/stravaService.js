const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

const assertStravaConfig = () => {
  if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET || !process.env.STRAVA_REDIRECT_URI) {
    throw new Error("Strava environment variables are not fully configured.");
  }
};

const mapActivity = (activity) => ({
  id: String(activity.id),
  name: activity.name,
  type: activity.sport_type || activity.type,
  distanceKm: Number(((activity.distance || 0) / 1000).toFixed(2)),
  movingTimeMinutes: Number(((activity.moving_time || 0) / 60).toFixed(1)),
  elevationGain: Number(activity.total_elevation_gain || 0),
  startedAt: new Date(activity.start_date)
});

const postTokenRequest = async (params) => {
  const response = await fetch(STRAVA_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      ...params
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to complete Strava token request.");
  }

  return {
    athleteId: String(data.athlete?.id || ""),
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    athlete: data.athlete
      ? {
          id: String(data.athlete.id),
          firstname: data.athlete.firstname || "",
          lastname: data.athlete.lastname || "",
          username: data.athlete.username || "",
          profile: data.athlete.profile || ""
        }
      : null
  };
};

export const getStravaAuthUrl = () => {
  assertStravaConfig();

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all"
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code) => {
  assertStravaConfig();
  return postTokenRequest({
    code,
    grant_type: "authorization_code"
  });
};

export const refreshStravaToken = async (refreshToken) => {
  assertStravaConfig();
  return postTokenRequest({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
};

export const ensureFreshStravaTokens = async (user) => {
  const strava = user?.strava;

  if (!strava?.accessToken || !strava?.refreshToken) {
    throw new Error("Strava is not connected for this user.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (strava.expiresAt && strava.expiresAt > now + 120) {
    return {
      tokens: strava,
      refreshed: false
    };
  }

  const refreshedTokens = await refreshStravaToken(strava.refreshToken);
  return {
    tokens: refreshedTokens,
    refreshed: true
  };
};

export const fetchRecentActivities = async (user) => {
  const { tokens, refreshed } = await ensureFreshStravaTokens(user);
  const after = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;

  const response = await fetch(`${STRAVA_API_URL}/athlete/activities?per_page=50&after=${after}`, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch Strava activities.");
  }

  return {
    activities: data.map(mapActivity),
    tokens: refreshed ? tokens : null
  };
};
