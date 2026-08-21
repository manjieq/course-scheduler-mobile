// Ported unchanged from the prototype's src/utils/id.ts.
export function generateId(): string {
  return crypto.randomUUID();
}
