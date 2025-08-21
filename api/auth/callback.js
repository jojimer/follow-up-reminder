import { google } from 'googleapis';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.VERCEL_URL}/api/auth/callback`
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Set HTTP-only, Secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    };

    res.setHeader('Set-Cookie', [
      serialize('gmail_access_token', tokens.access_token, {
        ...cookieOptions,
        maxAge: 60 * 60 // 1 hour (typical access token lifetime)
      }),
      serialize('gmail_refresh_token', tokens.refresh_token, cookieOptions)
    ]);

    // Redirect to the main app
    res.redirect(302, '/');
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
}