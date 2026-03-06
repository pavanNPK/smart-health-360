/**
 * Pluggable notification: Email + WhatsApp.
 * Implementations can be swapped (e.g. Twilio/Meta for WhatsApp, SendGrid for email).
 */

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WhatsAppPayload {
  toPhone: string;
  body: string;
}

export interface IEmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

export interface IWhatsAppProvider {
  send(payload: WhatsAppPayload): Promise<boolean>;
}

/** Stub: logs only. Replace with real nodemailer when MAIL_* env is set. */
export const stubEmailProvider: IEmailProvider = {
  async send(payload: EmailPayload): Promise<void> {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log('[Notification] Email (stub): would send to', payload.to, 'subject:', payload.subject);
      return;
    }
    const { sendMail } = await import('./mail');
    await sendMail({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });
  },
};

/** Stub: console log. Replace with Twilio/Meta when credentials are set. */
export const stubWhatsAppProvider: IWhatsAppProvider = {
  async send(payload: WhatsAppPayload): Promise<boolean> {
    console.log('[Notification] WhatsApp (stub): would send to', payload.toPhone, 'body:', payload.body.slice(0, 80) + '...');
    const { sendWhatsAppMessage } = await import('./whatsapp');
    return sendWhatsAppMessage(payload.toPhone, payload.body);
  },
};

const defaultEmailProvider: IEmailProvider = stubEmailProvider;
const defaultWhatsAppProvider: IWhatsAppProvider = stubWhatsAppProvider;

let emailProvider: IEmailProvider = defaultEmailProvider;
let whatsAppProvider: IWhatsAppProvider = defaultWhatsAppProvider;

export function setEmailProvider(provider: IEmailProvider): void {
  emailProvider = provider;
}

export function setWhatsAppProvider(provider: IWhatsAppProvider): void {
  whatsAppProvider = provider;
}

export async function notifyPrescriptionFinalized(params: {
  patientEmail?: string;
  patientPhone?: string;
  patientName: string;
  prescriptionDate: string;
  prescriptionSummary?: string;
}): Promise<void> {
  const { patientEmail, patientPhone, patientName, prescriptionDate, prescriptionSummary = '' } = params;
  const subject = `Prescription ready – ${patientName}`;
  const html = `
    <p>Dear ${escapeHtml(patientName)},</p>
    <p>Your prescription dated ${escapeHtml(prescriptionDate)} is now available.</p>
    ${prescriptionSummary ? `<p>${escapeHtml(prescriptionSummary)}</p>` : ''}
    <p>Please collect it from the clinic or contact us for further details.</p>
    <p>— Smart Health 360</p>
  `;
  const text = `Prescription dated ${prescriptionDate} is ready for ${patientName}. ${prescriptionSummary}`;
  const whatsAppBody = `Your prescription (${prescriptionDate}) is ready. ${patientName}. Please collect from clinic or contact us.`;

  const promises: Promise<unknown>[] = [];
  if (patientEmail) {
    promises.push(
      emailProvider.send({ to: patientEmail, subject, html, text }).catch((err) => {
        console.error('[Notification] Prescription email failed:', err);
      })
    );
  }
  if (patientPhone) {
    promises.push(
      whatsAppProvider.send({ toPhone: patientPhone, body: whatsAppBody }).catch((err) => {
        console.error('[Notification] Prescription WhatsApp failed:', err);
      })
    );
  }
  await Promise.all(promises);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
