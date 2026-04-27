import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { demoStore } from "../services/demoStore.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Not authorized." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (demoStore.isEnabled()) {
      const user = demoStore.getUserById(decoded.id);
      req.user = user ? demoStore.safeUser(user) : null;
    } else {
      req.user = await User.findById(decoded.id).select("-password");
    }

    if (!req.user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid token." });
  }
};
