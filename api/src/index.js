const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const CardDAVClient = require('./carddav-client');
const { validateEmail, validateGroupName, validateContactData } = require('./utils/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Bearer token authentication middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.API_BEARER_TOKEN;

  if (!expectedToken) {
    console.error('API_BEARER_TOKEN not configured');
    return res.status(500).json({ error: 'Authentication not configured' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <token>' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  if (token !== expectedToken) {
    console.log('Invalid token attempt:', token.substring(0, 10) + '...');
    return res.status(401).json({ error: 'Invalid bearer token' });
  }

  next();
};

// Initialize CardDAV client
const cardDAVClient = new CardDAVClient({
  baseUrl: process.env.CARDDAV_BASE_URL || 'https://carddav.fastmail.com',
  username: process.env.FASTMAIL_USERNAME,
  password: process.env.FASTMAIL_PASSWORD
});

// Known groups mapping
const KNOWN_GROUPS = {
  'paper trail': {
    uid: '6f890c23-e6ed-4825-97fb-eb0393f61b56',
    name: 'Paper Trail'
  },
  'feed': {
    uid: '8fcf1f9c-3524-4cb1-a6df-8d417397be19',
    name: 'Feed'
  },
  'firehose': {
    uid: '59758f7a-88de-40c2-937e-2a0229738f55',
    name: 'Firehose'
  },
  'bulletin': {
    uid: '4123ba9d-d71f-4ddc-ba81-1ee4ec9a7d8e',
    name: 'Bulletin'
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API endpoints (protected)
app.post('/api/groups/members', requireAuth, async (req, res) => {
  try {
    const { email, groupName } = req.body;

    // Validate inputs
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (!validateGroupName(groupName)) {
      return res.status(400).json({ error: 'Invalid group name' });
    }

    // Add email to group
    const result = await cardDAVClient.addEmailToGroup(email, groupName);

    res.json({
      success: true,
      message: `Email ${email} added to group ${groupName}`,
      result
    });

  } catch (error) {
    console.error('Error adding email to group:', error);
    res.status(500).json({
      error: 'Failed to add email to group',
      details: error.message
    });
  }
});

// Remove email from group
app.delete('/api/groups/members', requireAuth, async (req, res) => {
  try {
    const { email, groupName } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (!validateGroupName(groupName)) {
      return res.status(400).json({ error: 'Invalid group name' });
    }

    const result = await cardDAVClient.removeEmailFromGroup(email, groupName);

    res.json({
      success: true,
      message: `Email ${email} removed from group ${groupName}`,
      result
    });

  } catch (error) {
    console.error('Error removing email from group:', error);
    res.status(500).json({
      error: 'Failed to remove email from group',
      details: error.message
    });
  }
});

// List all groups
app.get('/api/groups', requireAuth, async (req, res) => {
  try {
    const groups = await cardDAVClient.listGroups();
    res.json({ groups });
  } catch (error) {
    console.error('Error listing groups:', error);
    res.status(500).json({
      error: 'Failed to list groups',
      details: error.message
    });
  }
});

// Get group members
app.get('/api/groups/:groupName/members', requireAuth, async (req, res) => {
  try {
    const { groupName } = req.params;

    if (!validateGroupName(groupName)) {
      return res.status(400).json({ error: 'Invalid group name' });
    }

    const members = await cardDAVClient.getGroupMembers(groupName);
    res.json({ groupName, members });
  } catch (error) {
    console.error('Error getting group members:', error);
    res.status(500).json({
      error: 'Failed to get group members',
      details: error.message
    });
  }
});

// Create new group
app.post('/api/groups', requireAuth, async (req, res) => {
  try {
    const { groupName } = req.body;

    if (!validateGroupName(groupName)) {
      return res.status(400).json({ error: 'Invalid group name' });
    }

    const result = await cardDAVClient.createGroup(groupName);

    res.json({
      success: true,
      message: `Group ${groupName} created successfully`,
      result
    });

  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      error: 'Failed to create group',
      details: error.message
    });
  }
});

// Get contact by UID
app.get('/api/contacts/:uid', requireAuth, async (req, res) => {
  try {
    const { uid } = req.params;

    // Basic UID format validation
    if (!uid || uid.length < 8) {
      return res.status(400).json({ error: 'Invalid UID format' });
    }

    const contact = await cardDAVClient.findContactByUid(uid);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      success: true,
      contact: {
        uid: contact.uid,
        name: contact.name,
        email: contact.email,
        type: contact.type,
        isGroup: contact.isGroup,
        href: contact.href
      }
    });

  } catch (error) {
    console.error('Error getting contact by UID:', error);
    res.status(500).json({
      error: 'Failed to get contact',
      details: error.message
    });
  }
});

// Create contact (optionally with group association)
app.post('/api/contacts', requireAuth, async (req, res) => {
  try {
    console.log('=== POST /api/contacts ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));

    const { contact, groupName } = req.body;
    console.log('Extracted contact:', JSON.stringify(contact, null, 2));
    console.log('Extracted groupName:', groupName);

    // Validate contact data
    const validation = validateContactData(contact);
    console.log('Validation result:', validation);
    if (!validation.valid) {
      console.log('Validation failed:', validation.error);
      return res.status(400).json({ error: validation.error });
    }

    // Validate and resolve group name if provided
    let groupInfo = null;
    if (groupName) {
      if (!validateGroupName(groupName)) {
        console.log('Group name validation failed:', groupName);
        return res.status(400).json({ error: 'Invalid group name' });
      }

      const lowerGroupName = groupName.toLowerCase();
      groupInfo = KNOWN_GROUPS[lowerGroupName];

      if (!groupInfo) {
        console.log('Unknown group name:', groupName);
        return res.status(400).json({ error: `Unknown group: ${groupName}. Known groups: ${Object.values(KNOWN_GROUPS).map(g => g.name).join(', ')}` });
      }
    }

    console.log('About to create contact with group:', groupInfo ? groupInfo.name : 'none');

    // Create contact first
    const contactResult = await cardDAVClient.createContact(contact);
    console.log('Contact creation result:', JSON.stringify(contactResult, null, 2));

    let groupAssociation = null;
    if (groupInfo) {
      // Add to group using direct UID access
      try {
        const groupContact = await cardDAVClient.findContactByUid(groupInfo.uid);
        if (groupContact && groupContact.isGroup) {
          // Add member to group VCF
          let vcfLines = groupContact.vcfContent.split('\n');
          const memberLine = `X-ADDRESSBOOKSERVER-MEMBER:urn:uuid:${contactResult.uid}`;

          // Add before END:VCARD
          const endIndex = vcfLines.findIndex(line => line.trim() === 'END:VCARD');
          if (endIndex !== -1) {
            vcfLines.splice(endIndex, 0, memberLine);

            // Update REV timestamp
            const revIndex = vcfLines.findIndex(line => line.startsWith('REV:'));
            if (revIndex !== -1) {
              vcfLines[revIndex] = `REV:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
            }

            const updatedVcf = vcfLines.join('\n');
            await cardDAVClient.makeRequest('PUT', groupContact.href, updatedVcf, {
              'Content-Type': 'text/vcard; charset=utf-8'
            });

            groupAssociation = {
              success: true,
              groupName: groupInfo.name,
              message: `Contact added to group ${groupInfo.name}`
            };
          } else {
            throw new Error('Invalid group VCF format');
          }
        } else {
          throw new Error('Group not found or invalid');
        }
      } catch (groupError) {
        console.log('Group association failed:', groupError);
        groupAssociation = {
          success: false,
          groupName: groupInfo.name,
          error: groupError.message,
          message: 'Contact created successfully but failed to add to group'
        };
      }
    }

    const response = {
      success: true,
      message: groupInfo
        ? `Contact created and associated with group ${groupInfo.name}`
        : 'Contact created successfully',
      contact: {
        uid: contactResult.uid,
        href: contactResult.href
      },
      groupAssociation: groupAssociation
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    res.json(response);

  } catch (error) {
    console.error('Error creating contact:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to create contact',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Fastmail Group Manager API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});