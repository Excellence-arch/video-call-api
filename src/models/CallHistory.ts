import mongoose, { Schema, type Document } from "mongoose"

export interface ICallHistory extends Document {
  callerId: mongoose.Types.ObjectId
  calleeId: mongoose.Types.ObjectId
  status: "accepted" | "rejected" | "missed"
  duration?: number
  timestamp: Date
}

const CallHistorySchema: Schema = new Schema({
  callerId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  calleeId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["accepted", "rejected", "missed"],
    required: true,
  },
  duration: {
    type: Number,
    min: 0,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

export default mongoose.model<ICallHistory>("CallHistory", CallHistorySchema)
