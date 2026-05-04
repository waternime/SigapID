import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { formatVoiceDuration } from "@/hooks/useVoiceNoteRecorder";
import { colors, radius, shadow, spacing, typography } from "@/theme";

export function VoiceNoteBubble({
  mine,
  mediaUrl,
  durationSeconds,
}: {
  mine?: boolean;
  mediaUrl?: string | null;
  durationSeconds?: number | null;
}) {
  const player = useAudioPlayer(mediaUrl ? { uri: mediaUrl } : null, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);
  const shownDuration =
    durationSeconds ?? (status.duration ? Math.round(status.duration) : 0);
  const progress =
    status.duration > 0
      ? Math.min(100, Math.max(0, (status.currentTime / status.duration) * 100))
      : 0;

  const handlePlay = async () => {
    if (!mediaUrl) {
      Alert.alert("Voice note belum siap", "Audio belum tersedia.");
      return;
    }

    if (Platform.OS === "ios") {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        interruptionMode: "mixWithOthers",
        shouldPlayInBackground: false,
        allowsBackgroundRecording: false,
      });
    }

    if (status.playing) {
      player.pause();
      return;
    }

    if (
      status.didJustFinish ||
      (status.duration > 0 && status.currentTime >= status.duration - 0.2)
    ) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <Pressable
      onPress={handlePlay}
      style={({ pressed }) => [
        styles.voiceBubble,
        mine && styles.voiceBubbleMine,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.playButton, status.playing && styles.playButtonActive]}>
        <MaterialCommunityIcons
          name={status.playing ? "pause" : "play"}
          size={20}
          color={colors.textInverse}
        />
      </View>

      <View style={styles.voiceContent}>
        <View style={styles.waveTrack}>
          <View style={[styles.waveProgress, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.voiceTime}>{formatVoiceDuration(shownDuration)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  voiceBubble: {
    width: 220,
    maxWidth: "82%",
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: 18,
    borderTopLeftRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  voiceBubbleMine: {
    alignSelf: "flex-end",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 8,
    backgroundColor: "#E8F4FF",
    borderColor: "#BFDBFE",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2F80C5",
  },
  playButtonActive: {
    backgroundColor: colors.danger,
  },
  voiceContent: {
    flex: 1,
    gap: spacing.xs,
  },
  waveTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: radius.full,
    backgroundColor: "#DCE8F7",
  },
  waveProgress: {
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
  },
  voiceTime: {
    ...typography.micro,
    color: colors.textMuted,
  },
});
