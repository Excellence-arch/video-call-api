import express from "express"
import User from "../models/User"
import { authenticateToken, type AuthRequest } from "../middleware/auth"

const router = express.Router()

// Get user profile by username
router.get("/profile/:username", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { username } = req.params

    const user = await User.findOne({ username }).select("-password -verificationToken")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gender: user.gender,
        status: user.status,
        isVerified: user.isVerified,
      },
    })
  } catch (error) {
    console.error("Get profile error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

// Get current user profile
router.get("/me", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    return res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        gender: req.user.gender,
        status: req.user.status,
        isVerified: req.user.isVerified,
      },
    })
  } catch (error) {
    console.error("Get current user error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

export default router
