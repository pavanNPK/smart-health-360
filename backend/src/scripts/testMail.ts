/**
 * Test mail config: loads .env and sends one email to MAIL_USER.
 * Run: npm run test-mail  (or npx ts-node src/scripts/testMail.ts)
 */
import 'dotenv/config';
import { sendMail } from '../services/mail';

const to = process.env.MAIL_USER;
if (!to) {
  console.error('MAIL_USER is not set in .env');
  process.exit(1);
}

sendMail({
  to,
  subject: 'Smart Health 360 – Mail test',
  html: '<p>If you see this, your mail config in .env is working.</p>',
  text: 'If you see this, your mail config in .env is working.',
})
  .then(() => {
    console.log('Mail sent successfully to', to);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Mail failed:', err.message);
    process.exit(1);
  });
