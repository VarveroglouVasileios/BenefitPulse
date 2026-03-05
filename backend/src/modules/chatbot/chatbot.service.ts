import axios from 'axios';
import { config } from '../../config/env';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  message: string;
}

export class ChatbotService {
  /**
   * Process chat message using Groq/OpenAI Compatible API
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      // Get the last user message to check for empty input
      const userMessages = messages.filter(msg => msg.role === 'user');
      if (userMessages.length === 0) {
        return { message: 'Πώς μπορώ να σας βοηθήσω;' };
      }

      const apiKey = config.chatbot.apiKey;
      if (!apiKey) {
        console.error('Chatbot API Key is missing (GROQ_API_KEY/CHATBOT_API_KEY)');
        return { message: 'Συγγνώμη, υπάρχει τεχνικό πρόβλημα με τη σύνδεση AI.' };
      }

      const systemPrompt = `Είσαι ο βοηθός του BenefitPulse, μιας πλατφόρμας που βοηθάει τους πολίτες να βρουν επιδόματα και παροχές στην Ελλάδα. 
      Απάντα σύντομα, ευγενικά και στα Ελληνικά. Μην δίνεις νομικές συμβουλές. Αν δεν ξέρεις κάτι, πες το.
      Βασικός στόχος είναι να βοηθήσεις τον χρήστη να βρει κατάλληλα προγράμματα βάσει του προφίλ του.`;

      // Construct OpenAI-format messages
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      const payload = {
        model: config.chatbot.model,
        messages: apiMessages,
        max_tokens: 800,
        temperature: 0.7,
      };

      const response = await axios.post(
        config.chatbot.apiUrl,
        payload,
        {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );

      // Parse OpenAI/Groq response
      if (
        response.data && 
        response.data.choices && 
        response.data.choices.length > 0 &&
        response.data.choices[0].message
      ) {
        return { message: response.data.choices[0].message.content };
      } else {
        console.error('Unexpected Chatbot API response structure:', JSON.stringify(response.data));
        return { message: 'Δεν κατάλαβα την απάντηση, μπορείτε να επαναλάβετε;' };
      }

    } catch (error: any) {
      console.error('Chatbot API Error:', error.response?.data || error.message);
      return { 
        message: 'Υπήρξε ένα πρόβλημα στην επικοινωνία μου. Παρακαλώ δοκιμάστε ξανά αργότερα.' 
      };
    }
  }

  // Helper to convert conversation history to messages format
  convertToMessages(conversation: Array<{ role: 'user' | 'assistant'; content: string }>): ChatMessage[] {
    return conversation.map(msg => ({
      role: msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' ? msg.role : 'user',
      content: msg.content,
    }));
  }
}

