// Contact form submission (src/app/api/contact/route.ts sends the email).

export interface ContactMessage {
  name: string;
  email: string;
  phone: string;
  message: string;
}

/** Sends the contact form. Resolves with the server's error message on a
 *  rejected submission; throws only on a network failure. */
export async function sendContactMessage(
  message: ContactMessage,
): Promise<{ ok: true } | { ok: false; error?: string }> {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });
  if (response.ok) return { ok: true };
  const data = await response.json().catch(() => ({}));
  return { ok: false, error: data.error };
}
