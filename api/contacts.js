import { getAuthFromRequest, handleAuthError } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let oauth2Client;
  try {
    oauth2Client = getAuthFromRequest(req);
  } catch (error) {
    return handleAuthError(res, error);
  }

  try {
    const { google } = await import('googleapis');
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get sent messages
    const sentMessages = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SENT'],
      maxResults: 100
    });
    
    // Process messages to extract contacts and last contact dates
    const contactsMap = new Map();
    
    for (const message of sentMessages.data.messages || []) {
      const messageDetails = await gmail.users.messages.get({
        userId: 'me',
        id: message.id
      });
      
      const headers = messageDetails.data.payload.headers;
      const toHeader = headers.find(header => header.name === 'To');
      const dateHeader = headers.find(header => header.name === 'Date');
      
      if (toHeader && dateHeader) {
        const recipients = toHeader.value.split(',').map(email => email.trim());
        const date = new Date(dateHeader.value);
        
        recipients.forEach(email => {
          if (!contactsMap.has(email) || contactsMap.get(email).lastContact < date) {
            contactsMap.set(email, {
              id: message.id,
              email,
              name: email.split('@')[0], // Simple name extraction
              lastContact: date.toISOString(),
              lastMessageId: message.id
            });
          }
        });
      }
    }
    
    const contacts = Array.from(contactsMap.values());
    
    res.status(200).json({ contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    
    // Check if it's an authentication error
    if (error.response && error.response.status === 401) {
      return handleAuthError(res, error);
    }
    
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
}