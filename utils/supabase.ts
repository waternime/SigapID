import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";

const fallbackSupabaseUrl = "https://hcwelqlzetxtllvjgwdu.supabase.co";
const fallbackSupabasePublishableKey =
  "sb_publishable_Eo8nGBUXJmIgdVws9fDeDQ_R2fQrhNG";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fallbackSupabaseUrl;
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  fallbackSupabasePublishableKey;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Supabase belum dikonfigurasi. Isi EXPO_PUBLIC_SUPABASE_URL dan EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY di file .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
      return;
    }

    supabase.auth.stopAutoRefresh();
  });
}
