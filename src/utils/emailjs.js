import emailjs from '@emailjs/browser';

// EmailJS's Public Key is designed for client-side use (same trust model as
// Cloudinary's unsigned upload preset elsewhere in this app) - it's fine to
// ship in the bundle.
const EMAILJS_SERVICE_ID = 'service_80dmyxg';
const EMAILJS_TEMPLATE_ID = 'template_716dlh3';
const EMAILJS_PUBLIC_KEY = '5HbZ07R5aInTJAzNw';

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
