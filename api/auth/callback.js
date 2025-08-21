import { google } from 'googleapis';
import { parse, serialize } from 'cookie';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code missing' });
  }

  try {
    // Verify state parameter to prevent CSRF
    const cookies = parse(req.headers.cookie || '');
    const storedState = cookies.oauth_state;

    if (!state || !storedState || state !== storedState) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Determine the correct redirect URI based on the environment
    const isLocalhost = req.headers.host.includes('localhost');
    const protocol = isLocalhost ? 'http' : 'https';
    const redirectUri = `${protocol}://${req.headers.host}/api/auth/callback`;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Clear the state cookie after use
    res.setHeader('Set-Cookie',
        serialize('oauth_state', '', {
          httpOnly: true,
          secure: !isLocalhost,
          sameSite: 'lax',
          path: '/',
          expires: new Date(0)
        })
    );

    // Set HTTP-only, Secure cookies for tokens
    const cookieOptions = {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    };

    res.setHeader('Set-Cookie', [
      serialize('gmail_access_token', tokens.access_token, {
        ...cookieOptions,
        maxAge: 60 * 60 // 1 hour
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