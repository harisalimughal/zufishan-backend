import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

export const hashPassword = async (password: string): Promise<string> => {
  if (!password) {
    throw new Error('Password is required')
  }
  const salt = await bcrypt.genSalt(SALT_ROUNDS)
  return bcrypt.hash(password, salt)
}

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  if (!password || !hashedPassword) {
    return false
  }
  return bcrypt.compare(password, hashedPassword)
}

export const isPasswordStrong = (password: string): boolean => {
  const minLength = 8
  const hasUpperCase = /[A-Z]/.test(password)
  const hasLowerCase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
}