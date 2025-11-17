import { isArray } from "es-toolkit/compat";
import { HydratedDocument, InferSchemaType } from "mongoose";

const permissions = {
	admin: permissionAdmin,
	manager: permissionManager,
	user: permissionUser,
	"template-manager": permissionTemplateManager,
} as const;

export const can = (
	user: HydratedDocument<InferSchemaType<typeof schemaUser>>,
	permission: string | string[],
) => {
	const { role, permissions: userPermissions } = user;
	const rolePermissions = permissions[role || "user"] ?? [];
	const allPermissions = [...userPermissions, ...rolePermissions];

	return isArray(permission)
		? allPermissions.some((p) => permission.includes(p))
		: allPermissions.includes(permission);
};

export const matchCan = (permission: string | string[]) => {
	const requestPermissions = isArray(permission) ? permission : [permission];
	const permissionRoles = Object.entries(permissions)
		.filter(([, value]) =>
			value.some((p: string) => requestPermissions.includes(p)),
		)
		.map(([key]) => key);

	const roleMatch = permissionRoles.includes("user")
		? {
				$or: [
					{
						role: { $exists: false },
					},
					{
						role: { $in: permissionRoles },
					},
				],
			}
		: {
				role: { $in: permissionRoles },
			};

	return {
		$or: [
			roleMatch,
			{
				permissions: { $in: requestPermissions },
			},
		],
	};
};

export default permissions;
