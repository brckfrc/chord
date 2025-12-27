import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"

export interface VoiceUser {
  userId: string
  username: string
  displayName: string
  avatarUrl?: string
  isMuted: boolean
  isDeafened: boolean
  isSpeaking: boolean
  isVideoEnabled: boolean
}

export interface LiveKitParticipant {
  identity: string
  name: string
  isSpeaking: boolean
  isMuted: boolean
  isVideoEnabled: boolean
  connectionQuality: "excellent" | "good" | "poor" | "unknown"
}

export type VoiceConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting"

interface VoiceState {
  // Current voice channel
  currentChannelId: string | null
  currentGuildId: string | null

  // Users in the voice channel (from SignalR)
  usersInChannel: VoiceUser[]

  // Local user state
  isMuted: boolean
  isDeafened: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean

  // LiveKit connection state
  liveKitToken: string | null
  liveKitUrl: string | null
  roomName: string | null
  connectionState: VoiceConnectionState

  // LiveKit participants (real-time from LiveKit)
  participants: LiveKitParticipant[]
  speakingParticipants: string[] // participant identities

  // Local audio/video track state
  localAudioEnabled: boolean
  localVideoEnabled: boolean

  // Error state
  error: string | null
}

const initialState: VoiceState = {
  currentChannelId: null,
  currentGuildId: null,
  usersInChannel: [],
  isMuted: false,
  isDeafened: false,
  isVideoEnabled: false,
  isScreenSharing: false,
  liveKitToken: null,
  liveKitUrl: null,
  roomName: null,
  connectionState: "disconnected",
  participants: [],
  speakingParticipants: [],
  localAudioEnabled: true,
  localVideoEnabled: false,
  error: null,
}

const voiceSlice = createSlice({
  name: "voice",
  initialState,
  reducers: {
    // Join voice channel - set initial state
    joinVoiceChannel: (
      state,
      action: PayloadAction<{
        channelId: string
        guildId: string
        liveKitToken: string
        liveKitUrl: string
        roomName: string
      }>
    ) => {
      state.currentChannelId = action.payload.channelId
      state.currentGuildId = action.payload.guildId
      state.liveKitToken = action.payload.liveKitToken
      state.liveKitUrl = action.payload.liveKitUrl
      state.roomName = action.payload.roomName
      state.connectionState = "connecting"
      state.error = null
    },

    // Leave voice channel - reset state
    leaveVoiceChannel: (state) => {
      state.currentChannelId = null
      state.currentGuildId = null
      state.usersInChannel = []
      state.liveKitToken = null
      state.liveKitUrl = null
      state.roomName = null
      state.connectionState = "disconnected"
      state.participants = []
      state.speakingParticipants = []
      state.isMuted = false
      state.isDeafened = false
      state.isVideoEnabled = false
      state.isScreenSharing = false
      state.localAudioEnabled = true
      state.localVideoEnabled = false
      state.error = null
    },

    // Connection state changes
    setConnectionState: (state, action: PayloadAction<VoiceConnectionState>) => {
      state.connectionState = action.payload
    },

    // User joined voice channel (from SignalR)
    userJoinedVoice: (state, action: PayloadAction<VoiceUser>) => {
      const exists = state.usersInChannel.find((u) => u.userId === action.payload.userId)
      if (!exists) {
        state.usersInChannel.push(action.payload)
      }
    },

    // User left voice channel (from SignalR)
    userLeftVoice: (state, action: PayloadAction<string>) => {
      state.usersInChannel = state.usersInChannel.filter((u) => u.userId !== action.payload)
    },

    // User voice state changed (mute/deafen) from SignalR
    userVoiceStateChanged: (
      state,
      action: PayloadAction<{ userId: string; isMuted: boolean; isDeafened: boolean }>
    ) => {
      const user = state.usersInChannel.find((u) => u.userId === action.payload.userId)
      if (user) {
        user.isMuted = action.payload.isMuted
        user.isDeafened = action.payload.isDeafened
      }
    },

    // Local mute toggle
    toggleMute: (state) => {
      state.isMuted = !state.isMuted
      state.localAudioEnabled = !state.isMuted
    },

    // Local deafen toggle
    toggleDeafen: (state) => {
      state.isDeafened = !state.isDeafened
      // Deafening also mutes
      if (state.isDeafened) {
        state.isMuted = true
        state.localAudioEnabled = false
      }
    },

    // Local video toggle
    toggleVideo: (state) => {
      state.isVideoEnabled = !state.isVideoEnabled
      state.localVideoEnabled = state.isVideoEnabled
    },

    // Set mute state directly
    setMuted: (state, action: PayloadAction<boolean>) => {
      state.isMuted = action.payload
      state.localAudioEnabled = !action.payload
    },

    // Set video state directly
    setVideoEnabled: (state, action: PayloadAction<boolean>) => {
      state.isVideoEnabled = action.payload
      state.localVideoEnabled = action.payload
    },

    // Update participants from LiveKit
    setParticipants: (state, action: PayloadAction<LiveKitParticipant[]>) => {
      state.participants = action.payload
    },

    // Update speaking participants
    setSpeakingParticipants: (state, action: PayloadAction<string[]>) => {
      state.speakingParticipants = action.payload
      // Update speaking state in usersInChannel
      state.usersInChannel.forEach((user) => {
        user.isSpeaking = action.payload.includes(user.userId)
      })
    },

    // Participant started speaking
    participantStartedSpeaking: (state, action: PayloadAction<string>) => {
      if (!state.speakingParticipants.includes(action.payload)) {
        state.speakingParticipants.push(action.payload)
      }
      const user = state.usersInChannel.find((u) => u.userId === action.payload)
      if (user) {
        user.isSpeaking = true
      }
    },

    // Participant stopped speaking
    participantStoppedSpeaking: (state, action: PayloadAction<string>) => {
      state.speakingParticipants = state.speakingParticipants.filter((id) => id !== action.payload)
      const user = state.usersInChannel.find((u) => u.userId === action.payload)
      if (user) {
        user.isSpeaking = false
      }
    },

    // Set error
    setVoiceError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },

    // Clear voice channel users (when switching channels)
    clearVoiceUsers: (state) => {
      state.usersInChannel = []
      state.participants = []
      state.speakingParticipants = []
    },
  },
})

export const {
  joinVoiceChannel,
  leaveVoiceChannel,
  setConnectionState,
  userJoinedVoice,
  userLeftVoice,
  userVoiceStateChanged,
  toggleMute,
  toggleDeafen,
  toggleVideo,
  setMuted,
  setVideoEnabled,
  setParticipants,
  setSpeakingParticipants,
  participantStartedSpeaking,
  participantStoppedSpeaking,
  setVoiceError,
  clearVoiceUsers,
} = voiceSlice.actions

export default voiceSlice.reducer

