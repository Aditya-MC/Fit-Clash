import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { demoStore } from "../services/demoStore.js";
import { exchangeCodeForToken, getStravaAuthUrl } from "../services/stravaService.js";

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  bio: user.bio,
  totalPoints: user.totalPoints,
  streakDays: user.streakDays,
  stravaConnected: Boolean(user.strava?.athleteId)
});

const buildStravaIdentity = (tokens) => {
  const athlete = tokens.athlete || {};
  const displayName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim() || athlete.username || "Strava Athlete";

  return {
    name: displayName,
    email: `strava_${tokens.athleteId}@fitclash.local`,
    avatar: athlete.profile || "",
    password: `strava-${tokens.athleteId}-${process.env.JWT_SECRET}`
  };
};

export const getStravaLoginUrl = async (_req, res) => {
  try {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    return res.json({ url: getStravaAuthUrl("login") });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to prepare Strava login." });
  }
};

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }

  if (demoStore.isEnabled()) {
    const existingUser = demoStore.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const user = await demoStore.createUser({ name, email, password });
    return res.status(201).json({
      token: generateToken(user._id),
      user: safeUser(user)
    });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: "Email already in use." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword
  });

  return res.status(201).json({
    token: generateToken(user._id),
    user: safeUser(user)
  });
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (demoStore.isEnabled()) {
    const user = demoStore.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      token: generateToken(user._id),
      user: safeUser(user)
    });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  return res.json({
    token: generateToken(user._id),
    user: safeUser(user)
  });
};

export const getMe = async (req, res) => {
  return res.json(safeUser(req.user));
};

export const loginWithStrava = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code is required." });
    }

    const tokens = await exchangeCodeForToken(code);
    const stravaIdentity = buildStravaIdentity(tokens);

    if (demoStore.isEnabled()) {
      let user = demoStore.getUserByEmail(stravaIdentity.email);
      if (!user) {
        user = await demoStore.createUser({
          name: stravaIdentity.name,
          email: stravaIdentity.email,
          password: stravaIdentity.password
        });
      }

      demoStore.markStravaConnected(user._id, tokens);
      const connectedUser = demoStore.getUserById(user._id);

      return res.json({
        token: generateToken(user._id),
        user: safeUser(connectedUser)
      });
    }

    let user = await User.findOne({
      $or: [{ "strava.athleteId": tokens.athleteId }, { email: stravaIdentity.email }]
    });

    if (!user) {
      try {
        const hashedPassword = await bcrypt.hash(stravaIdentity.password, 10);
        user = await User.create({
          name: stravaIdentity.name,
          email: stravaIdentity.email,
          password: hashedPassword,
          avatar: stravaIdentity.avatar,
          strava: {
            athleteId: tokens.athleteId,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt
          }
        });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }

        user = await User.findOne({
          $or: [{ "strava.athleteId": tokens.athleteId }, { email: stravaIdentity.email }]
        });
      }
    } else {
      user.name = user.name || stravaIdentity.name;
      user.avatar = user.avatar || stravaIdentity.avatar;
    }

    user.strava = {
      athleteId: tokens.athleteId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt
    };
    await user.save();

    return res.json({
      token: generateToken(user._id),
      user: safeUser(user)
    });
  } catch (error) {
    console.error("Strava login failed", error);
    const message = error.message || "Failed to authenticate with Strava.";
    const statusCode = /authorization code|bad request|invalid/i.test(message) ? 400 : 500;
    return res.status(statusCode).json({ message });
  }
};
