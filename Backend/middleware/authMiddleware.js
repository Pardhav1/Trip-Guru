const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Blacklist = require("../models/blacklist");

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Extracted Token:", token); // Debugging token extraction
    }

    if (!token) {
      console.log("No token found in Authorization header"); // Debugging
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    // Check if token is blacklisted
    const isBlacklisted = await Blacklist.findOne({ token });
    if (isBlacklisted) {
      console.log("Token is blacklisted:", token); // Debugging
      return res.status(401).json({ message: "Token has been revoked. Please log in again." });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded); // Debugging decoded token
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        console.log("Token expired:", token); // Debugging token expiry
        return res.status(401).json({ message: "Session expired, please log in again." });
      }
      console.error("Invalid token:", jwtError.message); // Debugging invalid token
      return res.status(401).json({ message: "Invalid token, please log in again." });
    }

    // Fetch user data from database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("User not found with ID:", decoded.id); // Debugging user not found
      return res.status(404).json({ message: "User not found, please log in again." });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message); // Log unexpected errors
    res.status(500).json({ message: "Internal server error" });
  }
};
