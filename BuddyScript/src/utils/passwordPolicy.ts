export const passwordRequirements = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  symbol: /[^A-Za-z0-9]/,
} as const;

export const passwordPolicyMessages = {
  minLength: 'Password must be at least 8 characters long',
  uppercase: 'Password must contain at least one uppercase letter',
  lowercase: 'Password must contain at least one lowercase letter',
  number: 'Password must contain at least one number',
  symbol: 'Password must contain at least one symbol',
};

export const validatePasswordPolicy = (password: string) => {
  return {
    minLength: password.length >= passwordRequirements.minLength,
    uppercase: passwordRequirements.uppercase.test(password),
    lowercase: passwordRequirements.lowercase.test(password),
    number: passwordRequirements.number.test(password),
    symbol: passwordRequirements.symbol.test(password),
  };
};

export const isPasswordStrong = (password: string): boolean => {
  const checks = validatePasswordPolicy(password);
  return Object.values(checks).every(Boolean);
};
