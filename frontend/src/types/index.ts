export interface UserLite {
	_id: string;
	username?: string;
	fullName?: string;
	email?: string;
}

export interface HackathonLite {
  _id: string;
  title: string;
  platform: string;
  coverImage?: string;
  deadline?: string;
  startDate?: string;
  mode?: string;
  prize?: string;
  location?: string;
  applyLink?: string;
  organization?: string;
}

export interface StageReflection {
  user: UserLite | string;
  note: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stage {
  _id: string;
  name: string;
  teamHackathon: string | TeamHackathon;
  deadline?: string | null;
  result: 'pending' | 'qualified' | 'rejected' | string;
  notes?: string;
  reflections: StageReflection[];
  pendingReflectionFor?: UserLite[] | string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamHackathon {
  _id: string;
  team: string | Team;
  hackathon: HackathonLite;
  status: 'active' | 'eliminated' | 'finalist' | 'won' | string;
  currentStage?: string | Stage | null;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
	_id: string;
	name: string;
	owner: UserLite;
	members: UserLite[];
	createdAt: string;
	updatedAt: string;
}

export interface TeamInvitation {
  _id: string;
  team: string;
  invitedBy: UserLite;
  invitedEmail: string;
  token: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  acceptedBy?: UserLite;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedInvitationLink {
  _id: string;
  token: string;
  invitedEmail: string;
  invitationLink: string;
  expiresAt: string;
  team?: {
    _id: string;
    name: string;
    owner: UserLite;
  };
}

export interface InvitationPreview {
  invitationId: string;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  team: {
    _id: string;
    name: string;
    owner: UserLite;
    memberCount: number;
  };
}

