/** Default capacity-reminder body. Use {{name}} for the therapist’s greeting name. */
export const DEFAULT_NOTIFY_BODY =
  "Hi {{name}} — please update today’s patient capacity.";

const TITLE_PREFIX =
  /^(dr\.?|mr\.?|mrs\.?|ms\.?|miss|prof\.?|professor|sir|madam|dame|rev\.?|reverend)$/i;

/** First name suitable for greetings — skips titles like "Dr." */
export function greetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const start = parts.findIndex((p) => !TITLE_PREFIX.test(p));
  if (start === -1) return parts[0] || "there";
  return parts[start];
}

export function formatNotifyBody(template: string, fullName: string): string {
  const name = greetingName(fullName);
  return (template.trim() || DEFAULT_NOTIFY_BODY).replaceAll("{{name}}", name);
}
