import { Request, Response } from "express";
import { ContactService } from "./contact.service";

const contactService = new ContactService();

export async function submitContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, subject, message, type } = req.body;

    if (!name || !email || !subject || !message || !type) {
      res.status(400).json({ error: "Όλα τα πεδία είναι υποχρεωτικά" });
      return;
    }

    await contactService.submitContact({
      name,
      email,
      subject,
      message,
      type,
    });

    res.status(200).json({ message: "Το μήνυμά σας στάλθηκε επιτυχώς" });
  } catch (error: any) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Σφάλμα κατά την αποστολή. Παρακαλώ δοκιμάστε ξανά." });
  }
}



