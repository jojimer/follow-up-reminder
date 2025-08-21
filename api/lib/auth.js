import { google } from 'googleapis';
import { parse } from 'cookie';

export function getAuthFromRequest(req) {
  // Parse cookies from request
  const cookies = parse(req.headers.cookie || '');
  
  const accessToken = cookies.gmail_access_token;
  const refreshToken = cookies.gmail_refresh_token;
  
  if (!accessToken || !refreshToken) {
    throw new Error('Authentication required');
  }
  
  // Create and configure OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  
  return oauth2Client;
}

export function handleAuthError(res, error) {
  console.error('Auth error:', error);
  
  // Clear invalid tokens
  res.setHeader('Set-Cookie', [
    'gmail_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure',
    'gmail_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure'
  ]);
  
  return res.status(401).json({ error: 'Authentication required' });
}