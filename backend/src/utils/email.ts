import nodemailer from 'nodemailer';
import { config } from '../config/env';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure,
  auth: config.email.smtp.auth?.user && config.email.smtp.auth?.pass
    ? {
        user: config.email.smtp.auth.user,
        pass: config.email.smtp.auth.pass,
      }
    : undefined,
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // If email is not configured, log instead of sending
  if (!config.email.smtp.auth?.user || !config.email.smtp.auth?.pass) {
    console.log('📧 Email not configured. Would send:', {
      to: options.to,
      subject: options.subject,
      html: options.html.substring(0, 100) + '...',
    });
    return;
  }

  try {
    await transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    });
    console.log(`✅ Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    throw error;
  }
}

export function generateContactReplyEmail(
  userName: string,
  originalMessage: string,
  replyMessage: string
): string {
  return `
<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Απάντηση από BenefitPulse</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">BenefitPulse</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">Γεια σας ${userName},</h2>
              
              <p style="color: #6b7280; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Ευχαριστούμε που επικοινωνήσατε μαζί μας. Παρακάτω μπορείτε να δείτε την απάντησή μας στο μήνυμά σας:
              </p>
              
              <!-- Original Message -->
              <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Το αρχικό σας μήνυμα:</p>
                <p style="color: #111827; margin: 0; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${originalMessage}</p>
              </div>
              
              <!-- Reply Message -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px; font-weight: 600; text-transform: uppercase;">Η απάντησή μας:</p>
                <div style="color: #111827; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${replyMessage.replace(/\n/g, '<br>')}</div>
              </div>
              
              <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                Αν έχετε κάποια άλλη ερώτηση, μη διστάσετε να επικοινωνήσετε ξανά μαζί μας.
              </p>
              
              <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                Με εκτίμηση,<br>
                <strong>Η ομάδα του BenefitPulse</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px; line-height: 1.5;">
                <strong>BenefitPulse</strong><br>
                Aggregator επίσημων πηγών για επιδόματα & προγράμματα
              </p>
              <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 11px; line-height: 1.5;">
                Αυτό το email στάλθηκε ως απάντηση στο μήνυμά σας.<br>
                Αν δεν έχετε στείλει μήνυμα, παρακαλώ αγνοήστε αυτό το email.
              </p>
              <p style="color: #9ca3af; margin: 20px 0 0 0; font-size: 11px;">
                <a href="${config.frontendUrl}" style="color: #3b82f6; text-decoration: none;">BenefitPulse.gr</a> |
                <a href="${config.frontendUrl}/privacy" style="color: #3b82f6; text-decoration: none;">Πολιτική Απορρήτου</a> |
                <a href="${config.frontendUrl}/terms" style="color: #3b82f6; text-decoration: none;">Όροι Χρήσης</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

