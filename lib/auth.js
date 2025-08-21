import { google } from 'googleapis';

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

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    res.redirect(302, authUrl);
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}