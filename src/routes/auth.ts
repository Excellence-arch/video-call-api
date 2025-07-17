import express, {Request, Response} from "express"
import User from "../models/User"
import { registerValidation, loginValidation, validateRequest } from "../middleware/validation"
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt"
import { generateVerificationToken, sendVerificationEmail } from "../utils/email"
import { authenticateToken, type AuthRequest } from "../middleware/auth"
import { ObjectId } from "mongoose"

const router = express.Router()

// Register
router.post("/register", registerValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const { username, email, password, gender } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? "Email already registered" : "Username already taken",
      })
    }

    // Generate verification token
    const verificationToken = generateVerificationToken()

    // Create user
    const user = new User({
      username,
      email,
      password,
      gender,
      verificationToken,
    })

    await user.save()

    // Send verification email
    await sendVerificationEmail(email, verificationToken)

    return res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      userId: user._id,
    })
  } catch (error) {
    console.error("Registration error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

// Verify email
router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({ message: "Verification token required" })
    }

    const user = await User.findOne({ verificationToken: token })

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token" })
    }

    user.isVerified = true
    user.verificationToken = undefined
    await user.save()

    return res.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Email verification error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

// Login
router.post("/login", loginValidation, validateRequest, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check if email is verified
    if (!user.isVerified) {
       const tempToken = generateRefreshToken(
         (user._id as ObjectId).toString()
       ); // short-lived refresh token

       res.cookie('refreshToken', tempToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'strict',
         maxAge: 15 * 60 * 1000, // 15 mins only
       });

       return res.status(401).json({
         message: 'Please verify your email before logging in',
         tempTokenProvided: true, // optional for debugging
       });
    }

    // Generate tokens
    const accessToken = generateAccessToken((user._id as ObjectId).toString())
    const refreshToken = generateRefreshToken((user._id as ObjectId).toString())

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    // Update user status
    user.status = "online"
    await user.save()

    return res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        gender: user.gender,
        status: user.status,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

// Refresh token
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" })
    }

    const decoded = verifyRefreshToken(refreshToken)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    const accessToken = generateAccessToken((user._id as ObjectId).toString())

    return res.json({ accessToken })
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" })
  }
})

router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const newToken = generateVerificationToken();
    user.verificationToken = newToken;
    await user.save();

    await sendVerificationEmail(user.email, newToken);

    return res.json({
      message: "Verification email resent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Logout
router.post("/logout", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    // Update user status
    if (req.user) {
      req.user.status = "offline"
      await req.user.save()
    }

    // Clear refresh token cookie
    res.clearCookie("refreshToken")
    return res.json({ message: "Logout successful" })
  } catch (error) {
    console.error("Logout error:", error)
    return res.status(500).json({ message: "Internal server error" })
  }
})

export default router
