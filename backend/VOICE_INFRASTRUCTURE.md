# 🔊 Voice Channel Infrastructure

## Overview

Voice channel presence infrastructure has been implemented in **Phase 3**, enabling real-time tracking of users in voice channels. This is **separate from WebRTC audio streaming** (which will be added in Phase 8).

---

## 🎯 Purpose

### What This IS:
- **Presence tracking**: Shows who's in which voice channel
- **State management**: Tracks mute/deafen status
- **Real-time updates**: Broadcasts join/leave/state changes
- **Foundation for WebRTC**: Prepares the groundwork for Phase 8 audio streaming

### What This is NOT (Yet):
- ❌ Actual audio streaming (WebRTC - Phase 8)
- ❌ STUN/TURN server integration (Phase 8)
- ❌ Peer-to-peer audio connections (Phase 8)

---

## 🏗️ Architecture

### Key Concepts

| Concept | Hub/Method | Purpose | Visible to Others? |
|---------|------------|---------|-------------------|
| **Global Online** | `PresenceHub.OnConnectedAsync` | User is online in the app | Yes (all guild members) |
| **Text Subscription** | `ChatHub.JoinChannel` | Receive messages from a text channel | No (internal) |
| **Voice Presence** | `ChatHub.JoinVoiceChannel` | Show as active in voice channel | Yes (everyone viewing channel) |

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│  USER OPENS APP                                             │
│  ↓                                                           │
│  PresenceHub.OnConnectedAsync()                             │
│  ✅ User is ONLINE globally                                 │
│  📢 Broadcast: "UserOnline" to all guild members            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  USER NAVIGATES TO TEXT CHANNEL                             │
│  ↓                                                           │
│  ChatHub.JoinChannel(channelId)                             │
│  ✅ User subscribes to messages                             │
│  🔕 NO broadcast (internal operation)                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  USER CLICKS "JOIN VOICE" BUTTON                            │
│  ↓                                                           │
│  ChatHub.JoinVoiceChannel(channelId)                        │
│  ✅ User shows in voice channel participant list            │
│  📢 Broadcast: "UserJoinedVoiceChannel" to everyone         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 SignalR Methods

### Server Methods (Client → Server)

#### `JoinVoiceChannel(channelId: string)`
Join a voice channel to show as an active participant.

**What happens:**
1. User is added to SignalR group `voice_{channelId}`
2. Event `UserJoinedVoiceChannel` is broadcast to all users viewing the channel
3. Caller receives confirmation: `JoinedVoiceChannel`

**Frontend usage:**
```javascript
await chatHub.invoke("JoinVoiceChannel", "voice-channel-guid");
// User now appears in voice channel participant list
```

---

#### `LeaveVoiceChannel(channelId: string)`
Leave a voice channel.

**What happens:**
1. User is removed from SignalR group `voice_{channelId}`
2. Event `UserLeftVoiceChannel` is broadcast
3. Caller receives confirmation: `LeftVoiceChannel`

**Frontend usage:**
```javascript
await chatHub.invoke("LeaveVoiceChannel", "voice-channel-guid");
// User removed from participant list
```

---

#### `UpdateVoiceState(channelId: string, isMuted: boolean, isDeafened: boolean)`
Update microphone mute/deafen status.

**What happens:**
1. Event `UserVoiceStateChanged` is broadcast to all in the channel
2. No state is stored in backend (frontend tracks it)

**Frontend usage:**
```javascript
// Mute microphone
await chatHub.invoke("UpdateVoiceState", channelId, true, false);

// Deafen (mute input + output)
await chatHub.invoke("UpdateVoiceState", channelId, true, true);

// Unmute all
await chatHub.invoke("UpdateVoiceState", channelId, false, false);
```

---

#### `GetVoiceChannelUsers(channelId: string)`
Get currently active users in a voice channel.

**Returns:** Empty array (frontend tracks participants via events)

**Note:** In production, this would query Redis for active participants. For now, frontend maintains state based on join/leave events.

---

### Client Events (Server → Client)

#### `UserJoinedVoiceChannel`
```typescript
{
  userId: string;
  username: string;
  displayName: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}
```

**Frontend handling:**
```javascript
chatHub.on("UserJoinedVoiceChannel", (data) => {
  // Add user to voice channel participant list
  voiceParticipants.push({
    userId: data.userId,
    displayName: data.displayName,
    isMuted: data.isMuted,
    isDeafened: data.isDeafened
  });
  
  // Update UI
  renderVoiceParticipants();
});
```

---

#### `UserLeftVoiceChannel`
```typescript
{
  userId: string;
  channelId: string;
}
```

**Frontend handling:**
```javascript
chatHub.on("UserLeftVoiceChannel", ({ userId, channelId }) => {
  // Remove user from participant list
  voiceParticipants = voiceParticipants.filter(p => p.userId !== userId);
  
  // Update UI
  renderVoiceParticipants();
});
```

---

#### `UserVoiceStateChanged`
```typescript
{
  userId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}
```

**Frontend handling:**
```javascript
chatHub.on("UserVoiceStateChanged", ({ userId, isMuted, isDeafened }) => {
  // Update participant state
  const participant = voiceParticipants.find(p => p.userId === userId);
  if (participant) {
    participant.isMuted = isMuted;
    participant.isDeafened = isDeafened;
  }
  
  // Update UI (show/hide mute/deafen icons)
  renderVoiceParticipants();
});
```

---

## 🎨 Frontend Integration Example

### State Management

```typescript
interface VoiceParticipant {
  userId: string;
  username: string;
  displayName: string;
  isMuted: boolean;
  isDeafened: boolean;
}

const voiceParticipants = ref<VoiceParticipant[]>([]);
const currentVoiceChannel = ref<string | null>(null);
```

### Join Voice Channel

```typescript
async function joinVoiceChannel(channelId: string) {
  try {
    // 1. Join via SignalR
    await chatHub.invoke("JoinVoiceChannel", channelId);
    
    // 2. Update local state
    currentVoiceChannel.value = channelId;
    
    // 3. Initialize WebRTC (Phase 8)
    // await initWebRTC(channelId);
    
    console.log("✅ Joined voice channel");
  } catch (error) {
    console.error("❌ Failed to join voice:", error);
  }
}
```

### Leave Voice Channel

```typescript
async function leaveVoiceChannel() {
  if (!currentVoiceChannel.value) return;
  
  try {
    // 1. Leave via SignalR
    await chatHub.invoke("LeaveVoiceChannel", currentVoiceChannel.value);
    
    // 2. Cleanup WebRTC (Phase 8)
    // await cleanupWebRTC();
    
    // 3. Clear local state
    currentVoiceChannel.value = null;
    voiceParticipants.value = [];
    
    console.log("✅ Left voice channel");
  } catch (error) {
    console.error("❌ Failed to leave voice:", error);
  }
}
```

### Toggle Mute

```typescript
const isMuted = ref(false);
const isDeafened = ref(false);

async function toggleMute() {
  if (!currentVoiceChannel.value) return;
  
  isMuted.value = !isMuted.value;
  
  // 1. Update SignalR state
  await chatHub.invoke(
    "UpdateVoiceState",
    currentVoiceChannel.value,
    isMuted.value,
    isDeafened.value
  );
  
  // 2. Mute/unmute local audio track (Phase 8)
  // localAudioTrack.enabled = !isMuted.value;
}
```

---

## 🔄 Event Flow Example

### Scenario: User joins voice channel

```
┌─────────────────────────────────────────────────────────────┐
│  USER A (Frontend)                                          │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ chatHub.invoke("JoinVoiceChannel", "voice-1")
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  ChatHub (Backend)                                          │
│  1. Add connection to group "voice_voice-1"                 │
│  2. Log: "User joined voice channel"                        │
│  3. Broadcast to group "voice_voice-1":                     │
│     UserJoinedVoiceChannel({                                │
│       userId: "user-a-guid",                                │
│       username: "userA",                                     │
│       displayName: "User A",                                │
│       channelId: "voice-1",                                 │
│       isMuted: false,                                        │
│       isDeafened: false                                      │
│     })                                                       │
│  4. Send to caller: JoinedVoiceChannel("voice-1")           │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ Events broadcast
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  ALL USERS VIEWING VOICE-1                                  │
│  - User A (self)                                            │
│  - User B (already in voice)                                │
│  - User C (viewing but not joined)                          │
│                                                              │
│  🔔 All receive: UserJoinedVoiceChannel                     │
│  📋 Update participant list: [User A, User B]               │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Differences: Text vs Voice

| Feature | Text Channel (`JoinChannel`) | Voice Channel (`JoinVoiceChannel`) |
|---------|------------------------------|-----------------------------------|
| **Purpose** | Subscribe to messages | Show as active participant |
| **Visibility** | Hidden (internal) | Visible to all (participant list) |
| **Trigger** | Navigate to channel | Click "Join Voice" button |
| **Auto-leave** | On channel switch | Manual leave only |
| **Broadcast** | No | Yes (UserJoinedVoiceChannel) |
| **State** | None | Mute/deafen status |
| **Multiple?** | One at a time | One voice + any text |

---

## 🚀 Phase 8: WebRTC Integration (Future)

The current infrastructure prepares for WebRTC by:

1. ✅ Tracking who's in which voice channel
2. ✅ Managing mute/deafen state
3. ✅ Broadcasting join/leave events
4. ✅ Group-based SignalR routing (`voice_{channelId}`)

**What Phase 8 will add:**
- 🔜 STUN/TURN server (Coturn Docker container)
- 🔜 RtcSignalingHub for WebRTC signaling (offer/answer/ICE)
- 🔜 P2P audio connections (RTCPeerConnection)
- 🔜 Audio stream management (getUserMedia, MediaStream)
- 🔜 Actual microphone capture and playback

**Integration point:**
```javascript
// Phase 3 (Current)
await chatHub.invoke("JoinVoiceChannel", channelId);
// ✅ User visible in participant list

// Phase 8 (Future)
await initWebRTC(channelId);
// ✅ Establish P2P audio connection
// ✅ Start sending/receiving audio
```

---

## 📝 Testing Voice Infrastructure

### Browser Console Test

```javascript
// 1. Setup (already done in previous tests)
const chatHub = /* ... */;
await chatHub.start();

// 2. Setup event listeners
chatHub.on("UserJoinedVoiceChannel", (data) => {
  console.log("🔊 User joined:", data.displayName);
});

chatHub.on("UserLeftVoiceChannel", ({ userId }) => {
  console.log("🔇 User left:", userId);
});

chatHub.on("UserVoiceStateChanged", ({ userId, isMuted, isDeafened }) => {
  console.log(`🎙️ State changed: ${userId}`, { isMuted, isDeafened });
});

chatHub.on("JoinedVoiceChannel", (channelId) => {
  console.log("✅ You joined voice:", channelId);
});

// 3. Join a voice channel
const voiceChannelId = "your-voice-channel-guid";
await chatHub.invoke("JoinVoiceChannel", voiceChannelId);
// Expected: "✅ You joined voice: ..."
// Expected: "🔊 User joined: <your-display-name>"

// 4. Toggle mute
await chatHub.invoke("UpdateVoiceState", voiceChannelId, true, false);
// Expected: "🎙️ State changed: ... { isMuted: true, isDeafened: false }"

// 5. Leave voice channel
await chatHub.invoke("LeaveVoiceChannel", voiceChannelId);
// Expected: "🔇 User left: <your-user-id>"
```

---

## 🎯 Summary

✅ **Completed in Phase 3:**
- Voice channel presence tracking
- Mute/deafen state management
- Real-time join/leave/state change events
- SignalR group-based routing
- Comprehensive documentation

🔜 **Coming in Phase 8:**
- WebRTC audio streaming
- STUN/TURN server
- P2P audio connections
- Actual voice chat functionality

**Current Status:** Backend infrastructure is **100% ready** for Phase 8 WebRTC integration. Frontend can now:
1. Show voice channel participant lists
2. Display mute/deafen status
3. Handle join/leave UI
4. Track voice presence state

When Phase 8 arrives, WebRTC audio will be layered on top of this existing infrastructure without breaking changes.

