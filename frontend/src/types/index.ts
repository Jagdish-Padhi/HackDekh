export interface UserLite {
	_id: string;
	username?: string;
	fullName?: string;
	email?: string;
}

export interface Team {
	_id: string;
	name: string;
	owner: UserLite;
	members: UserLite[];
	invites: UserLite[];
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
}

