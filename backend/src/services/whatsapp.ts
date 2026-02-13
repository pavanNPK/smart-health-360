/**
 * WhatsApp messaging via Twilio.
 * Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (e.g. whatsapp:+14155238886) to enable.
 * Patient phone numbers should be in E.164 (e.g. +919876543210).
 */

let twilioClient: { messages: { create: (opts: { from: string; to: string; body: string }) => Promise<unknown> } } | null = null;

function getClient(): typeof twilioClient {
  if (twilioClient) return twilioClient;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
  if (!accountSid || !authToken || !from) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio');
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch {
    return null;
  }
}

/**
 * Normalize phone to E.164 for WhatsApp. Adds "whatsapp:" prefix for Twilio.
 * If number doesn't start with +, we don't assume country code (caller can pass +91XXXXXXXXXX).
 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const trimmed = phone.trim();
  const withPlus =
    trimmed.startsWith('+') ? `+${digits}` : digits.length === 10 ? `+91${digits}` : digits.length > 0 ? `+${digits}` : phone;
  return `whatsapp:${withPlus}`;
}

export async function sendWhatsAppMessage(phone: string, body: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!from || !from.startsWith('whatsapp:')) return false;
  try {
    await client.messages.create({
      from,
      to: toWhatsAppNumber(phone),
      body,
    });
    return true;
  } catch (err) {
    console.error('WhatsApp send failed:', err);
    return false;
  }
}

/** Message sent when a patient is onboarded (registration confirmed). */
export function getAppointmentOnboardMessage(patientName: string, doctorName?: string): string {
  const doctorLine = doctorName ? ` Your assigned doctor: ${doctorName}.` : '';
  return (
    `Welcome to Smart Health 360, ${patientName}. Your registration is confirmed and your appointment/onboarding is complete.` +
    doctorLine +
    ` We will contact you with further appointment details. Thank you.`
  );
}
