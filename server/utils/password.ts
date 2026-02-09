import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// ==================== PASSWORD HASHING ====================
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// ==================== PASSWORD VALIDATION ====================
export const validatePasswordStrength = (password: string): {
  valid: boolean;
  message?: string;
} => {
  if (password.length < 4) {
    return { valid: false, message: 'Password must be at least 4 characters' };
  }

  if (password.length > 100) {
    return { valid: false, message: 'Password too long' };
  }

  // Optional: Add more strength requirements
  // const hasNumber = /\d/.test(password);
  // const hasLetter = /[a-zA-Z]/.test(password);
  
  return { valid: true };
};