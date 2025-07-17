import express from "express"
import User from "../models/User"
import CallHistory from "../models/CallHistory"
import { authenticateToken, type AuthRequest } from "../middleware/auth"

const router = express.Router()

// Find random online user for call
router.post("/random", authenticateToken, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    // Find random online user (excluding current user)
    const randomUser = await User.aggregate([
      {
        $match: {
          _id: { $ne: req.user._id },
          status: "online",
          isVerified: true,
        },
      },
      { $sample: { size: 1 } },
    ])

    if (randomUser.length === 0) {
      return res.status(404).json({ message: "No online users available" })
    }

    const user = randomUser[0]

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        gender: user.gender,
      },
    })
  } catch (error) {
    console.error("Random call error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

// Save call history
router.post("/history", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { calleeId, status, duration } = req.body

    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" })
    }

    const callHistory = new CallHistory({
      callerId: req.user._id,
      calleeId,
      status,
      duration,
    })

    await callHistory.save()

    return res.status(201).json({ message: "Call history saved" })
  } catch (error) {
    console.error("Save call history error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

export default router
