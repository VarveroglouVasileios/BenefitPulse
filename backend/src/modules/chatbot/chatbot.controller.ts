import { Request, Response } from 'express';
import { ChatbotService } from './chatbot.service';

const chatbotService = new ChatbotService();

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, conversation } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ error: 'Το μήνυμα είναι υποχρεωτικό' });
      return;
    }

    // Build conversation messages
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Add conversation history if provided (last 10 messages to avoid token limits)
    if (Array.isArray(conversation)) {
      const recentConversation = conversation.slice(-10);
      messages.push(...recentConversation);
    }
    
    // Add current message
    messages.push({
      role: 'user',
      content: message.trim(),
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

