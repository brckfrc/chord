# Chord Demo Scenario

> **Purpose:** Complete step-by-step demo scenario covering all major features of Chord from login to advanced features like voice chat, DMs, and file uploads.

This document provides a comprehensive walkthrough of Chord's features in a logical user journey format. Use this as both a testing guide and a showcase document for the application.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Guild Creation & Management](#guild-creation--management)
5. [Real-Time Messaging](#real-time-messaging)
6. [Voice & Video Chat](#voice--video-chat)
7. [Direct Messages & Friends](#direct-messages--friends)
8. [File Sharing](#file-sharing)
9. [Advanced Features](#advanced-features)

---

## Introduction

This demo scenario demonstrates all major features of Chord in approximately 50 minutes. The scenario follows a natural user journey from account creation through advanced features like voice chat, direct messages, and file sharing.

**Estimated Time:** 50 minutes total

- Getting Started: 5 min
- Guild Creation & Management: 10 min
- Real-Time Messaging: 10 min
- Voice & Video Chat: 5 min
- Direct Messages & Friends: 10 min
- File Sharing: 5 min
- Advanced Features: 5 min

---

## Prerequisites

Before starting the demo, ensure the following:

### Required Setup

1. **Services Running**
   - All Docker services started (`./start-dev.sh` or `docker compose up -d`)
   - Backend API accessible at `http://localhost:5049`
   - Frontend accessible at `http://localhost:5173`
   - SignalR WebSocket connection working
   - LiveKit server running (for voice chat)

2. **Test Accounts**
   - At least 2 user accounts (can register during demo or pre-create)
   - One account should have guild owner permissions

3. **Test Files**
   - Sample image file (JPG/PNG, < 25MB)
   - Sample video file (MP4, < 25MB)
   - Sample document file (PDF/DOCX, < 25MB)

4. **Browser Requirements**
   - Modern browser (Chrome, Firefox, Edge, Safari)
   - Microphone and camera access (for voice/video features)
   - JavaScript enabled

### Verification

```bash
# Check services are running
docker compose ps

# Check backend health
curl http://localhost:5049/health

# Check frontend
curl http://localhost:5173
```

---

## Getting Started

**Duration:** 5 minutes

### Step 1: Register New Account

1. Navigate to `http://localhost:5173` (or your frontend URL)
2. Click "Register" or navigate to registration page
3. Fill in registration form:
   - Username: `demo_user_1`
   - Email: `demo1@example.com`
   - Password: `SecurePassword123!`
4. Click "Register"
5. **Expected Result:** Account created, redirected to login page or automatically logged in

[Screenshot: Registration Page]

### Step 2: Login

1. If not automatically logged in, navigate to login page
2. Enter credentials:
   - Email: `demo1@example.com`
   - Password: `SecurePassword123!`
3. Click "Login"
4. **Expected Result:** Successfully logged in, redirected to home page/main interface

[Screenshot: Login Page]

### Step 3: Navigate Home Page

1. After login, observe the main interface:
   - Left sidebar: Guild list (empty initially)
   - Center: Welcome message or empty state
   - Right sidebar: User profile/status
2. **Expected Result:** Clean interface with empty guild list, ready to create or join a guild

[Screenshot: Home Page - Empty State]

**Technical Note:** Login creates a JWT token stored in localStorage. SignalR connection is established automatically after successful authentication.

---

## Guild Creation & Management

**Duration:** 10 minutes

### Step 4: Create a New Guild

1. Click "Create Guild" button (usually a "+" icon in guild list)
2. Enter guild details:
   - Name: `Demo Guild`
   - Optional: Upload guild icon
3. Click "Create"
4. **Expected Result:** New guild appears in guild list, automatically selected

[Screenshot: Create Guild Dialog]

[Screenshot: Guild List with New Guild]

### Step 5: Create Text Channel

1. In the guild, right-click on channel list or click "Create Channel"
2. Select "Text Channel"
3. Enter channel name: `general`
4. Click "Create"
5. **Expected Result:** New text channel appears in channel list, automatically selected

[Screenshot: Create Channel Dialog]

[Screenshot: Guild with Text Channel]

### Step 6: Create Voice Channel

1. Right-click on channel list or click "Create Channel"
2. Select "Voice Channel"
3. Enter channel name: `Voice Chat`
4. Click "Create"
5. **Expected Result:** New voice channel appears in channel list with voice icon indicator

[Screenshot: Voice Channel in List]

### Step 7: Generate Invite Link

1. Right-click on guild name or navigate to guild settings
2. Click "Invite People" or "Create Invite"
3. Copy the generated invite link (e.g., `https://your-domain.com/invite/abc123xyz`)
4. **Expected Result:** Invite link generated and copied to clipboard

[Screenshot: Invite Dialog with Link]

**Technical Note:** Invite links are unique tokens stored in the database with expiration dates and usage limits.

### Step 8: Invite Another User

1. Open invite link in a new browser window (or use incognito mode)
2. If not logged in, register a second account:
   - Username: `demo_user_2`
   - Email: `demo2@example.com`
   - Password: `SecurePassword123!`
3. Accept the invite and join the guild
4. **Expected Result:** Second user appears in guild member list

[Screenshot: Invite Acceptance Page]

[Screenshot: Guild Members List with Both Users]

### Step 9: View Guild Settings

1. Right-click on guild name, select "Server Settings"
2. Navigate through settings tabs:
   - Overview: Guild name, icon, region
   - Members: List of all members with roles
   - Roles: Role management (if you're owner)
   - Audit Logs: History of guild actions (owner-only)
3. **Expected Result:** Settings panel opens, showing guild configuration options

[Screenshot: Guild Settings - Overview]

[Screenshot: Guild Settings - Members]

[Screenshot: Guild Settings - Audit Logs]

---

## Real-Time Messaging

**Duration:** 10 minutes

### Step 10: Send a Message

1. Select the `general` text channel
2. Type a message in the message input box: `Hello, this is my first message!`
3. Press Enter or click Send
4. **Expected Result:** Message appears in channel immediately

[Screenshot: Message Input and Sent Message]

**Technical Note:** Message is sent via SignalR `SendMessage` hub method. Real-time updates are broadcast to all connected clients in the channel.

### Step 11: Edit a Message

1. Hover over your sent message
2. Click the edit icon (pencil) or right-click and select "Edit"
3. Modify the message text: `Hello, this is my first message! (edited)`
4. Press Enter or click Save
5. **Expected Result:** Message is updated, shows "(edited)" indicator

[Screenshot: Message Edit Interface]

[Screenshot: Edited Message with Indicator]

### Step 12: Delete a Message

1. Hover over a message you sent
2. Click the delete icon (trash) or right-click and select "Delete"
3. Confirm deletion
4. **Expected Result:** Message is removed from channel

[Screenshot: Delete Confirmation Dialog]

### Step 13: Add Reaction

1. Hover over any message
2. Click the reaction icon (emoji button) or right-click and select "Add Reaction"
3. Select an emoji (e.g., 👍)
4. **Expected Result:** Reaction appears below message, shows count and users who reacted

[Screenshot: Reaction Picker]

[Screenshot: Message with Reactions]

### Step 14: Pin a Message

1. Right-click on an important message
2. Select "Pin Message"
3. Confirm pinning
4. **Expected Result:** Message is pinned, pin icon appears in channel header

[Screenshot: Pin Confirmation]

[Screenshot: Pinned Messages Panel]

### Step 15: Use @Mentions

1. Type a message with @mention: `Hey @demo_user_2, check this out!`
2. Select the user from the mention autocomplete dropdown
3. Send the message
4. **Expected Result:** Message sent with mention, mentioned user receives notification

[Screenshot: Mention Autocomplete]

[Screenshot: Message with Mention Highlight]

### Step 16: View Typing Indicators

1. Have the second user start typing in the same channel (without sending)
2. **Expected Result:** Typing indicator appears showing "demo_user_2 is typing..."

[Screenshot: Typing Indicator]

**Technical Note:** Typing indicators are broadcast via SignalR `UserTyping` event, automatically cleared after 3 seconds of inactivity.

---

## Voice & Video Chat

**Duration:** 5 minutes

### Step 17: Join Voice Channel

1. Click on the "Voice Chat" voice channel
2. **Expected Result:** Voice channel interface opens, connection to LiveKit server established

[Screenshot: Voice Channel Interface]

**Technical Note:** Frontend connects to LiveKit SFU via WebRTC. Audio/video tracks are published to the room.

### Step 18: Toggle Mute

1. Click the microphone mute button
2. **Expected Result:** Microphone muted, mute icon changes, other users see muted indicator

[Screenshot: Muted State]

3. Click again to unmute
4. **Expected Result:** Microphone active, mute icon returns to normal

### Step 19: Toggle Deafen

1. Click the headphone deafen button
2. **Expected Result:** Audio output muted, deafen icon changes, microphone also auto-muted

[Screenshot: Deafened State]

3. Click again to undeafen
4. **Expected Result:** Audio output restored, microphone unmuted

### Step 20: Enable Camera (Optional)

1. Click the camera button to enable video
2. Grant camera permissions if prompted
3. **Expected Result:** Video stream appears in your video panel, other users can see your video

[Screenshot: Video Enabled]

**Note:** Camera feature requires browser permissions and working camera hardware.

### Step 21: See Speaking Indicators

1. Have the second user join the voice channel and speak
2. **Expected Result:** Speaking indicator (green border/glow) appears around the speaking user's avatar

[Screenshot: Speaking Indicators]

**Technical Note:** Speaking indicators are based on audio level detection from LiveKit's audio track analysis.

### Step 22: Leave Voice Channel

1. Click "Leave Voice Channel" or disconnect button
2. **Expected Result:** Disconnected from voice channel, returned to text channel view

[Screenshot: Leave Voice Channel Confirmation]

---

## Direct Messages & Friends

**Duration:** 10 minutes

### Step 23: Send Friend Request

1. Click on the second user's profile or username
2. Click "Add Friend" or "Send Friend Request"
3. **Expected Result:** Friend request sent, pending status shown

[Screenshot: Add Friend Button]

[Screenshot: Friend Request Sent]

### Step 24: Accept Friend Request (Second User)

1. Switch to second user's account
2. Navigate to Friends/DMs section
3. See pending friend request from first user
4. Click "Accept"
5. **Expected Result:** Users are now friends, can start DM conversation

[Screenshot: Pending Friend Request]

[Screenshot: Friend Request Accepted]

### Step 25: Start DM Conversation

1. In the first user's account, navigate to DMs section
2. Click on the second user's name (now in friends list)
3. **Expected Result:** DM conversation opens, empty message history

[Screenshot: DM Conversation Interface]

### Step 26: Send DM Message

1. Type a message in DM input: `Hey! This is a direct message.`
2. Press Enter or click Send
3. **Expected Result:** Message appears in DM conversation

[Screenshot: DM Message Sent]

**Technical Note:** DMs use the same SignalR infrastructure but are scoped to the two participants only.

### Step 27: View Unread DM Count

1. Have the second user send a message in the DM
2. Switch back to first user's account (or have first user navigate away)
3. **Expected Result:** Unread count badge appears on DM icon or user name

[Screenshot: Unread DM Badge]

### Step 28: Mark DM as Read

1. Open the DM conversation with unread messages
2. **Expected Result:** Unread count clears, messages marked as read

[Screenshot: DM Read State]

---

## File Sharing

**Duration:** 5 minutes

### Step 29: Upload Image Attachment

1. In a text channel or DM, click the attachment/upload button
2. Select an image file (JPG, PNG, < 25MB)
3. **Expected Result:** File uploads, progress indicator shown, image appears in message when complete

[Screenshot: File Upload Dialog]

[Screenshot: Image Upload Progress]

[Screenshot: Message with Image Attachment]

**Technical Note:** Files are uploaded to MinIO (S3-compatible storage), URLs are stored in message attachments.

### Step 30: Upload Video Attachment

1. Click attachment button again
2. Select a video file (MP4, < 25MB)
3. **Expected Result:** Video uploads, video player appears in message

[Screenshot: Message with Video Attachment]

### Step 31: Upload Document Attachment

1. Click attachment button
2. Select a document file (PDF, DOCX, < 25MB)
3. **Expected Result:** Document uploads, download link appears in message

[Screenshot: Message with Document Attachment]

### Step 32: View Attachments in Message List

1. Scroll through message history
2. **Expected Result:** All attachments (images, videos, documents) are visible and accessible

[Screenshot: Message List with Various Attachments]

**Technical Note:** Attachments are stored with metadata (filename, size, MIME type) and served via presigned URLs from MinIO.

---

## Advanced Features

**Duration:** 5 minutes

### Step 33: Change User Status

1. Click on your user profile/avatar
2. Select status from dropdown:
   - Online (green)
   - Idle (yellow)
   - Do Not Disturb / DND (red)
   - Invisible (gray)
3. **Expected Result:** Status icon updates, other users see your new status

[Screenshot: Status Selection Menu]

[Screenshot: Status Indicators in UI]

**Technical Note:** Status is broadcast via SignalR PresenceHub to all connected clients.

### Step 34: View Unread Message Counts

1. Navigate between channels with unread messages
2. **Expected Result:** Unread count badges appear on channels with unread messages

[Screenshot: Unread Count Badges on Channels]

### Step 35: Check Mentions Panel

1. Click on mentions/notifications icon
2. **Expected Result:** Panel opens showing all messages where you were @mentioned

[Screenshot: Mentions Panel]

### Step 36: View Audit Logs (Guild Owner)

1. As guild owner, navigate to Guild Settings → Audit Logs
2. **Expected Result:** List of guild actions appears (channel creation, member joins, role changes, etc.)

[Screenshot: Audit Logs Panel]

**Technical Note:** Audit logs are paginated and only visible to guild owners. They track all significant guild actions with timestamps and user information.

### Step 37: Test Role-Based Permissions (Optional)

1. Create a new role in Guild Settings → Roles
2. Assign specific permissions (e.g., "Manage Channels", "Send Messages")
3. Assign role to a user
4. Test that permissions are enforced (e.g., user without "Manage Channels" cannot create channels)
5. **Expected Result:** Permissions work as configured

[Screenshot: Role Creation Dialog]

[Screenshot: Permission Settings]

---

## Demo Completion Checklist

After completing all steps, verify:

- [ ] Account registration and login working
- [ ] Guild creation and channel management functional
- [ ] Real-time messaging with SignalR working
- [ ] Message editing, deletion, reactions, pinning all work
- [ ] Voice channel connection and audio working
- [ ] Mute/deafen controls functional
- [ ] Speaking indicators visible
- [ ] Friend requests and acceptance working
- [ ] DM conversations functional
- [ ] Unread tracking working for DMs and channels
- [ ] File uploads (images, videos, documents) working
- [ ] Attachments display correctly
- [ ] User status changes working
- [ ] Mentions panel functional
- [ ] Audit logs accessible (for owners)
- [ ] All real-time updates working across multiple browser windows

---

## Troubleshooting

### SignalR Connection Issues

- Check browser console for WebSocket errors
- Verify backend is running and SignalR hub is accessible
- Check CORS settings if accessing from different domain

### Voice Chat Not Working

- Verify LiveKit server is running
- Check browser console for WebRTC errors
- Ensure microphone/camera permissions are granted
- Check STUN/TURN server configuration (Coturn)

### File Upload Fails

- Verify MinIO service is running
- Check file size (must be < 25MB)
- Check browser console for upload errors
- Verify MinIO credentials in backend configuration

### Real-Time Updates Not Appearing

- Check SignalR connection status
- Verify you're subscribed to the correct channel/guild
- Check browser console for SignalR errors
- Refresh page and reconnect

---

## Technical Reference

### SignalR Hubs

- **ChatHub**: Handles real-time messaging, typing indicators, message reactions
- **PresenceHub**: Handles user presence (online/offline/status), guild member updates

### API Endpoints Used

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/guilds` - Create guild
- `POST /api/channels` - Create channel
- `POST /api/messages` - Send message
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/accept` - Accept friend request
- `POST /api/files/upload` - Upload file attachment

### Real-Time Events

- `MessageReceived` - New message in channel/DM
- `MessageUpdated` - Message edited
- `MessageDeleted` - Message removed
- `UserTyping` - User typing indicator
- `UserJoined` - User joined guild/channel
- `UserLeft` - User left guild/channel
- `PresenceUpdated` - User status changed

---

## Next Steps

After completing this demo:

1. Explore additional features not covered (e.g., role permissions, channel categories)
2. Test with multiple users simultaneously
3. Test edge cases (e.g., network disconnection, reconnection)
4. Review backend logs for any errors
5. Check frontend console for warnings or errors
6. Test on different browsers and devices

---

**Document Version:** 1.0  
**Last Updated:** 2024
