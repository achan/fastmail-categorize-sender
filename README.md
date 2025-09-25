# Fastmail Sender Categorization

A monorepo containing an Apple Shortcuts integration and Node.js API for categorizing email senders by adding them to Fastmail contact groups via CardDAV.

## Components

This monorepo contains two main components:

### Apple Shortcut (`shortcut/`)
- Share sheet integration for iOS/macOS
- Quick categorization from Mail.app or other email clients
- Template shortcut file included (requires configuration)

### Node.js API (`api/`)
- RESTful API for programmatic access
- CardDAV integration with Fastmail
- Bearer token authentication for security
- Direct UID-based contact/group access for performance
- Ready for fly.io deployment

## Features

- Categorize email senders by adding them to appropriate Fastmail groups
- Create contacts and automatically assign to groups (Paper Trail, Feed, Firehose)
- Remove email addresses from groups
- Create new groups
- List all groups and get group members

## API Endpoints

### Add Email to Group
```
POST /api/groups/members
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json

{
  "email": "user@example.com",
  "groupName": "My Group"
}
```

### Remove Email from Group
```
DELETE /api/groups/members
Content-Type: application/json

{
  "email": "user@example.com",
  "groupName": "My Group"
}
```

### Create New Group
```
POST /api/groups
Content-Type: application/json

{
  "groupName": "New Group Name"
}
```

### Create Contact (with optional group association)
```
POST /api/contacts
Content-Type: application/json

{
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "organization": "Example Corp"
  },
  "groupName": "Paper Trail"
}
```

**Contact Fields (all optional but at least name or email required):**
- `firstName` - Contact's first name
- `lastName` - Contact's last name
- `fullName` - Full name (alternative to firstName/lastName)
- `email` - Email address
- `phone` - Phone number
- `organization` - Organization/company

**Group Association:**
- `groupName` - Optional group to add the contact to

### List All Groups
```
GET /api/groups
```

### Get Group Members
```
GET /api/groups/{groupName}/members
```

### Health Check
```
GET /health
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
CARDDAV_BASE_URL=https://carddav.fastmail.com
FASTMAIL_USERNAME=your-email@domain.com
FASTMAIL_PASSWORD=your-app-password
API_BEARER_TOKEN=your-secure-api-token
PORT=3000
NODE_ENV=development
```

## Setup

### Apple Shortcut Setup

1. Import the template shortcut:
   - Open `shortcut/Categorize Sender Template.shortcut` in the Shortcuts app
   - Configure the API endpoint URL (your deployed API or localhost for testing)
   - Set your API bearer token
   - Save the shortcut

2. Usage:
   - Use from share sheet in Mail.app or other email clients
   - Select sender's email to categorize
   - Choose appropriate category (Paper Trail, Feed, Firehose)

### API Development

1. Navigate to the API directory:
```bash
cd api
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment template:
```bash
cp .env.example .env
```

4. Edit `.env` with your Fastmail credentials

5. Start development server:
```bash
npm run dev
```

## API Deployment

### Fly.io Deployment

1. Navigate to the API directory:
```bash
cd api
```

2. Install flyctl:
```bash
curl -L https://fly.io/install.sh | sh
```

3. Login to Fly.io:
```bash
fly auth login
```

4. Launch the app:
```bash
fly launch
```

5. Set environment variables:
```bash
fly secrets set FASTMAIL_USERNAME=your-email@domain.com
fly secrets set FASTMAIL_PASSWORD=your-app-password
fly secrets set API_BEARER_TOKEN=your-secure-api-token
```

6. Deploy:
```bash
fly deploy
```

## Usage Examples

### Add email to "Paper Trail" group:
```bash
curl -X POST https://your-app.fly.dev/api/groups/members \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "newmember@example.com", "groupName": "Paper Trail"}'
```

### Remove email from group:
```bash
curl -X DELETE https://your-app.fly.dev/api/groups/members \
  -H "Content-Type: application/json" \
  -d '{"email": "member@example.com", "groupName": "Paper Trail"}'
```

### List all groups:
```bash
curl https://your-app.fly.dev/api/groups
```

### Create new group:
```bash
curl -X POST https://your-app.fly.dev/api/groups \
  -H "Content-Type: application/json" \
  -d '{"groupName": "My New Group"}'
```

### Create contact with group association:
```bash
curl -X POST https://your-app.fly.dev/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    },
    "groupName": "Paper Trail"
  }'
```

### Create contact without group:
```bash
curl -X POST https://your-app.fly.dev/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "fullName": "Jane Smith",
      "email": "jane@example.com"
    }
  }'
```

## Authentication

**API Authentication:**
All API endpoints (except `/health`) require a Bearer token in the Authorization header:
```
Authorization: Bearer YOUR_API_TOKEN
```

**Fastmail Authentication:**
The API uses your Fastmail credentials to authenticate with the CardDAV server. Make sure to use an app-specific password if you have 2FA enabled.

**Known Groups:**
The API has built-in support for these groups:
- Paper Trail
- Feed
- Firehose

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 400: Bad Request (invalid input)
- 404: Not Found (group or contact not found)
- 500: Internal Server Error

## Security Notes

- Always use environment variables for credentials
- Use HTTPS in production
- Consider rate limiting for production use
- Validate all inputs