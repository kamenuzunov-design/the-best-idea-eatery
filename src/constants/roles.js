export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
};

export const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
  [ROLES.GUEST]: 0
};

export const getRoleWeight = (role) => {
  const normalized = String(role || ROLES.GUEST).toLowerCase();
  return ROLE_HIERARCHY[normalized] ?? 0;
};

export const hasHigherRole = (actorRole, targetRole) => {
  const actorW = getRoleWeight(actorRole);
  const targetW = getRoleWeight(targetRole || ROLES.USER);
  if (String(actorRole || '').toLowerCase() === ROLES.OWNER) return true;
  return actorW >= ROLE_HIERARCHY[ROLES.MODERATOR] && actorW > targetW;
};

export const canDeleteContentByRank = ({
  actorId,
  actorRole,
  targetAuthorId,
  targetAuthorRole
}) => {
  if (!actorId && !actorRole) return false;
  if (actorId && targetAuthorId && String(actorId) === String(targetAuthorId)) {
    return true;
  }
  return hasHigherRole(actorRole, targetAuthorRole || ROLES.USER);
};
