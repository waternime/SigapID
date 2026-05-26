import { ProfileSettingsScreen } from "@/components/app/ProfileSettingsScreen";

export default function OperatorProfile() {
  return (
    <ProfileSettingsScreen
      role="operator"
      title="Profile"
      displayFallback="Operator"
      addressFallback="Tambahkan alamat atau unit kerja operator."
      savedMessage="Profil operator berhasil diperbarui."
      avatarTone="secondary"
    />
  );
}
