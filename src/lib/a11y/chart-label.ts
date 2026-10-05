/**
 * Text alternative for a chart canvas: what it shows, then the latest value
 * of each line (the same values the end labels draw on the right).
 */
export function chartLabel(
  subject: string,
  latest: Array<[name: string, value: string | null | undefined]>,
): string {
  const values = latest
    .filter(([, value]) => value)
    .map(([name, value]) => `${name} ${value}`);
  return values.length
    ? `${subject}. Latest: ${values.join(", ")}.`
    : `${subject}.`;
}
