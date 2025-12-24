import { getResponse } from './chatbot-rules';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  message: string;
}

export class ChatbotService {
  /**
   * Process chat message using rule-based system
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Get the last user message
    const userMessages = messages.filter(msg => msg.role === 'user');
    if (userMessages.length === 0) {
      return {
        message: 'Πώς μπορώ να σας βοηθήσω;',
      };
    }

    const lastMessage = userMessages[userMessages.length - 1].content;

    // Get response from rule-based system
    const response = getResponse(lastMessage);

    return {
      message: response,
    };
  }

  // Helper to convert conversation history to messages format
  convertToMessages(conversation: Array<{ role: 'user' | 'assistant'; content: string }>): ChatMessage[] {
    return conversation.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

