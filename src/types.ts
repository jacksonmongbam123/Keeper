export type UserTypeID = 'student' | 'instructor' | 'administrator' | 'parent';

export type AccessLevelID = 1 | 2 | 3 | 4 | 5 | 6;

export interface SquadUser {
  id: string;
  dbId?: string; // real MongoDB _id returned from backend after registration
  user_type_id: string; // dropdown value mapped from: Student, Teacher/Instructor, Administrator, Parent/Guardian
  nic: string;
  password?: string;
  email: string;
  passport: string;
  title_id: string; // Mr, Mrs, Ms, Dr, Rev
  first_name: string;
  middle_name: string;
  last_name: string;
  sex: string; // male, female, other
  dob: string;
  phone: string;
  access_level_id: number; // dropdown value mapped from: Level 1, Level 2, Level 3, Level 4, Level 5
  organization_id?: string; // optional mapped institution ID
}
