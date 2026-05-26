import { ProfileSettingsScreen } from "@/components/app/ProfileSettingsScreen";

export default function ReporterProfile() {
  return (
    <ProfileSettingsScreen
      role="reporter"
      title="Profile"
      displayFallback="Pelapor"
      addressFallback="Tambahkan alamat utama untuk mempercepat bantuan."
      savedMessage="Profil berhasil diperbarui."
    />
  );
}
