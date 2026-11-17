export interface HealthStatus {
  status: string;
  project: string;
  version: string;
  timestamp: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface ApiError {
  message: string;
  statusCode?: number;
}
