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

export async function sendPatientRegistrationEmail(patientEmail: string, patientName: string): Promise<void> {
  await sendMail({
    to: patientEmail,
    subject: 'Registration Confirmation - Smart Health 360',
    html: `
      <h2>Welcome</h2>
      <p>Dear ${patientName},</p>
      <p>You have been registered at Smart Health 360. We look forward to serving you.</p>
      <p>Best regards,<br/>Smart Health 360</p>
    `,
  });
}

export async function sendDoctorAssignmentEmail(
  doctorEmail: string,
  doctorName: string,
  patientName: string
): Promise<void> {
  await sendMail({
    to: doctorEmail,
    subject: 'New Patient Assignment - Smart Health 360',
    html: `
      <h2>Patient Assignment</h2>
      <p>Dear ${doctorName},</p>
      <p>You have been assigned as the primary doctor for patient: <strong>${patientName}</strong>.</p>
      <p>Best regards,<br/>Smart Health 360</p>
    `,
  });
}

export async function sendOTPEmail(to: string, userName: string, otp: string): Promise<void> {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:4200').replace(/\/$/, '');
  const setPasswordUrl = `${baseUrl}/verify-email?email=${encodeURIComponent(to)}`;
  await sendMail({
    to,
    subject: 'Set your password - Smart Health 360',
    html: `
      <h2>Set your password</h2>
      <p>Dear ${userName},</p>
      <p>Your account has been created. Use the code below to set your password:</p>
      <p><strong style="font-size:1.25rem;letter-spacing:0.2em;">${otp}</strong></p>
      <p>This code expires in 15 minutes.</p>
      <p><a href="${setPasswordUrl}" style="display:inline-block;padding:0.75rem 1.5rem;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;margin:0.5rem 0;">Set your password →</a></p>
      <p>Or copy this link: ${setPasswordUrl}</p>
      <p>If you did not expect this email, please ignore it.</p>
      <p>Best regards,<br/>Smart Health 360</p>
    `,
    text: `Your verification code is: ${otp}. Set your password: ${setPasswordUrl}. Code expires in 15 minutes.`,
  });
}

export async function sendExportAuditEmail(
  adminEmail: string,
  exportedBy: string,
  patientName: string,
  recordCount: number
): Promise<void> {
  await sendMail({
    to: adminEmail,
    subject: 'Export Audit - Smart Health 360',
    html: `
      <h2>Export Audit</h2>
      <p>An export was performed.</p>
      <ul>
        <li>Exported by: ${exportedBy}</li>
        <li>Patient: ${patientName}</li>
        <li>Records included: ${recordCount}</li>
      </ul>
      <p>Best regards,<br/>Smart Health 360</p>
    `,
  });
}
