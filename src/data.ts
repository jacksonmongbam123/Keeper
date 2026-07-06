import { SquadUser } from './types';

export const USER_TYPES: { id: string; label: string }[] = [];

export const ACCESS_LEVELS = [
  { id: 1, label: 'Level 1' },
  { id: 2, label: 'Level 2' },
  { id: 3, label: 'Level 3' },
  { id: 4, label: 'Level 4' },
  { id: 5, label: 'Level 5' },
  { id: 6, label: 'Level 6' }
];

export const TITLES: string[] = [];

export const SEXES = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'other', label: 'Other' }
];

export const INITIAL_USERS: SquadUser[] = [];
