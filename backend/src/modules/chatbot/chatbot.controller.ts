import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { escapeHtml } from '../../utils/validation';

const chatbotService = new ChatbotService();

/** Strip HTML and limit length - prevents XSS and prompt injection from client-controlled history */
function sanitizeConversationMessage(content: unknown, maxLen = 2000): string {
  if (!content || typeof content !== 'string') return '';
  return escapeHtml(content.trim()).substring(0, maxLen);
}

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, conversation } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Το μήνυμα είναι υποχρεωτικό' });
      return;
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      res.status(400).json({ error: 'Το μήνυμα είναι πολύ μεγάλο' });
      return;
    }

    // Build conversation messages - sanitize client-provided history to prevent XSS/prompt injection
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (Array.isArray(conversation)) {
      const recentConversation = conversation.slice(-10);
      for (const m of recentConversation) {
        if (m && (m.role === 'user' || m.role === 'assistant') && m.content) {
          messages.push({
            role: m.role,
            content: sanitizeConversationMessage(m.content),
          });
        }
      }
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: trimmedMessage,
    });

    // Convert to format expected by service
    const chatMessages = chatbotService.convertToMessages(messages);

    // Get response from chatbot
    const response = await chatbotService.chat(chatMessages);

    res.status(200).json({
      message: response.message,
    });
  } catch (error: any) {
    console.error('Chatbot controller error:', error);
    res.status(500).json({ error: 'Σφάλμα κατά την επεξεργασία του αιτήματος' });
  }
}

