import { validRoles } from "@mustafahmed1997/learnify-backend";

/**
 *
 * @param userId
 * @param role
 *
 */
export async function addRoleService(
  userId: string,
  role: (typeof validRoles)[number],
) {
  // it will be called from request approve endpoint in instructor service
  // and add Role end point in role service
  // check UserRole
  // create UserRole
  // get all user roles
  // update Clerk metadata
  //* Return message : "Role added. Authorization synchronization is pending."
  //* with status : 202 Accepted
}

export async function removeRoleService(
  userId: string,
  role: (typeof validRoles)[number],
) {}
