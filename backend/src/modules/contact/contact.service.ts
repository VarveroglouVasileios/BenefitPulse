import { Event } from "../../models/event.model";
import { sendEmail } from "../../utils/email";
import { config } from "../../config/env";

interface ContactData {
  name: string;
  email: string;
  subject: string;
  message: string;
  type: "error" | "source" | "general";
}

export class ContactService {
  async submitContact(data: ContactData): Promise<void> {
    // Store contact form submission as an event
    await Event.create({
      type: "contact_form",
      path: `/contact/${data.type}`,
      userId: undefined, // Contact forms can be anonymous
      sessionId: undefined,
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        formType: data.type,
      },
    });

    // Send notification email to admin (if email is configured)
    if (config.email.smtp.auth?.user && config.admin.email) {
      try {
        const typeLabels: Record<string, string> = {
          error: "Αναφορά λάθους",
          source: "Πρόταση πηγής",
          general: "Γενική επικοινωνία",
        };

        await sendEmail({
          to: config.admin.email,
          subject: `[BenefitPulse] Νέα υποβολή: ${typeLabels[data.type] || data.type}`,
          html: `
            <h2>Νέα υποβολή επικοινωνίας</h2>
            <p><strong>Τύπος:</strong> ${typeLabels[data.type] || data.type}</p>
            <p><strong>Από:</strong> ${data.name} (${data.email})</p>
            <p><strong>Θέμα:</strong> ${data.subject}</p>
            <p><strong>Μήνυμα:</strong></p>
            <div style="background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap;">${data.message}</div>
            <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
              Απάντησε από το admin panel: <a href="${config.frontendUrl}/admin/contact">${config.frontendUrl}/admin/contact</a>
            </p>
          `,
        });
      } catch (error) {
        console.error("Failed to send admin notification email:", error);
        // Don't fail the submission if email fails
      }
    }

    console.log("Contact form submission:", {
      type: data.type,
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });
  }
}

