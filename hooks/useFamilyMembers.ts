import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmergencyStatus,
  EmergencyWithReporter,
  FamilyMemberStatus,
  FamilyMemberWithProfile,
} from "@/types";
import { supabase } from "@/utils/supabase";

const activeReportStatuses: EmergencyStatus[] = [
  "pending",
  "assigned",
  "accepted",
  "on_route",
  "arrived",
];

export function useFamilyMembers() {
  const [members, setMembers] = useState<FamilyMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await supabase
      .from("family_members")
      .select(
        `
          id,
          owner_id,
          member_id,
          relationship_label,
          status,
          created_at,
          updated_at,
          accepted_at,
          member:profiles!family_members_member_id_fkey (
            id,
            user_code,
            full_name,
            phone,
            email,
            avatar_url
          ),
          owner:profiles!family_members_owner_id_fkey (
            id,
            user_code,
            full_name,
            phone,
            email,
            avatar_url
          )
        `,
      )
      .order("created_at", { ascending: false });

    if (queryError) {
      setMembers([]);
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const normalizedMembers = (data ?? []).map((member) => ({
      ...member,
      member: Array.isArray(member.member) ? member.member[0] : member.member,
      owner: Array.isArray(member.owner) ? member.owner[0] : member.owner,
    }));

    setMembers(normalizedMembers as unknown as FamilyMemberWithProfile[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const updateRequestStatus = useCallback(
    async (memberId: string, status: Extract<FamilyMemberStatus, "accepted" | "rejected">) => {
      const { error: updateError } = await supabase
        .from("family_members")
        .update({
          status,
          accepted_at: status === "accepted" ? new Date().toISOString() : null,
        })
        .eq("id", memberId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await loadMembers();
    },
    [loadMembers],
  );

  return { members, loading, error, reload: loadMembers, updateRequestStatus };
}

function getLinkedProfileId(member: FamilyMemberWithProfile, currentUserId?: string) {
  if (!currentUserId) return null;
  return member.owner_id === currentUserId ? member.member_id : member.owner_id;
}

export function useFamilyActiveReports(
  members: FamilyMemberWithProfile[],
  currentUserId?: string,
) {
  const [reports, setReports] = useState<EmergencyWithReporter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const linkedProfileIds = useMemo(
    () =>
      Array.from(
        new Set(
          members
            .filter((member) => member.status === "accepted")
            .map((member) => getLinkedProfileId(member, currentUserId))
            .filter((id): id is string => !!id),
        ),
      ),
    [currentUserId, members],
  );

  const loadReports = useCallback(async (options?: { silent?: boolean }) => {
    if (linkedProfileIds.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_family_active_reports",
    );

    if (!rpcError) {
      setReports((rpcData ?? []) as EmergencyWithReporter[]);
      setLoading(false);
      return;
    }

    const idList = linkedProfileIds.join(",");
    const { data, error: queryError } = await supabase
      .from("emergency_reports")
      .select("*")
      .or(`reporter_id.in.(${idList}),subject_profile_id.in.(${idList})`)
      .in("status", activeReportStatuses)
      .order("created_at", { ascending: false });

    if (queryError) {
      if (!options?.silent) {
        setReports([]);
      }
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setReports((data ?? []) as EmergencyWithReporter[]);
    setLoading(false);
  }, [linkedProfileIds]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (linkedProfileIds.length === 0) return;

    const channel = supabase
      .channel(`family-active-reports-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_reports" },
        () => loadReports({ silent: true }),
      )
      .subscribe();

    const interval = setInterval(() => {
      loadReports({ silent: true });
    }, 2500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [linkedProfileIds.length, loadReports]);

  const reportsByProfileId = useMemo(() => {
    const map = new Map<string, EmergencyWithReporter>();

    reports.forEach((report) => {
      map.set(report.subject_profile_id ?? report.reporter_id, report);
      map.set(report.reporter_id, report);
    });

    return map;
  }, [reports]);

  return {
    reports,
    reportsByProfileId,
    loading,
    error,
    reload: loadReports,
  };
}
