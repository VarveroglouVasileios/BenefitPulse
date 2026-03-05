import nodemailer from 'nodemailer';
import { config } from '../config/env';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth: config.email.smtp.auth,
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.from}>`,
        to,
        subject,
        html,
      });
      console.log(`📧 Email sent: ${info.messageId}`);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      // Don't throw - we don't want to break the flow if email fails
    }
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<void> {
    const subject = `Καλωσήρθες στο BenefitPulse! 🚀`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #fff; margin: 0;">BenefitPulse</h1>
        </div>
        
        <div style="padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Γεια σου ${firstName}! 👋</h2>
          
          <p style="font-size: 16px; line-height: 1.6;">
            Καλωσήρθες στην κοινότητα του BenefitPulse! Χαιρόμαστε πολύ που είσαι μαζί μας.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            Ο λογαριασμός σου δημιουργήθηκε με επιτυχία. Τώρα μπορείς να παρακολουθείς όλα τα τρέχοντα επιδόματα και προγράμματα σε πραγματικό χρόνο.
          </p>

          <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-weight: bold; color: #334155;">💡 Τι μπορείς να κάνεις τώρα;</p>
            <ul style="margin-top: 10px; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 8px;">Ρύθμισε το προφίλ σου για προσωποποιημένες προτάσεις</li>
              <li style="margin-bottom: 8px;">Αποθήκευσε τα αγαπημένα σου προγράμματα</li>
              <li>Ενεργοποίησε τις ειδοποιήσεις για να μαθαίνεις πρώτος νέα</li>
            </ul>
          </div>

          <center>
            <a href="${config.frontendUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Μετάβαση στο BenefitPulse</a>
          </center>

          <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
            Αν έχεις οποιαδήποτε απορία, απλά απάντησε σε αυτό το email!
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">
            &copy; 2026 BenefitPulse. All rights reserved.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(to, subject, html);
  }
}

export const emailService = new EmailService();
