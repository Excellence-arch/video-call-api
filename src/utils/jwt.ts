import jwt from "jsonwebtoken"

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "15m",
  })
}

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  })
}

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { userId: string }
}
