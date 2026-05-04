import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";

const heartbeatMs = 60_000;

export function useOperatorPresence() {
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role !== "dispatcher") return;

    let active = true;

    const markOnline = async () => {
      if (!active) return;

      await supabase
        .from("profiles")
        .update({
          is_available: true,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", profile.id);
    };

    markOnline();
    const interval = setInterval(markOnline, heartbeatMs);

    return () => {
      active = false;
      clearInterval(interval);

      supabase
        .from("profiles")
        .update({ is_available: false })
        .eq("id", profile.id)
        .then();
    };
  }, [profile?.id, profile?.role]);
}
