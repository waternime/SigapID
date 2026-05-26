import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppNotification } from "@/components/app/AppNotification";
import { showRealtimeNotification } from "@/utils/realtimeNotifications";
import { emergencyTypeLabel } from "@/utils/format";
import { supabase } from "@/utils/supabase";
import { EmergencyReport } from "@/types";

function realtimeTopic(name: string) {
  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useOperatorReportNotifications(onReportReceived?: () => void) {
  const { profile } = useAuth();
  const { showNotification } = useAppNotification();
  const seenReportsRef = useRef(new Set<string>());
  const onReportReceivedRef = useRef(onReportReceived);

  useEffect(() => {
    onReportReceivedRef.current = onReportReceived;
  }, [onReportReceived]);

  useEffect(() => {
    if (profile?.role !== "dispatcher" || profile.unit_type) return;

    const channel = supabase
      .channel(realtimeTopic(`central-report-alerts-${profile.id}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "emergency_reports",
        },
        (payload) => {
          const report = payload.new as EmergencyReport | null;
          if (!report?.id || seenReportsRef.current.has(report.id)) return;

          seenReportsRef.current.add(report.id);
          onReportReceivedRef.current?.();

          const title = report.title ?? emergencyTypeLabel(report.type);
          showNotification({
            title: "Laporan masuk",
            message: title,
            tone: report.priority === "critical" ? "danger" : "warning",
            durationMs: 4200,
          });
          showRealtimeNotification({
            title: "Laporan darurat masuk",
            body: title,
            data: {
              kind: "new_report",
              reportId: report.id,
            },
          }).catch(() => undefined);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role, profile?.unit_type, showNotification]);
}
