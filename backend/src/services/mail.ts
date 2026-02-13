import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT) || 465,
      secure: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(options: SendMailOptions): Promise<void> {
  const transport = getTransporter();
  try {
    await transport.sendMail({
      from: process.env.MAIL_USER || 'noreply@hospital.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : '';
    if (code === 'EAUTH') {
      throw new Error(
        'Mail login failed (Gmail). Use an App Password, not your normal password. ' +
          'Enable 2-Step Verification, then create one at: https://myaccount.google.com/apppasswords'
      );
    }
    throw err;
  }
}

const BRAND = {
  name: 'Smart Health 360',
  tagline: 'Your care, connected.',
  primary: '#051C3B',
  primaryDark: '#051C3B',
  headerGradient: 'linear-gradient(135deg, #051C3B 0%, #0a2d5c 50%, #0d3d7a 100%)',
  bgLight: '#f0f4f9',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  white: '#ffffff',
};

/** Building icon SVG (same idea as side nav pi-building), white stroke, beside brand name. */
function getHeaderBrandHtml(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${BRAND.white}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:10px;"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>`;
  return `<span style="display:inline-flex;align-items:center;justify-content:center;">${svg}<span style="font-size:22px;font-weight:700;letter-spacing:-0.3px;color:${BRAND.white};vertical-align:middle;">${BRAND.name}</span></span>`;
}

/**
 * Wrapper for all emails: header with logo, content area, footer.
 * Uses inline styles and table-based layout for broad email client support.
 */
function emailLayout(content: string, options?: { hideFooter?: boolean }): string {
  const headerBrand = getHeaderBrandHtml();
  const footer = options?.hideFooter
    ? ''
    : `
    <div style="background-color:#f9fafb;text-align:center;padding:20px 24px;color:${BRAND.textMuted};font-size:13px;border-top:1px solid ${BRAND.border};">
      <p style="margin:0 0 4px;">${BRAND.name} · ${BRAND.tagline}</p>
      <p style="margin:0;">© ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.</p>
    </div>`;
  return `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:${BRAND.text};max-width:600px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};background:${BRAND.white};box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:${BRAND.headerGradient};padding:28px 24px;text-align:center;">
        ${headerBrand}
        <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:10px 0 0;">${BRAND.tagline}</p>
      </div>
      <div style="padding:28px 24px;background:${BRAND.white};">
        ${content}
      </div>
      ${footer}
    </div>`;
}

/** Send a simple test email with branded layout (brand color #051C3B). Used by test-mail script. */
export async function sendTestEmail(to: string): Promise<void> {
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>Test email</strong> – Mail config check.</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0;">If you see this, your mail config in .env is working. This email uses the Smart Health 360 brand color <span style="color:${BRAND.primary};font-weight:600;">#051C3B</span>.</p>`;
  await sendMail({
    to,
    subject: `${BRAND.name} – Mail test`,
    html: emailLayout(content),
    text: 'If you see this, your mail config in .env is working. Smart Health 360.',
  });
}

/** Escape HTML for safe insertion into templates. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Sent after user sets password (verify OTP). */
export async function sendWelcomeEmail(userName: string, userEmail: string): Promise<void> {
  const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '') + '/login';
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>This email is for: Staff</strong> (Doctor, Receptionist, or Super Admin). Your account was created by an administrator and you have now set your password.</p>
    <p style="font-size:18px;font-weight:600;color:${BRAND.primaryDark};margin:0 0 16px;">Welcome, ${escapeHtml(userName)}!</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">Your account is now active. You can log in and start using ${BRAND.name}.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${BRAND.primary};">
      <a href="${loginUrl}" style="display:inline-block;padding:14px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;">Log in →</a>
    </td></tr></table>
    <p style="font-size:14px;color:${BRAND.textMuted};margin:0;">If you have any questions, contact your administrator.</p>`;
  await sendMail({
    to: userEmail,
    subject: `Welcome to ${BRAND.name} – Staff account active`,
    html: emailLayout(content),
    text: `[Staff] Welcome! Your account is active. Log in: ${loginUrl}. Best regards, ${BRAND.name}`,
  });
}

/** Sent when a patient is registered (appointment/onboarding confirmed). */
export async function sendPatientRegistrationEmail(
  patientEmail: string,
  patientName: string,
  doctorName?: string,
  options?: { appointmentDate?: string; appointmentTime?: string }
): Promise<void> {
  const doctorRow = doctorName
    ? `<tr><td style="padding:10px 12px;font-weight:600;color:${BRAND.primaryDark};width:180px;">Assigned doctor</td><td style="padding:10px 12px;">${escapeHtml(doctorName)}</td></tr>`
    : '';
  const appointmentDateTime =
    options?.appointmentDate || options?.appointmentTime
      ? [options.appointmentDate, options.appointmentTime].filter(Boolean).join(' · ')
      : 'To be confirmed by clinic';
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>This email is for: Patient.</strong> Your appointment and registration at ${BRAND.name} have been confirmed.</p>
    <p style="font-size:18px;font-weight:600;color:${BRAND.primaryDark};margin:0 0 8px;">Registration confirmed</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">Dear ${escapeHtml(patientName)},</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">You have been successfully registered at ${BRAND.name}. Your appointment and onboarding are confirmed. <strong>Your patient appointment details are given below (mandatory).</strong></p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;background:${BRAND.bgLight};border-radius:10px;">
      <tr><td style="padding:10px 12px;font-weight:600;color:${BRAND.primaryDark};width:180px;">Status</td><td style="padding:10px 12px;">Confirmed</td></tr>
      <tr><td style="padding:10px 12px;font-weight:600;color:${BRAND.primaryDark};width:180px;">Patient appointment (date &amp; time)</td><td style="padding:10px 12px;">${escapeHtml(appointmentDateTime)}</td></tr>
      ${doctorRow}
    </table>
    <p style="font-size:14px;color:${BRAND.textMuted};margin:24px 0 0;">We will contact you with any further appointment details. If you have questions, please contact the clinic.</p>`;
  await sendMail({
    to: patientEmail,
    subject: `[Patient] Appointment & registration confirmed – ${BRAND.name}`,
    html: emailLayout(content),
    text: `[Patient] Dear ${patientName}, you are registered at ${BRAND.name}. Your patient appointment: ${appointmentDateTime}. We will contact you with further details. Best regards, ${BRAND.name}`,
  });
}

/** Sent when a doctor is assigned as primary doctor for a patient. */
export async function sendDoctorAssignmentEmail(
  doctorEmail: string,
  doctorName: string,
  patientName: string,
  options?: { assignmentDate?: string; assignmentTime?: string }
): Promise<void> {
  const treatmentDateTime =
    options?.assignmentDate || options?.assignmentTime
      ? [options.assignmentDate, options.assignmentTime].filter(Boolean).join(' · ')
      : 'To be confirmed';
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>This email is for: Doctor.</strong> You have been assigned as the primary doctor for a patient. Patient name and date/time for treatment are mentioned below.</p>
    <p style="font-size:18px;font-weight:600;color:${BRAND.primaryDark};margin:0 0 16px;">New patient assignment</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">Dear ${escapeHtml(doctorName)},</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">You have been assigned as the primary doctor for the following patient. <strong>Patient name and date/time for treatment are given below (mandatory).</strong> Please view their profile in ${BRAND.name} when you log in.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;background:${BRAND.bgLight};border-radius:10px;">
      <tr><td style="padding:12px 16px;font-weight:600;color:${BRAND.primaryDark};width:200px;">Patient name</td><td style="padding:12px 16px;">${escapeHtml(patientName)}</td></tr>
      <tr><td style="padding:12px 16px;font-weight:600;color:${BRAND.primaryDark};width:200px;">Date &amp; time for treatment</td><td style="padding:12px 16px;">${escapeHtml(treatmentDateTime)}</td></tr>
    </table>
    <p style="font-size:14px;color:${BRAND.textMuted};margin:20px 0 0;">Best regards,<br/>${BRAND.name}</p>`;
  await sendMail({
    to: doctorEmail,
    subject: `[Doctor] New patient assignment – ${BRAND.name}`,
    html: emailLayout(content),
  });
}

/** Sent when Super Admin creates a new staff user – one-time link/code to set password. */
export async function sendOTPEmail(to: string, userName: string, otp: string): Promise<void> {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  const setPasswordUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(to)}`;
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>This email is for: Staff</strong> (Doctor, Receptionist, or Super Admin). Your account was created by an administrator. Use the code below to set your password once.</p>
    <p style="font-size:18px;font-weight:600;color:${BRAND.primaryDark};margin:0 0 16px;">Set your password</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">Dear ${escapeHtml(userName)},</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 16px;">Your account has been created. Use the code below to set your password:</p>
    <div style="background:${BRAND.bgLight};border:2px dashed ${BRAND.primary};border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
      <span style="font-size:28px;font-weight:700;letter-spacing:0.35em;color:${BRAND.primaryDark};font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:14px;color:${BRAND.textMuted};margin:0 0 24px;">This code expires in 15 minutes.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:10px;background:${BRAND.primary};">
      <a href="${setPasswordUrl}" style="display:inline-block;padding:14px 28px;color:${BRAND.white};text-decoration:none;font-weight:600;font-size:15px;">Set your password →</a>
    </td></tr></table>
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0;">Or copy this link: <a href="${setPasswordUrl}" style="color:${BRAND.primary};word-break:break-all;">${setPasswordUrl}</a></p>
    <p style="font-size:13px;color:${BRAND.textMuted};margin:16px 0 0;">If you did not expect this email, please ignore it.</p>`;
  await sendMail({
    to,
    subject: `[Staff] Set your password – ${BRAND.name}`,
    html: emailLayout(content),
    text: `[Staff] Your verification code is: ${otp}. Set your password: ${setPasswordUrl}. Code expires in 15 minutes.`,
  });
}

/** Sent to Super Admin when someone exports patient records (audit notification). */
export async function sendExportAuditEmail(
  adminEmail: string,
  exportedBy: string,
  patientName: string,
  recordCount: number
): Promise<void> {
  const content = `
    <p style="font-size:13px;color:${BRAND.textMuted};margin:0 0 16px;padding:8px 12px;background:${BRAND.bgLight};border-radius:8px;border-left:4px solid ${BRAND.primary};"><strong>This email is for: Super Admin.</strong> This is an audit notification. A patient record export was performed.</p>
    <p style="font-size:18px;font-weight:600;color:${BRAND.primaryDark};margin:0 0 16px;">Export audit</p>
    <p style="font-size:15px;color:${BRAND.text};line-height:1.6;margin:0 0 20px;">An export was performed. Details below:</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      <tr style="border-bottom:1px solid ${BRAND.border};"><td style="padding:10px 0;font-weight:600;color:${BRAND.primaryDark};width:160px;">Exported by</td><td style="padding:10px 0;">${escapeHtml(exportedBy)}</td></tr>
      <tr style="border-bottom:1px solid ${BRAND.border};"><td style="padding:10px 0;font-weight:600;color:${BRAND.primaryDark};">Patient</td><td style="padding:10px 0;">${escapeHtml(patientName)}</td></tr>
      <tr><td style="padding:10px 0;font-weight:600;color:${BRAND.primaryDark};">Records included</td><td style="padding:10px 0;">${recordCount}</td></tr>
    </table>
    <p style="font-size:14px;color:${BRAND.textMuted};margin:20px 0 0;">Best regards,<br/>${BRAND.name}</p>`;
  await sendMail({
    to: adminEmail,
    subject: `[Super Admin] Export audit – ${BRAND.name}`,
    html: emailLayout(content),
  });
}
