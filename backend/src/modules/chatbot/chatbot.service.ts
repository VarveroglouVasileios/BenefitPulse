import axios from 'axios';
import { config } from '../../config/env';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  message: string;
}

let primaryModelWindow: number[] = [];

function canUsePrimaryModel(): boolean {
  const rpm = Math.max(1, config.chatbot.primaryRpm || 20);
  const now = Date.now();
  const windowStart = now - 60_000;
  primaryModelWindow = primaryModelWindow.filter((t) => t >= windowStart);
  return primaryModelWindow.length < rpm;
}

function markPrimaryModelUse(): void {
  primaryModelWindow.push(Date.now());
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

      const primaryModel = config.chatbot.primaryModel || config.chatbot.model;
      const fallbackModel = config.chatbot.fallbackModel || "llama-3.1-8b-instant";

      const modelsToTry: string[] = [];
      if (canUsePrimaryModel()) {
        modelsToTry.push(primaryModel);
      } else {
        console.warn(
          `[chatbot] Primary model RPM guard reached (${config.chatbot.primaryRpm}/min). Using fallback model.`,
        );
      }
      if (!modelsToTry.includes(fallbackModel)) {
        modelsToTry.push(fallbackModel);
      }

      let response: any;
      let lastError: any;
      for (const model of modelsToTry) {
        try {
          const payload = {
            model,
            messages: apiMessages,
            max_tokens: 800,
            temperature: 0.7,
          };

          response = await axios.post(
            config.chatbot.apiUrl,
            payload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              timeout: 15000,
            }
          );

          if (model === primaryModel) {
            markPrimaryModelUse();
          }

          break;
        } catch (error: any) {
          lastError = error;
          const status = error?.response?.status;
          if (status === 429 && model === primaryModel && fallbackModel !== primaryModel) {
            console.warn("[chatbot] Primary model returned 429, switching to fallback.");
            continue;
          }
          throw error;
        }
      }
      if (!response) {
        throw lastError || new Error("No chatbot response from provider");
      }

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

