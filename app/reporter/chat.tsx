import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  useEmergencyActions,
  useEmergencyChat,
  useEmergencyReport,
  useReporterReports,
} from "@/hooks/useEmergencyReports";
import { useAuth } from "@/hooks/useAuth";
import {
  formatVoiceDuration,
  useVoiceNoteRecorder,
} from "@/hooks/useVoiceNoteRecorder";
import { emergencyStatusLabel } from "@/utils/format";
import { showApkOnlyFeature } from "@/utils/nativeFeatures";
import { colors, spacing, typography } from "@/theme";
import {
  ChatBubble,
  IconButton,
  ScreenShell,
} from "@/components/app/MockAppUI";
import { VoiceNoteBubble } from "@/components/app/VoiceNoteBubble";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ReporterChat() {
  const params = useLocalSearchParams<{ reportId?: string }>();
  const { profile } = useAuth();
  const { activeReport } = useReporterReports();
  const reportId = params.reportId ?? activeReport?.id;
  const { report } = useEmergencyReport(reportId);
  const { messages, loading, error, sending, sendMessage, sendVoiceNote, reload } =
    useEmergencyChat(reportId);
  const { finishReport } = useEmergencyActions();
  const {
    durationSeconds,
    isRecording,
    startRecording,
    stopRecording,
  } = useVoiceNoteRecorder();
  const [draft, setDraft] = useState("");
  const visibleMessages = messages.filter((message) => message.kind !== "system");
  const scrollRef = useRef<ScrollView>(null);

  const scrollToLatest = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload({ silent: true });
      scrollToLatest(false);
    }, [reload, scrollToLatest]),
  );

  useEffect(() => {
    scrollToLatest();
  }, [scrollToLatest, visibleMessages.length]);

  const handleSend = async () => {
    if (isRecording || sending) {
      return;
    }

    try {
      await sendMessage(draft);
      setDraft("");
    } catch (sendError) {
      Alert.alert(
        "Gagal mengirim pesan",
        sendError instanceof Error ? sendError.message : "Terjadi kesalahan.",
      );
    }
  };

  const handleVoice = async () => {
    if (!reportId || sending) {
      return;
    }

    try {
      if (isRecording) {
        const voiceNote = await stopRecording();
        await sendVoiceNote(voiceNote.uri, voiceNote.durationSeconds);
        return;
      }

      await startRecording();
    } catch (sendError) {
      Alert.alert(
        "Voice note gagal",
        sendError instanceof Error ? sendError.message : "Terjadi kesalahan.",
      );
    }
  };

  const handleFinish = async () => {
    if (!reportId) return;

    try {
      await finishReport(reportId);
      router.replace("/reporter/history");
    } catch (finishError) {
      Alert.alert(
        "Gagal menyelesaikan laporan",
        finishError instanceof Error ? finishError.message : "Terjadi kesalahan.",
      );
    }
  };

  return (
    <ScreenShell
      role="reporter"
      title={report?.assigned_operator?.full_name ?? "Operator"}
      subtitle={
        report
          ? `Terhubung - ${emergencyStatusLabel(report.status)}`
          : "Pilih laporan aktif untuk mulai chat"
      }
      action={
        <View style={styles.headerActions}>
          <IconButton
            icon={isRecording ? "stop" : "microphone"}
            tone={isRecording ? "danger" : "secondary"}
            onPress={handleVoice}
          />
          <IconButton
            icon="phone"
            tone="secondary"
            onPress={() => showApkOnlyFeature("Panggilan")}
          />
          <IconButton
            icon="check-circle-outline"
            tone="danger"
            onPress={handleFinish}
          />
        </View>
      }
      scroll={false}
    >
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={12}
      >
        {!!error && <Text style={styles.errorText}>Chat gagal dimuat.</Text>}

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollToLatest(false)}
        >
          {loading ? (
            <Text style={styles.emptyText}>Memuat pesan...</Text>
          ) : visibleMessages.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada pesan. Sapa operator dulu.</Text>
          ) : (
            visibleMessages.map((message) =>
              message.kind === "voice" ? (
                <VoiceNoteBubble
                  key={message.id}
                  mine={message.sender_id === profile?.id}
                  mediaUrl={message.media_url}
                  durationSeconds={message.voice_duration_seconds}
                />
              ) : (
                <ChatBubble key={message.id} mine={message.sender_id === profile?.id}>
                  {message.body}
                </ChatBubble>
              ),
            )
          )}
        </ScrollView>

        <View style={styles.composer}>
          {isRecording && (
            <View style={styles.recordingBar}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                Merekam {formatVoiceDuration(durationSeconds)}
              </Text>
            </View>
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Tulis pesan..."
              placeholderTextColor={colors.textSubtle}
              value={draft}
              onChangeText={setDraft}
              editable={!sending && !!reportId && !isRecording}
            />
            <MaterialCommunityIcons
              name="send"
              size={20}
              color={colors.text}
              onPress={handleSend}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    gap: spacing.md,
    minHeight: 0,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: "center",
  },
  messages: {
    flex: 1,
    minHeight: 0,
  },
  messagesContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  composer: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  recordingBar: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
  },
  recordingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingText: {
    ...typography.caption,
    color: colors.primaryDark,
  },
  inputBar: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
  },
});
