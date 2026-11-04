// Validate required environment variables on startup
export function validateEnv(): void {
  const requiredEnvVars = [
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_DATABASE',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'AUTH_SECRET',
  ]

  const missingVars = requiredEnvVars.filter((v) => !process.env[v])

  if (missingVars.length > 0) {
    const message = `Missing required environment variables: ${missingVars.join(', ')}`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message)
    }
    console.warn(`⚠️  ${message}`)
  }

  // Validate credentials strength in production (only runtime, not build time)
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    // Server-side only validation
    const adminPassword = process.env.ADMIN_PASSWORD
    const authSecret = process.env.AUTH_SECRET

    if (adminPassword && adminPassword.length < 12) {
      console.warn('⚠️  ADMIN_PASSWORD should be at least 12 characters in production')
    }

    if (authSecret && authSecret.length < 32) {
      console.warn('⚠️  AUTH_SECRET should be at least 32 characters in production')
    }
  }
}
