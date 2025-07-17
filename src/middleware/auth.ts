import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import User, { type IUser } from "../models/User"

export interface AuthRequest extends Request {
  user?: IUser
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(" ")[1]

    if (!token) {
      return res.status(401).json({ message: "Access token required" })
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as { userId: string }
    const user = await User.findById(decoded.userId).select("-password")

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: "Email not verified" })
    }

    req.user = user
    return next()
  } catch (error) {
    return res.status(403).json({ message: "Invalid or expired token" })
  }
}
