import mongoose, { Schema, type Document } from "mongoose"
import bcrypt from "bcrypt"

export interface IUser extends Document {
  username: string
  email: string
  password: string
  gender: "male" | "female" | "other"
  isVerified: boolean
  status: "online" | "offline"
  verificationToken?: string
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["online", "offline"],
      default: "offline",
    },
    verificationToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next()

  try {
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model<IUser>("User", UserSchema)
