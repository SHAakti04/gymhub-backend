export interface AuthUserRecord {
  id: string;
  gym_id: string | null;
  member_id: string | null;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  is_active: number;
  roles_csv: string | null;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    gymId: string | null;
    memberId: string | null;
    roles: string[];
    primaryRole: string;
  };
  accessToken: string;
  refreshToken: string;
}