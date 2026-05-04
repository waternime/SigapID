export type UserRole = "reporter" | "dispatcher";

export type EmergencyType =
  | "fire"
  | "medical"
  | "crime"
  | "disaster"
  | "sos"
  | "police"
  | "ambulance"
  | "firefighter";

export type EmergencyStatus =
  | "pending"
  | "assigned"
  | "accepted"
  | "on_route"
  | "arrived"
  | "resolved"
  | "cancelled"
  | "rejected";

export type EmergencyPriority = "low" | "normal" | "high" | "critical";

export type FamilyMemberStatus = "pending" | "accepted" | "rejected" | "blocked";

export type OperatorAssignmentStatus =
  | "assigned"
  | "accepted"
  | "released"
  | "completed";

export type MessageKind = "text" | "voice" | "image" | "system";

export interface Profile {
  id: string;
  user_code: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_available: boolean;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmergencyReport {
  id: string;
  reporter_id: string;
  subject_profile_id: string | null;
  assigned_operator_id: string | null;
  type: EmergencyType;
  status: EmergencyStatus;
  priority: EmergencyPriority;
  title: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  photo_url: string | null;
  call_room: string | null;
  sensor_detected: boolean;
  auto_dispatch_at: string | null;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  dispatched_at: string | null;
  arrived_at: string | null;
  resolved_at: string | null;
}

export interface Emergency extends EmergencyReport {
  dispatcher_id?: string | null;
  fall_detected?: boolean;
}

export interface EmergencyWithReporter extends Emergency {
  reporter?: Pick<Profile, "id" | "full_name" | "phone" | "email">;
  subject_profile?: Pick<Profile, "id" | "full_name" | "phone" | "email">;
  assigned_operator?: Pick<Profile, "id" | "full_name" | "phone" | "email">;
}

export interface FamilyMember {
  id: string;
  owner_id: string;
  member_id: string;
  relationship_label: string | null;
  status: FamilyMemberStatus;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface FamilyMemberWithProfile extends FamilyMember {
  member?: Pick<
    Profile,
    "id" | "user_code" | "full_name" | "phone" | "email" | "avatar_url"
  >;
  owner?: Pick<
    Profile,
    "id" | "user_code" | "full_name" | "phone" | "email" | "avatar_url"
  >;
}

export interface OperatorAssignment {
  id: string;
  report_id: string;
  operator_id: string;
  status: OperatorAssignmentStatus;
  assigned_by: string;
  workload_snapshot: number;
  assigned_at: string;
  accepted_at: string | null;
  released_at: string | null;
  completed_at: string | null;
}

export interface Message {
  id: string;
  report_id: string;
  sender_id: string;
  body: string | null;
  kind: MessageKind;
  media_url: string | null;
  voice_duration_seconds: number | null;
  created_at: string;
  read_at: string | null;
}

export interface EmergencyLocation {
  id: number;
  emergency_id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  recorded_at: string;
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

// Navigation param lists
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type ReporterStackParamList = {
  Dashboard: undefined;
  ActiveEmergency: { emergencyId: string };
  Camera: { emergencyId: string };
  Call: { emergencyId: string; roomName: string };
  History: undefined;
  Profile: undefined;
};

export type DispatcherStackParamList = {
  Dashboard: undefined;
  EmergencyDetail: { emergencyId: string };
  Call: { emergencyId: string; roomName: string };
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Reporter: undefined;
  Dispatcher: undefined;
  Splash: undefined;
};
