import { getAuthFromRequest, handleAuthError } from '../../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  let oauth2Client;
  try {
    oauth2Client = getAuthFromRequest(req);
  } catch (error) {
    return handleAuthError(res, error);
  }

  try {
    const { google } = await import('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get the specific message
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: id
    });
    
    // Extract message content
    let messageBody = '';
    const part = message.data.payload;
    
    if (part.body.data) {
      messageBody = Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      // Look for the plain text part
      const textPart = part.parts.find(p => p.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        messageBody = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }
    
    res.status(200).json({ message: messageBody });
  } catch (error) {
    console.error('Error fetching message:', error);
    
    // Check if it's an authentication error
    if (error.response && error.response.status === 401) {
      return handleAuthError(res, error);
    }
    
    res.status(500).json({ error: 'Failed to fetch message' });
  }
}