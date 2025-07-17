import { ObjectId } from "mongoose"

export interface User {
  _id: ObjectId
  username: string
  email: string
  password: string
  gender: "male" | "female" | "other"
  isVerified: boolean
  status: "online" | "offline"
  verificationToken?: string
  createdAt: Date
  updatedAt: Date
}

export interface CallHistory {
  _id: ObjectId
  callerId: string
  calleeId: string
  status: "accepted" | "rejected" | "missed"
  duration?: number
  timestamp: Date
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface SocketUser {
  userId: string
  socketId: string
  username: string
}
