/**
 * Test mail config: loads .env and sends one branded email to MAIL_USER (brand color #051C3B).
 * Run: npm run test-mail  (or npx ts-node src/scripts/testMail.ts)
 */
import 'dotenv/config';
import { sendTestEmail } from '../services/mail';

const to = process.env.MAIL_USER;
if (!to) {
  console.error('MAIL_USER is not set in .env');
  process.exit(1);
}

sendTestEmail(to)
  .then(() => {
    console.log('Mail sent successfully to', to);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Mail failed:', err.message);
    process.exit(1);
  });
