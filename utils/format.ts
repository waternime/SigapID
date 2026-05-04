import { EmergencyStatus, EmergencyType } from "@/types";

const emergencyTypeLabels: Record<EmergencyType, string> = {
  fire: "Kebakaran",
  medical: "Medis",
  crime: "Kriminal",
  disaster: "Bencana",
  police: "Polisi",
  ambulance: "Ambulans",
  firefighter: "Pemadam",
  sos: "SOS",
};

const emergencyStatusLabels: Record<EmergencyStatus, string> = {
  pending: "Menunggu",
  assigned: "Ditugaskan",
  accepted: "Diterima",
  on_route: "Dalam perjalanan",
  arrived: "Tiba",
  resolved: "Selesai",
  cancelled: "Dibatalkan",
  rejected: "Ditolak",
};

export function emergencyTypeLabel(type: EmergencyType) {
  return emergencyTypeLabels[type] ?? type;
}

export function emergencyStatusLabel(status: EmergencyStatus) {
  return emergencyStatusLabels[status] ?? status;
}

export function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "-";
  }

  const diffInSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffInSeconds < 60) return "Baru saja";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} menit lalu`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} jam lalu`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} hari lalu`;
}
