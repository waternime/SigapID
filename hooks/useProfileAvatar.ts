import { useCallback, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/utils/supabase";

type AvatarSource = "camera" | "library";
const avatarSize = 768;
const avatarQuality = 0.72;

async function compressAvatar(uri: string) {
  return ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: avatarSize, height: avatarSize } }],
    {
      compress: avatarQuality,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
}

export function useProfileAvatar() {
  const { profile, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const updateAvatar = useCallback(
    async (source: AvatarSource) => {
      if (!profile?.id) {
        throw new Error("Profil belum terbaca. Coba login ulang.");
      }

      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        throw new Error(
          source === "camera"
            ? "Izin kamera belum diberikan."
            : "Izin akses galeri belum diberikan.",
        );
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.82,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.82,
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
            });

      if (result.canceled || !result.assets[0]) {
        return null;
      }

      setUploading(true);

      try {
        const asset = result.assets[0];
        const compressed = await compressAvatar(asset.uri);
        const response = await fetch(compressed.uri);
        const fileBody = await response.arrayBuffer();
        const storagePath = `${profile.id}/avatar.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("profile-avatars")
          .upload(storagePath, fileBody, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          const message = uploadError.message.toLowerCase();

          if (
            message.includes("bucket") ||
            message.includes("row-level security") ||
            message.includes("permission")
          ) {
            throw new Error(
              "Storage avatar belum siap. Jalankan ulang supabase/profiles.sql di Supabase SQL Editor.",
            );
          }

          throw new Error(uploadError.message);
        }

        const { data } = supabase.storage
          .from("profile-avatars")
          .getPublicUrl(storagePath);

        const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", profile.id);

        if (profileError) {
          throw new Error(profileError.message);
        }

        await refreshProfile();
        return avatarUrl;
      } finally {
        setUploading(false);
      }
    },
    [profile?.id, refreshProfile],
  );

  return { uploading, updateAvatar };
}
