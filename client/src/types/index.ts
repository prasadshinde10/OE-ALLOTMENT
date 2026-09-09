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
  isProfileLocked?: boolean;
  password?: string;
  allocatedElectiveId?: string;
  allocatedElectiveName?: string;
  allocatedTerm?: string;
  allocationTimestamp?: string;
  allocatedDivision?: string;
  allocatedFaculty?: string;
  allocatedFacultyPhone?: string;
  allocatedFacultyContact?: string;
  allocatedHall?: string;
  // Co-Curricular Club Allocation (FY)
  allocatedCoCurricularClubId?: string;
  allocatedCoCurricularClubName?: string;
  allocatedCoCurricularClubTerm?: string;
  allocatedCoCurricularTimestamp?: string;
  allocatedCoCurricularDivision?: string;
  allocatedCoCurricularCoordinator?: string;
  allocatedCoCurricularContact?: string;
  allocatedCoCurricularHall?: string;
  // Extra-Curricular Club Allocation (FY)
  allocatedExtraCurricularClubId?: string;
  allocatedExtraCurricularClubName?: string;
  allocatedExtraCurricularClubTerm?: string;
  allocatedExtraCurricularTimestamp?: string;
  allocatedExtraCurricularDivision?: string;
  allocatedExtraCurricularCoordinator?: string;
  allocatedExtraCurricularContact?: string;
  allocatedExtraCurricularHall?: string;
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
  isRegistrationActive?: boolean;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'first_year_admin' | 'FY_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | string;
}

export interface ClubDivision {
  _id?: string;
  divisionName: string;
  coordinatorName: string;
  facultyName?: string;
  hallRoom?: string;
  coordinatorContact?: string;
  facultyContact?: string;
  capacity: number;
}

export interface Club {
  _id: string;
  name: string;
  code: string;
  category: 'co-curricular' | 'extra-curricular';
  offeredByDepartment?: string;
  year: number;
  term: string;
  capacity: number;
  seatsFilled: number;
  isActive: boolean;
  remaining?: number;
  divisions?: ClubDivision[];
  syllabusUrl?: string;
  coordinatorName?: string;
  coordinatorContact?: string;
  description?: string;
  targetBranches?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubSeatCount {
  _id?: string;
  clubId?: string;
  name?: string;
  code?: string;
  category?: 'co-curricular' | 'extra-curricular';
  offeredByDepartment?: string;
  capacity: number;
  seatsFilled: number;
  remaining: number;
  coordinatorName?: string;
  coordinatorContact?: string;
  syllabusUrl?: string;
  description?: string;
  targetBranches?: string[];
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
    role: 'student' | 'admin' | 'teacher' | 'first_year_admin' | 'FY_ADMIN' | 'SUPER_ADMIN' | 'ADMIN' | string;
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
