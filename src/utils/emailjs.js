import emailjs from '@emailjs/browser';

// EmailJS's Public Key is designed for client-side use (same trust model as
// Cloudinary's unsigned upload preset elsewhere in this app) - it's fine to
// ship in the bundle.
const EMAILJS_SERVICE_ID = 'service_80dmyxg';
const RESET_PASSWORD_TEMPLATE_ID = 'template_716dlh3';
const ACCOUNT_NOTIFICATION_TEMPLATE_ID = 'template_3owdwgb';
const EMAILJS_PUBLIC_KEY = '5HbZ07R5aInTJAzNw';

// Sends the password-reset link ourselves via a fully custom HTML template,
// instead of Firebase's own auto-sent (and much more limited) email -
// generating the link is done server-side in api/admin-update-account.js.
export const sendResetPasswordEmail = async (toEmail, resetLink) => {
  return emailjs.send(
    EMAILJS_SERVICE_ID,
    RESET_PASSWORD_TEMPLATE_ID,
    { to_email: toEmail, reset_link: resetLink },
    { publicKey: EMAILJS_PUBLIC_KEY }
  );
};

const CTA_BUTTON = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr>
      <td style="border-radius:14px; background-color:#eab308;">
        <a href="https://pbhsjrotc.vercel.app/admin" target="_blank"
           style="display:inline-block; padding:16px 32px; font-size:13px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#0f172a; text-decoration:none; border-radius:14px;">
          Go to Command Portal
        </a>
      </td>
    </tr>
  </table>`;

const SECURITY_BANNER = `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
    <tr>
      <td style="background-color:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:12px 16px;">
        <p style="margin:0; font-size:11px; font-weight:900; letter-spacing:1px; text-transform:uppercase; color:#dc2626;">
          Security Notice
        </p>
      </td>
    </tr>
  </table>`;

const FOOTNOTE = `If you didn't request this change and don't recognize it, contact your battalion's S1 immediately — someone else may have access to your account.`;

const sendAccountNotification = (params) =>
  emailjs.send(EMAILJS_SERVICE_ID, ACCOUNT_NOTIFICATION_TEMPLATE_ID, params, { publicKey: EMAILJS_PUBLIC_KEY });

// Confirms the change to the account's NEW login email.
export const sendEmailChangedNewAddress = async (newEmail) => {
  return sendAccountNotification({
    to_email: newEmail,
    heading: 'Login Email Updated',
    message: `<p style="margin:0 0 24px; font-size:14px; line-height:1.6; color:#475569;">This confirms that the Command Portal account you now sign in with uses <strong style="color:#0f172a;">${newEmail}</strong> as its login email.</p>`,
    banner: '',
    cta: CTA_BUTTON,
    footnote: FOOTNOTE,
  });
};

// Alerts the account's OLD login email that it's no longer in use, and what
// it was changed to - the security-relevant half of the notification pair.
export const sendEmailChangedOldAddress = async (oldEmail, newEmail) => {
  return sendAccountNotification({
    to_email: oldEmail,
    heading: 'Login Email Changed',
    message: `<p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#475569;">The Command Portal account that used to sign in with this inbox (<strong style="color:#0f172a;">${oldEmail}</strong>) has had its login email changed to <strong style="color:#0f172a;">${newEmail}</strong>. This inbox will no longer receive account emails.</p>`,
    banner: SECURITY_BANNER,
    cta: '',
    footnote: 'If you made this change yourself (for example, handing the account off to a successor), no action is needed. ' + FOOTNOTE,
  });
};
