/**
 * Get the base URL for the site
 * Uses NEXT_PUBLIC_SITE_URL environment variable or defaults to localhost in development
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  
  // Default to localhost in development
  return process.env.NODE_ENV === 'production' 
    ? 'https://opentix.dev' // Update with your actual domain
    : 'http://localhost:3001'
}

/**
 * Generate full URL from a path
 */
export function getUrl(path: string): string {
  const baseUrl = getBaseUrl()
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
