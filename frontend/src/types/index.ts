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

export interface ApiResponseEnvelope<T> {
	statusCode: number;
	data: T;
	message: string;
	success: boolean;
}
