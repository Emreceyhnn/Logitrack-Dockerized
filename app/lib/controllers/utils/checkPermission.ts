"use server";

import { db } from "../../db";
import rolesConfig from "@/roles.json";
import {
  ForbiddenError,
  NoCompanyError,
  NotFoundError,
} from "../../errors";

export interface CheckPermissionUser {
  id: string;
  companyId: string | null;
  roleName?: string | null;
  role?: { name: string } | null;
}

/**
 * tr-kullanıcının bir şirkete erişim yetkisini ve belirtilen rollere sahip olup olmadığını doğrular
 * en-verifies the user's permission to access a company and checks if they hold the required roles
 * input (userOrUserId: CheckPermissionUser | string, companyId: string | null, requiredRoles?: string[], options?: { allowNoCompany?: boolean })
 * output (Promise<{ id: string, companyId: string | null, roleName: string | null }>)
 */
export async function checkPermission(
  userOrUserId: CheckPermissionUser | string,
  companyId: string | null,
  requiredRoles: string[] = [],
  options: { allowNoCompany?: boolean } = {}
) {
  if (!companyId && !options.allowNoCompany) {
    throw new NoCompanyError();
  }

  let resolvedUser: {
    id: string;
    companyId: string | null;
    roleName: string | null;
  };

  if (typeof userOrUserId === "string") {
    const dbUser = await db.user.findUnique({
      where: { id: userOrUserId },
      select: {
        id: true,
        companyId: true,
        role: { select: { name: true } },
      },
    });

    if (!dbUser) {
      throw new NotFoundError("User");
    }

    resolvedUser = {
      id: dbUser.id,
      companyId: dbUser.companyId,
      roleName: dbUser.role?.name ?? null,
    };
  } else {
    resolvedUser = {
      id: userOrUserId.id,
      companyId: userOrUserId.companyId,
      roleName: userOrUserId.roleName ?? userOrUserId.role?.name ?? null,
    };
  }

  if (resolvedUser.companyId !== companyId) {
    throw new ForbiddenError("User is not authorized to access this company");
  }

  if (requiredRoles.length > 0) {
    const userRoleName = resolvedUser.roleName ?? "";

    // Map internal role identifiers dynamically from roles.json (case-insensitive)
    const roleMapping: Record<string, string[]> = {};
    for (const r of rolesConfig) {
      roleMapping[r.id] = (r.names || [r.name]).map((name) => name.toLocaleLowerCase('en-US'));
    }

    const normalizedRequired = requiredRoles.flatMap((r) => {
      const roleKey = r.toLocaleLowerCase('en-US');
      const mapped = roleMapping[roleKey] || [];
      return [roleKey, ...mapped];
    });

    // Case-insensitive comparison against the user's actual role name
    const userRoleNameLower = userRoleName.toLocaleLowerCase('en-US');

    if (!normalizedRequired.includes(userRoleNameLower)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required roles: ${requiredRoles.join(", ")}`
      );
    }
  }

  return resolvedUser;
}
