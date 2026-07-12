import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/admin.functions";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      qc.invalidateQueries({ queryKey: ["me"] });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const fetchRole = useServerFn(getMyRole);
  const roleQuery = useQuery({
    queryKey: ["me", user?.id ?? "anon"],
    queryFn: () => fetchRole(),
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: roleQuery.data?.isAdmin ?? false,
    isStaff: roleQuery.data?.isStaff ?? false,
    isDiretor: roleQuery.data?.isDiretor ?? false,
    isFundador: roleQuery.data?.isFundador ?? false,
    roles: roleQuery.data?.roles ?? [],
  };
}

export async function signOut() {
  await supabase.auth.signOut();
}
