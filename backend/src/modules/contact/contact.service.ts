import { Event } from "../../models/event.model";
import { sendEmail } from "../../utils/email";
import { config } from "../../config/env";

/**
 * Escape HTML special characters to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

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

        // Escape user input to prevent XSS attacks
        const safeName = escapeHtml(data.name);
        const safeEmail = escapeHtml(data.email);
        const safeSubject = escapeHtml(data.subject);
        const safeMessage = escapeHtml(data.message);
        const safeTypeLabel = typeLabels[data.type] || data.type;

        await sendEmail({
          to: config.admin.email,
          subject: `[BenefitPulse] Νέα υποβολή: ${safeTypeLabel}`,
          html: `
            <h2>Νέα υποβολή επικοινωνίας</h2>
            <p><strong>Τύπος:</strong> ${safeTypeLabel}</p>
            <p><strong>Από:</strong> ${safeName} (${safeEmail})</p>
            <p><strong>Θέμα:</strong> ${safeSubject}</p>
            <p><strong>Μήνυμα:</strong></p>
            <div style="background: #f5f5f5; padding: 1rem; border-radius: 0.5rem; white-space: pre-wrap;">${safeMessage}</div>
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

