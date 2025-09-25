# Categorize Sender Shortcut

This directory contains an Apple Shortcut for quickly categorizing email senders using the Fastmail Contacts API.

## What it does

The shortcut allows you to:
1. Select an email sender from the share sheet in Mail.app or other email clients
2. Choose a category (Paper Trail, Feed, Firehose)
3. Automatically add the sender to the appropriate Fastmail contact group via the API

## Setup Instructions

### Method 1: Import Template (Recommended)

1. Import the template shortcut file:
   - Double-click `Categorize Sender Template.shortcut` to open in Shortcuts app
   - Or drag the file into the Shortcuts app

2. Configure the shortcut:
   - Open the imported shortcut for editing
   - Find the "Get Contents of URL" action
   - Update the URL to point to your API endpoint:
     - Development: `http://localhost:3000/api/groups/members`
     - Production: `https://your-app.fly.dev/api/groups/members`
   - Find the "Authorization" header
   - Replace `YOUR_API_TOKEN_HERE` with your actual API bearer token

3. Save the shortcut

### Method 2: Manual Creation

If you prefer to create the shortcut from scratch:

1. **Create New Shortcut**
   - Open Shortcuts app
   - Tap "+" to create new shortcut
   - Name it "Categorize Sender"

2. **Add Actions in Order:**

   a. **Get Text from Input**
      - Action: "Get Text from Input"
      - This receives the shared email content

   b. **Get Email Addresses from Input**
      - Action: "Get Email Addresses from Input"
      - Input: Output from previous step

   c. **Choose from Menu**
      - Action: "Choose from Menu"
      - Options: "Paper Trail", "Feed", "Firehose"
      - For each option, add the following actions:

   d. **Get Contents of URL** (for each menu choice)
      - Action: "Get Contents of URL"
      - URL: `https://your-api-endpoint.com/api/groups/members`
      - Method: POST
      - Headers:
        - `Authorization`: `Bearer YOUR_API_TOKEN`
        - `Content-Type`: `application/json`
      - Request Body: JSON
        ```json
        {
          "email": [Email from step b],
          "groupName": "[Selected Group Name]"
        }
        ```

   e. **Show Result**
      - Action: "Show Result"
      - Text: "Added [email] to [group name]"

3. **Enable Share Sheet**
   - Tap the settings icon
   - Enable "Use with Share Sheet"
   - Under "Share Sheet Types", enable "Text"

## Usage

1. In Mail.app (or other email client), select an email
2. Tap the share button
3. Select "Categorize Sender" from the share sheet
4. Choose the appropriate category
5. The sender will be automatically added to your Fastmail contact group

## Configuration Variables

When setting up the shortcut, replace these placeholders:

- `YOUR_API_TOKEN_HERE`: Your API bearer token
- `your-api-endpoint.com`: Your deployed API domain (or localhost:3000 for development)

## Troubleshooting

- **"No network connection" error**: Check your API endpoint URL
- **"Unauthorized" error**: Verify your bearer token is correct
- **"Bad Request" error**: Check that the email was properly extracted from the shared content

## Files

- `Categorize Sender Template.shortcut`: Binary template file (import this)
- `README.md`: This documentation file

## Contributing

To contribute improvements to this shortcut:

1. Make changes in the Shortcuts app
2. Export the updated shortcut
3. Replace the template file
4. Update this README if the setup process changes