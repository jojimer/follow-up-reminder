import { google } from 'googleapis';
import { parse } from 'cookie';

// Add this to suppress warnings
process.env.NODE_NO_WARNINGS = '1';

export default async function handler(req, res) {
    // Parse cookies from request
    const cookies = parse(req.headers.cookie || '');
    const accessToken = cookies.gmail_access_token;
    const refreshToken = cookies.gmail_refresh_token;

    if (!accessToken || !refreshToken) {
        return res.status(401).json({ error: 'Authentication required' });
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    try {
        // Handle different operations based on query parameters
        const { action, messageId } = req.query;

        if (action === 'contacts') {
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
                                name: email.split('@')[0],
                                lastContact: date.toISOString(),
                                lastMessageId: message.id
                            });
                        }
                    });
                }
            }

            const contacts = Array.from(contactsMap.values());
            return res.status(200).json({ contacts });
        }
        else if (action === 'message' && messageId) {
            // Get the specific message
            const message = await gmail.users.messages.get({
                userId: 'me',
                id: messageId
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

            return res.status(200).json({ message: messageBody });
        }
        else {
            return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Gmail API error:', error);

        // Check if it's an authentication error
        if (error.response && error.response.status === 401) {
            // Clear invalid tokens
            res.setHeader('Set-Cookie', [
                'gmail_access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure',
                'gmail_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure'
            ]);

            return res.status(401).json({ error: 'Authentication required' });
        }

        return res.status(500).json({ error: 'Gmail API request failed' });
    }
}