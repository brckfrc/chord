import { useCallback, useSyncExternalStore } from "react";
import {
  Room,
  RoomEvent,
  ConnectionState,
  ConnectionQuality,
  LocalParticipant,
  RemoteParticipant,
  Track,
  LocalTrack,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from "livekit-client";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setConnectionState,
  setParticipants,
  participantStartedSpeaking,
  setVoiceError,
  leaveVoiceChannel,
  type LiveKitParticipant,
  type VoiceConnectionState,
} from "@/store/slices/voiceSlice";

interface UseLiveKitReturn {
  room: Room | null;
  connectionState: VoiceConnectionState;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isSpeaking: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  toggleMicrophone: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
}

// Singleton state for shared room instance across all components
interface LiveKitState {
  room: Room | null;
  localParticipant: LocalParticipant | null;
  remoteParticipants: RemoteParticipant[];
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
}

let sharedState: LiveKitState = {
  room: null,
  localParticipant: null,
  remoteParticipants: [],
  isSpeaking: false,
  isMicrophoneEnabled: false,
  isCameraEnabled: false,
  isConnected: false,
  isConnecting: false,
};

// Subscribers for state changes
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return sharedState;
}

function updateState(updates: Partial<LiveKitState>) {
  sharedState = { ...sharedState, ...updates };
  notifyListeners();
}

export function useLiveKit(): UseLiveKitReturn {
  const dispatch = useAppDispatch();
  const { liveKitToken, liveKitUrl, connectionState } = useAppSelector(
    (state) => state.voice
  );

  // Use shared state across all components
  const state = useSyncExternalStore(subscribe, getSnapshot);

  // Map ConnectionState to our VoiceConnectionState
  const mapConnectionState = (connState: ConnectionState): VoiceConnectionState => {
    switch (connState) {
      case ConnectionState.Connected:
        return "connected";
      case ConnectionState.Connecting:
        return "connecting";
      case ConnectionState.Reconnecting:
        return "reconnecting";
      default:
        return "disconnected";
    }
  };

  // Update participants list
  const updateParticipants = useCallback(() => {
    if (!sharedState.room) return;

    const participants: LiveKitParticipant[] = [];
    sharedState.room.remoteParticipants.forEach((participant) => {
      participants.push({
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: participant.isSpeaking,
        isMuted: !participant.isMicrophoneEnabled,
        isVideoEnabled: participant.isCameraEnabled,
        connectionQuality:
          participant.connectionQuality === ConnectionQuality.Excellent
            ? "excellent"
            : participant.connectionQuality === ConnectionQuality.Good
            ? "good"
            : participant.connectionQuality === ConnectionQuality.Poor
            ? "poor"
            : "unknown",
      });
    });

    updateState({
      remoteParticipants: Array.from(sharedState.room.remoteParticipants.values())
    });
    dispatch(setParticipants(participants));
  }, [dispatch]);

  // Connect to LiveKit room
  const connect = useCallback(async () => {
    if (!liveKitToken || !liveKitUrl) {
      dispatch(setVoiceError("No LiveKit token or URL available"));
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (sharedState.isConnecting) {
      console.log("Already connecting, skipping...");
      return;
    }

    try {
      // Clean up any existing room first to prevent orphan connections
      if (sharedState.room) {
        try {
          sharedState.room.removeAllListeners();
          await sharedState.room.disconnect();
        } catch (e) {
          console.warn("Error disconnecting old room:", e);
        }
        updateState({
          room: null,
          localParticipant: null,
          remoteParticipants: [],
          isSpeaking: false,
          isMicrophoneEnabled: false,
          isCameraEnabled: false,
          isConnected: false,
        });
      }

      updateState({ isConnecting: true });
      dispatch(setConnectionState("connecting"));

      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Audio settings for voice chat
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      updateState({ room: newRoom });

      // Set up event listeners
      newRoom.on(RoomEvent.ConnectionStateChanged, (connState) => {
        dispatch(setConnectionState(mapConnectionState(connState)));
      });

      newRoom.on(RoomEvent.ParticipantConnected, () => {
        updateParticipants();
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, () => {
        updateParticipants();
      });

      newRoom.on(RoomEvent.TrackSubscribed, () => {
        updateParticipants();
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, () => {
        updateParticipants();
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        speakers.forEach((speaker) => {
          dispatch(participantStartedSpeaking(speaker.identity));
        });
      });

      newRoom.on(RoomEvent.LocalTrackPublished, () => {
        updateState({
          isMicrophoneEnabled: newRoom.localParticipant.isMicrophoneEnabled,
          isCameraEnabled: newRoom.localParticipant.isCameraEnabled
        });
      });

      newRoom.on(RoomEvent.LocalTrackUnpublished, () => {
        updateState({
          isMicrophoneEnabled: newRoom.localParticipant.isMicrophoneEnabled,
          isCameraEnabled: newRoom.localParticipant.isCameraEnabled
        });
      });

      // Local participant speaking state is handled via ActiveSpeakersChanged
      newRoom.localParticipant.on("isSpeakingChanged", (speaking: boolean) => {
        updateState({ isSpeaking: speaking });
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        dispatch(setConnectionState("disconnected"));
        updateState({ isConnected: false });
      });

      // Connect to the room
      await newRoom.connect(liveKitUrl, liveKitToken);

      updateState({
        isConnected: true,
        isConnecting: false,
        localParticipant: newRoom.localParticipant
      });
      dispatch(setConnectionState("connected"));

      // Enable microphone by default
      try {
        const audioTrack = await createLocalAudioTrack();
        await newRoom.localParticipant.publishTrack(audioTrack);
        updateState({ isMicrophoneEnabled: true });
      } catch (err) {
        console.error("Failed to enable microphone:", err);
        dispatch(setVoiceError("Microphone access denied"));
      }

      updateParticipants();
    } catch (error) {
      console.error("Failed to connect to LiveKit:", error);
      updateState({ isConnecting: false, isConnected: false });
      dispatch(
        setVoiceError(
          error instanceof Error ? error.message : "Failed to connect"
        )
      );
      dispatch(setConnectionState("disconnected"));
    }
  }, [liveKitToken, liveKitUrl, dispatch, updateParticipants]);

  // Disconnect from room
  const disconnect = useCallback(async () => {
    if (sharedState.room) {
      await sharedState.room.disconnect();
      updateState({
        room: null,
        localParticipant: null,
        remoteParticipants: [],
        isSpeaking: false,
        isMicrophoneEnabled: false,
        isCameraEnabled: false,
        isConnected: false,
        isConnecting: false
      });
    }
    dispatch(leaveVoiceChannel());
  }, [dispatch]);

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    if (!sharedState.room?.localParticipant) return;

    const participant = sharedState.room.localParticipant;
    const enabled = participant.isMicrophoneEnabled;

    if (enabled) {
      // Disable microphone
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track) {
          publication.track.stop();
          participant.unpublishTrack(publication.track as LocalTrack);
        }
      });
      updateState({ isMicrophoneEnabled: false });
    } else {
      // Enable microphone
      try {
        const audioTrack = await createLocalAudioTrack();
        await participant.publishTrack(audioTrack);
        updateState({ isMicrophoneEnabled: true });
      } catch (err) {
        console.error("Failed to enable microphone:", err);
        dispatch(setVoiceError("Failed to enable microphone"));
      }
    }
  }, [dispatch]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!sharedState.room?.localParticipant) return;

    const participant = sharedState.room.localParticipant;
    const enabled = participant.isCameraEnabled;

    if (enabled) {
      // Disable camera
      participant.videoTrackPublications.forEach((publication) => {
        if (
          publication.track &&
          publication.track.source === Track.Source.Camera
        ) {
          publication.track.stop();
          participant.unpublishTrack(publication.track as LocalTrack);
        }
      });
      updateState({ isCameraEnabled: false });
    } else {
      // Enable camera
      try {
        const videoTrack = await createLocalVideoTrack();
        await participant.publishTrack(videoTrack);
        updateState({ isCameraEnabled: true });
      } catch (err) {
        console.error("Failed to enable camera:", err);
        dispatch(setVoiceError("Failed to enable camera"));
      }
    }
  }, [dispatch]);

  // Cleanup on unmount - don't disconnect on component unmount anymore
  // since the room is shared. Only disconnect explicitly via disconnect()

  return {
    room: state.room,
    connectionState,
    localParticipant: state.localParticipant,
    remoteParticipants: state.remoteParticipants,
    isSpeaking: state.isSpeaking,
    connect,
    disconnect,
    toggleMicrophone,
    toggleCamera,
    isMicrophoneEnabled: state.isMicrophoneEnabled,
    isCameraEnabled: state.isCameraEnabled,
  };
}
