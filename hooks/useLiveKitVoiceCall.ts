import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "@/utils/supabase";

type CallStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

type StartCallInput = {
  roomName: string;
  participantName: string;
};

const liveKitUrl = process.env.EXPO_PUBLIC_LIVEKIT_URL;

function liveKitErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Panggilan belum bisa dimulai.";
}

export function useLiveKitVoiceCall() {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const roomRef = useRef<any>(null);
  const audioSessionRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const cleanup = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;

    try {
      await room?.disconnect();
    } catch {
      // no-op: cleanup should never block navigation
    }

    try {
      await audioSessionRef.current?.stopAudioSession?.();
    } catch {
      // no-op
    }

    if (mountedRef.current) {
      setStatus("disconnected");
      setRemoteCount(0);
      setMuted(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const startCall = useCallback(
    async ({ roomName, participantName }: StartCallInput) => {
      if (roomRef.current || status === "connecting" || status === "connected") {
        return;
      }

      if (Constants.appOwnership === "expo") {
        setStatus("error");
        setError("Panggilan dalam aplikasi hanya bisa dites di APK/dev build, bukan Expo Go.");
        return;
      }

      if (!liveKitUrl) {
        setStatus("error");
        setError("EXPO_PUBLIC_LIVEKIT_URL belum diatur untuk build APK.");
        return;
      }

      setStatus("connecting");
      setError(null);

      try {
        const livekitNative = await import("@livekit/react-native");
        const livekitClient = await import("livekit-client");
        const { data, error: tokenError } = await supabase.functions.invoke(
          "livekit-token",
          {
            body: {
              roomName,
              participantName,
            },
          },
        );

        if (tokenError) {
          throw new Error(tokenError.message);
        }

        if (!data?.token) {
          throw new Error("Token LiveKit kosong. Cek Supabase Edge Function livekit-token.");
        }

        livekitNative.registerGlobals();
        audioSessionRef.current = livekitNative.AudioSession;

        if (Platform.OS !== "web") {
          await livekitNative.AudioSession.configureAudio({
            android: {
              preferredOutputList: ["speaker", "bluetooth", "headset", "earpiece"],
              audioTypeOptions: livekitNative.AndroidAudioTypePresets.communication,
            },
            ios: {
              defaultOutput: "speaker",
            },
          });
          await livekitNative.AudioSession.startAudioSession();
        }

        const room = new livekitClient.Room({
          adaptiveStream: false,
          dynacast: false,
        });
        roomRef.current = room;

        const updateRemoteCount = () => {
          if (mountedRef.current) {
            setRemoteCount(room.remoteParticipants.size);
          }
        };

        room.on(livekitClient.RoomEvent.ParticipantConnected, updateRemoteCount);
        room.on(livekitClient.RoomEvent.ParticipantDisconnected, updateRemoteCount);
        room.on(livekitClient.RoomEvent.Reconnecting, () => {
          if (mountedRef.current) setStatus("reconnecting");
        });
        room.on(livekitClient.RoomEvent.Reconnected, () => {
          if (mountedRef.current) setStatus("connected");
        });
        room.on(livekitClient.RoomEvent.Disconnected, () => {
          if (mountedRef.current) {
            setStatus("disconnected");
            setRemoteCount(0);
          }
        });

        await room.connect(liveKitUrl, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);

        if (mountedRef.current) {
          setMuted(false);
          setStatus("connected");
          updateRemoteCount();
        }
      } catch (callError) {
        await cleanup();

        if (mountedRef.current) {
          setStatus("error");
          setError(liveKitErrorMessage(callError));
        }
      }
    },
    [cleanup, status],
  );

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;

    const nextMuted = !muted;
    await room.localParticipant.setMicrophoneEnabled(!nextMuted);
    setMuted(nextMuted);
  }, [muted]);

  const toggleSpeaker = useCallback(async () => {
    if (!audioSessionRef.current) return;

    const nextSpeaker = !speakerOn;
    const output = Platform.OS === "ios"
      ? nextSpeaker
        ? "force_speaker"
        : "default"
      : nextSpeaker
        ? "speaker"
        : "earpiece";

    try {
      await audioSessionRef.current.selectAudioOutput(output);
      setSpeakerOn(nextSpeaker);
    } catch {
      setSpeakerOn((current) => !current);
    }
  }, [speakerOn]);

  return {
    status,
    error,
    remoteCount,
    muted,
    speakerOn,
    startCall,
    leaveCall: cleanup,
    toggleMute,
    toggleSpeaker,
  };
}
