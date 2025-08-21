import { google } from 'googleapis';
import crypto from 'crypto';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  try {
    // Determine the correct redirect URI based on the environment
    const isLocalhost = req.headers.host.includes('localhost');
    const protocol = isLocalhost ? 'http' : 'https';
    const redirectUri = `${protocol}://${req.headers.host}/api/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(20).toString('hex');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent',
      state: state // Add state parameter
    });

    // Set state cookie with short expiration (5 minutes)
    res.setHeader('Set-Cookie',
        serialize('oauth_state', state, {
          httpOnly: true,
          secure: !isLocalhost,
          sameSite: 'lax',
          path: '/',
          maxAge: 300 // 5 minutes
        })
    );

    res.redirect(302, authUrl);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}