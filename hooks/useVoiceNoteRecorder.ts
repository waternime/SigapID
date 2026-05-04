import { useCallback } from "react";
import { Platform } from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import type { RecordingOptions } from "expo-audio";

const minVoiceNoteMs = 700;

const voiceRecordingOptions = {
  ...RecordingPresets.LOW_QUALITY,
  isMeteringEnabled: true,
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  android: {
    ...RecordingPresets.LOW_QUALITY.android,
    audioSource: "mic",
    maxFileSize: 2 * 1024 * 1024,
  },
  ios: {
    ...RecordingPresets.LOW_QUALITY.ios,
    sampleRate: 22050,
  },
  web: {
    mimeType: "audio/webm",
    bitsPerSecond: 32000,
  },
} satisfies RecordingOptions;

async function enableRecordingMode() {
  if (Platform.OS !== "ios") {
    return;
  }

  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
    interruptionMode: "doNotMix",
    shouldPlayInBackground: false,
    allowsBackgroundRecording: false,
  });
}

async function enablePlaybackMode() {
  if (Platform.OS !== "ios") {
    return;
  }

  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    interruptionMode: "mixWithOthers",
    shouldPlayInBackground: false,
    allowsBackgroundRecording: false,
  });
}

export function formatVoiceDuration(seconds?: number | null) {
  const safeSeconds = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function useVoiceNoteRecorder() {
  const recorder = useAudioRecorder(voiceRecordingOptions);
  const recorderState = useAudioRecorderState(recorder, 250);

  const startRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();

    if (!permission.granted) {
      throw new Error("Izin mikrofon belum diberikan.");
    }

    await enableRecordingMode();

    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      await enablePlaybackMode();

      throw error;
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    const beforeStop = recorder.getStatus();

    try {
      await recorder.stop();
    } finally {
      await enablePlaybackMode();
    }

    const afterStop = recorder.getStatus();
    const uri = recorder.uri ?? afterStop.url ?? beforeStop.url;
    const durationMillis = beforeStop.durationMillis || afterStop.durationMillis;

    if (!uri) {
      throw new Error("File voice note tidak ditemukan.");
    }

    if (durationMillis < minVoiceNoteMs) {
      throw new Error("Voice note terlalu pendek.");
    }

    return {
      uri,
      durationSeconds: Math.max(1, Math.round(durationMillis / 1000)),
    };
  }, [recorder]);

  return {
    durationSeconds: Math.floor(recorderState.durationMillis / 1000),
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
  };
}
