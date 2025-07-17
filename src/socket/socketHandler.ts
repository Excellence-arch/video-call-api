import { Server, Socket } from "socket.io"
import jwt from "jsonwebtoken"
import User from "../models/User"
import CallHistory from "../models/CallHistory"
import { ObjectId } from "mongoose"
import { ExtendedError } from "socket.io/dist/namespace"

interface SocketUser {
  userId: string
  socketId: string
  username: string
}

const connectedUsers = new Map<string, SocketUser>()

export const handleSocketConnection = (io: Server) => {
  io.use(async (socket: any, next: (err?: ExtendedError) => void) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) {
        return next(new Error("Authentication error"))
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string) as { userId: string }
      const user = await User.findById(decoded.userId)

      if (!user || !user.isVerified) {
        return next(new Error("Authentication error"))
      }

      socket.userId = (user._id as ObjectId).toString()
      socket.username = user.username
      next()
    } catch (error) {
      next(new Error("Authentication error"))
    }
  })

  io.on("connection", (socket: Socket & { userId?: string; username?: string }) => {
    console.log(`User connected: ${socket.username} (${socket.id})`)

    // Add user to connected users
    if (socket.userId && socket.username) {
      connectedUsers.set(socket.userId, {
        userId: socket.userId,
        socketId: socket.id,
        username: socket.username,
      })

      // Update user status to online
      User.findByIdAndUpdate(socket.userId, { status: "online" }).exec()
    }

    // Handle call initiation
    socket.on("call:initiate", async (data: { calleeId: string; offer: any }) => {
      try {
        const { calleeId, offer } = data
        const callee = connectedUsers.get(calleeId)

        if (callee && socket.userId) {
          // Notify callee of incoming call
          io.to(callee.socketId).emit("call:incoming", {
            callerId: socket.userId,
            callerUsername: socket.username,
            offer,
          })

          // Create call history entry
          const callHistory = new CallHistory({
            callerId: socket.userId,
            calleeId,
            status: "missed",
          })
          await callHistory.save()
        } else {
          socket.emit("call:error", { message: "User is not available" })
        }
      } catch (error) {
        console.error("Call initiate error:", error)
        socket.emit("call:error", { message: "Failed to initiate call" })
      }
    })

    // Handle call acceptance
    socket.on("call:accept", async (data: { callerId: string; answer: any }) => {
      try {
        const { callerId, answer } = data
        const caller = connectedUsers.get(callerId)

        if (caller && socket.userId) {
          // Notify caller that call was accepted
          io.to(caller.socketId).emit("call:accepted", {
            calleeId: socket.userId,
            answer,
          })

          // Update call history
          await CallHistory.findOneAndUpdate(
            { callerId, calleeId: socket.userId, status: "missed" },
            { status: "accepted" },
            { sort: { timestamp: -1 } },
          )
        }
      } catch (error) {
        console.error("Call accept error:", error)
      }
    })

    // Handle call rejection
    socket.on("call:reject", async (data: { callerId: string }) => {
      try {
        const { callerId } = data
        const caller = connectedUsers.get(callerId)

        if (caller && socket.userId) {
          // Notify caller that call was rejected
          io.to(caller.socketId).emit("call:rejected", {
            calleeId: socket.userId,
          })

          // Update call history
          await CallHistory.findOneAndUpdate(
            { callerId, calleeId: socket.userId, status: "missed" },
            { status: "rejected" },
            { sort: { timestamp: -1 } },
          )
        }
      } catch (error) {
        console.error("Call reject error:", error)
      }
    })

    // Handle call end
    socket.on("call:end", async (data: { otherUserId: string; duration?: number }) => {
      try {
        const { otherUserId, duration } = data
        const otherUser = connectedUsers.get(otherUserId)

        if (otherUser) {
          // Notify other user that call ended
          io.to(otherUser.socketId).emit("call:ended", {
            userId: socket.userId,
          })
        }

        // Update call history with duration if provided
        if (duration && socket.userId) {
          await CallHistory.findOneAndUpdate(
            {
              $or: [
                { callerId: socket.userId, calleeId: otherUserId },
                { callerId: otherUserId, calleeId: socket.userId },
              ],
              status: "accepted",
            },
            { duration },
            { sort: { timestamp: -1 } },
          )
        }
      } catch (error) {
        console.error("Call end error:", error)
      }
    })

    // Handle ICE candidates
    socket.on("ice:candidate", (data: { targetUserId: string; candidate: any }) => {
      const { targetUserId, candidate } = data
      const targetUser = connectedUsers.get(targetUserId)

      if (targetUser) {
        io.to(targetUser.socketId).emit("ice:candidate", {
          fromUserId: socket.userId,
          candidate,
        })
      }
    })

    // Handle disconnect
    socket.on("disconnect", async () => {
      console.log(`User disconnected: ${socket.username} (${socket.id})`)

      if (socket.userId) {
        // Remove from connected users
        connectedUsers.delete(socket.userId)

        // Update user status to offline
        await User.findByIdAndUpdate(socket.userId, { status: "offline" })
      }
    })
  })
}
