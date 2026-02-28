import { Request, Response } from "express";
import { ContactService } from "./contact.service";

const contactService = new ContactService();

const MAX_LENGTHS = { name: 200, email: 254, subject: 300, message: 5000 };
const VALID_TYPES = ["error", "source", "general"];

export async function submitContact(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, subject, message, type } = req.body;

    if (!name || !email || !subject || !message || !type) {
      res.status(400).json({ error: "Όλα τα πεδία είναι υποχρεωτικά" });
      return;
    }

    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "Μη έγκυρος τύπος φόρμας" });
      return;
    }

    const nameStr = String(name).trim();
    const emailStr = String(email).trim();
    const subjectStr = String(subject).trim();
    const messageStr = String(message).trim();

    if (
      nameStr.length > MAX_LENGTHS.name ||
      emailStr.length > MAX_LENGTHS.email ||
      subjectStr.length > MAX_LENGTHS.subject ||
      messageStr.length > MAX_LENGTHS.message
    ) {
      res.status(400).json({ error: "Ένα ή περισσότερα πεδία υπερβαίνουν το επιτρεπόμενο μήκος" });
      return;
    }

    // Basic email format check
    const emailSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailSimple.test(emailStr)) {
      res.status(400).json({ error: "Μη έγκυρη διεύθυνση email" });
      return;
    }

    await contactService.submitContact({
      name: nameStr,
      email: emailStr,
      subject: subjectStr,
      message: messageStr,
      type: type as "error" | "source" | "general",
    });

    res.status(200).json({ message: "Το μήνυμά σας στάλθηκε επιτυχώς" });
  } catch (error: any) {
    console.error("Contact form error:", error);
    res.status(500).json({ error: "Σφάλμα κατά την αποστολή. Παρακαλώ δοκιμάστε ξανά." });
  }
}



