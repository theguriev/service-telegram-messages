import type jwt from "jsonwebtoken";

export type AccessTokenPayload = jwt.JwtPayload & {
	userId: string;
	id?: string;
	role?: string;
	permissions?: string[];
	featureFlags?: string[];
	createdAt?: string;
	switchInfoId?: string;
	switchInfoIndex?: number;
	switchInfoLength?: number;
};
