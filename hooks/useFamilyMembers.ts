import { useCallback, useEffect, useState } from "react";
import { FamilyMemberStatus, FamilyMemberWithProfile } from "@/types";
import { supabase } from "@/utils/supabase";

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
