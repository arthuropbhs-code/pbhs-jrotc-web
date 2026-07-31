import emailjs from '@emailjs/browser';

// EmailJS's Public Key is designed for client-side use (same trust model as
// Cloudinary's unsigned upload preset elsewhere in this app) - it's fine to
// ship in the bundle. Not set up yet: sign up at emailjs.com (free tier,
// 200 emails/month), connect an email service, create a template with a
// {{reset_link}} variable, then fill these three in.
const EMAILJS_SERVICE_ID = 'REPLACE_ME';
const EMAILJS_TEMPLATE_ID = 'REPLACE_ME';
const EMAILJS_PUBLIC_KEY = 'REPLACE_ME';

// Sends the password-reset link ourselves via a fully custom HTML template,
// instead of Firebase's own auto-sent (and much more limited) email -
// generating the link is done server-side in api/admin-update-account.js.
export const sendResetPasswordEmail = async (toEmail, resetLink) => {
  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    { to_email: toEmail, reset_link: resetLink },
    { publicKey: EMAILJS_PUBLIC_KEY }
  );
};
