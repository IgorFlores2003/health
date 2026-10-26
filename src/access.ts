/** A session alone is not enough: the user must have a confirmed email. */
export function hasConfirmedEmail(
  user:
    | { id?: string; email?: string; email_confirmed_at?: string | null }
    | null
    | undefined,
) {
  return Boolean(user?.id && user?.email && user?.email_confirmed_at);
}
export function userStorageKey(userId: string) {
  if (!userId)
    throw new Error("A conta é obrigatória para acessar os registros.");
  return `ritmo-user-v1:${userId}`;
}
