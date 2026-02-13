/**
 * Test role email templates – sends real emails to doctor, receptionist, and patient
 * for demo/showcase. Uses MAIL_* from .env.
 *
 * Run from backend: npm run test-role-emails
 * Or: npx ts-node src/scripts/testRoleEmails.ts
 */

import 'dotenv/config';
import {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPatientRegistrationEmail,
  sendDoctorAssignmentEmail,
} from '../services/mail';

const DEMO = {
  doctor: {
    email: 'narendravarapusatya@gmail.com',
    name: 'Dr. Narendra Varapusatya',
  },
  receptionist: {
    email: 'narendravarapusatyavenkat@gmail.com',
    name: 'Venkat (Receptionist)',
  },
  patient: {
    email: 'satyanarendravarapu27@gmail.com',
    name: 'Satya Narendra Varapu',
  },
};

const TEST_OTP = '847291';

async function main() {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    console.error('MAIL_USER and MAIL_PASS must be set in .env');
    process.exit(1);
  }

  console.log('Sending demo emails (Smart Health 360 – role templates)...\n');

  try {
    // 1. Doctor – Set password (as if SA just created the user)
    console.log('1. Doctor – Set password email →', DEMO.doctor.email);
    await sendOTPEmail(DEMO.doctor.email, DEMO.doctor.name, TEST_OTP);
    console.log('   Sent.\n');

    // 2. Doctor – Welcome (as if they just set password)
    console.log('2. Doctor – Welcome email →', DEMO.doctor.email);
    await sendWelcomeEmail(DEMO.doctor.name, DEMO.doctor.email);
    console.log('   Sent.\n');

    // 3. Receptionist – Set password
    console.log('3. Receptionist – Set password email →', DEMO.receptionist.email);
    await sendOTPEmail(DEMO.receptionist.email, DEMO.receptionist.name, TEST_OTP);
    console.log('   Sent.\n');

    // 4. Receptionist – Welcome
    console.log('4. Receptionist – Welcome email →', DEMO.receptionist.email);
    await sendWelcomeEmail(DEMO.receptionist.name, DEMO.receptionist.email);
    console.log('   Sent.\n');

    // 5. Patient – Appointment & registration confirmation
    console.log('5. Patient – Appointment / registration confirmation →', DEMO.patient.email);
    await sendPatientRegistrationEmail(
      DEMO.patient.email,
      DEMO.patient.name,
      DEMO.doctor.name
    );
    console.log('   Sent.\n');

    // 6. Doctor – New patient assignment
    console.log('6. Doctor – New patient assignment →', DEMO.doctor.email);
    const now = new Date();
    const assignmentDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const assignmentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    await sendDoctorAssignmentEmail(
      DEMO.doctor.email,
      DEMO.doctor.name,
      DEMO.patient.name,
      { assignmentDate, assignmentTime }
    );
    console.log('   Sent.\n');

    console.log('Done. All 6 emails sent. Check inboxes (and spam).');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
