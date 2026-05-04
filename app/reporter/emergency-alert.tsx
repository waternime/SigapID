import { Href, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEmergencyActions } from "@/hooks/useEmergencyReports";
import { colors, shadow, spacing, typography } from "@/theme";
import {
  IconButton,
  PrimaryAction,
  ScreenShell,
  navigateTo,
} from "@/components/app/MockAppUI";

export default function ReporterEmergencyAlert() {
  const { createReport } = useEmergencyActions();
  const [countdown, setCountdown] = useState(10);
  const sendingRef = useRef(false);

  const handleSensorReport = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;

    try {
      const report = await createReport({
        type: "medical",
        title: "Medis - Deteksi Guncangan",
        description: "Sensor mendeteksi guncangan keras dan pelapor meminta bantuan.",
        priority: "critical",
        sensorDetected: true,
      });

      router.replace({
        pathname: "/reporter/tracking",
        params: { reportId: report.id },
      });
    } catch (error) {
      Alert.alert(
        "Gagal mengirim bantuan",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
      sendingRef.current = false;
    }
  }, [createReport]);

  useEffect(() => {
    if (countdown <= 0) {
      handleSensorReport();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [countdown, handleSensorReport]);

  return (
    <ScreenShell
      role="reporter"
      title="Peringatan Darurat"
      subtitle="Sensor mendeteksi kondisi tidak biasa."
      action={<IconButton icon="close" onPress={() => navigateTo("/reporter/tracking" as Href)} />}
    >
      <View style={styles.alertPanel}>
        <View style={styles.ringOuter}>
          <View style={styles.ringMiddle}>
            <View style={styles.ringInner}>
              <MaterialCommunityIcons
                name="bell-ring"
                size={38}
                color={colors.textInverse}
              />
            </View>
          </View>
        </View>

        <Text style={styles.question}>Apakah Anda baik-baik saja?</Text>
        <Text style={styles.copy}>
          Kami mendeteksi guncangan keras. Jika tidak ada respons, sistem akan
          mengirim laporan medis otomatis.
        </Text>
        <Text style={styles.countdown}>{countdown}</Text>

        <PrimaryAction
          label="Ya, kirim bantuan sekarang"
          icon="ambulance"
          tone="danger"
          onPress={handleSensorReport}
        />
        <PrimaryAction
          label="Batalkan"
          tone="soft"
          onPress={() => navigateTo("/reporter/tracking" as Href)}
        />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  alertPanel: {
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: 22,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FFF7F7",
    ...shadow.md,
  },
  ringOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },
  ringMiddle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FECACA",
  },
  ringInner: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
  },
  question: {
    ...typography.h1,
    color: colors.primaryDark,
    textAlign: "center",
  },
  copy: {
    ...typography.body,
    color: "#9F3A3A",
    textAlign: "center",
  },
  countdown: {
    fontSize: 52,
    fontWeight: "700",
    color: colors.primary,
  },
});
