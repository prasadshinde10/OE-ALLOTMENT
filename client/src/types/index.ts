export interface Student {
  _id: string;
  hallTicketNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  instituteEmail: string;
  mobileNumber: string;
  branch: string;
  semester: string;
  rollNumber: string;
  year: 1 | 2 | 3;
  isVerified: boolean;
  isProfileComplete?: boolean;
  password?: string;
  allocatedElectiveId?: string;
  allocatedElectiveName?: string;
  allocatedTerm?: string;
  allocationTimestamp?: string;
  allocatedDivision?: string;
  allocatedFaculty?: string;
  allocatedHall?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Division {
  _id?: string;
  divisionName: string;
  facultyName: string;
  hallRoom?: string;
  facultyContact?: string;
  capacity: number;
}

export interface Elective {
  _id: string;
  name: string;
  code: string;
  offeredByDepartment?: string;
  year: 1 | 2 | 3;
  term: string;
  capacity: number;
  seatsFilled: number;
  isActive: boolean;
  remaining?: number;
  divisions?: Division[];
  syllabusUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeatCount {
  _id?: string;
  electiveId?: string;
  name?: string;
  code?: string;
  electiveName?: string;
  electiveCode?: string;
  offeredByDepartment?: string;
  capacity: number;
  seatsFilled: number;
  remaining: number;
}

export interface TermConfig {
  _id: string;
  term: string;
  year: 1 | 2 | 3;
  registrationOpensAt: string;
  registrationClosesAt: string;
  isActive: boolean;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher';
}

export interface AuditLogEntry {
  _id: string;
  action: string;
  actorId: string;
  actorRole: string;
  targetType: string;
  targetId?: string;
  before?: any;
  after?: any;
  metadata?: any;
  timestamp: string;
}

export interface AuthState {
  token: string | null;
  user: {
    userId: string;
    role: 'student' | 'admin' | 'teacher';
    name: string;
    year?: number;
    email: string;
  } | null;
  isAuthenticated: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
