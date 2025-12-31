import Groq from "groq-sdk";
import { config } from "../../config/env";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatResponse {
  message: string;
}

export class ChatbotService {
  private groq: Groq;
  private readonly model: string;
  private readonly systemPrompt: string;

  constructor() {
    // Initialize Groq client
    if (!config.groq.apiKey) {
      console.warn(
        "⚠️  GROQ_API_KEY not set. Chatbot will use fallback responses."
      );
    }

    this.groq = new Groq({
      apiKey: config.groq.apiKey,
    });

    this.model = config.chatbot.model || "llama-3.3-70b-versatile";

    // System prompt for BenefitPulse Assistant
    this.systemPrompt = `Είσαι ο BenefitPulse Assistant, ένας εξυπηρετητικός βοηθός που βοηθάει τους χρήστες να κατανοήσουν τις ελληνικές κρατικές παροχές και επιδόματα.

Σημαντικές οδηγίες:
- Μιλάς ΑΥΣΤΗΡΑ ΕΛΛΗΝΙΚΑ. Ποτέ αγγλικά εκτός αν ο χρήστης ρωτήσει συγκεκριμένα.
- Τόνος: Εξυπηρετητικός, συμπαθητικός και συνοπτικός.
- Δεν είσαι δικηγόρος. Πάντα συμβουλεύεις τους χρήστες να ελέγξουν επίσημες πηγές (gov.gr, ΔΥΠΑ, ΟΠΕΚΑ, κλπ).
- Αν ο χρήστης ρωτήσει για συγκεκριμένα live δεδομένα που δεν έχεις πρόσβαση, πες τους να δουν τις καρτέλες "Όλα" ή "Νέα" στην πλατφόρμα.
- Αν δεν γνωρίζεις κάτι, πες το ειλικρινά και προτείνεις επίσημες πηγές.
- Κρατάς τις απαντήσεις σου σύντομες και εστιασμένες (max 3-4 προτάσεις εκτός αν ο χρήστης ζητήσει περισσότερες λεπτομέρειες).`;
  }

  /**
   * Process chat message using Groq LLM
   */
  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Get the last user message
    const userMessages = messages.filter((msg) => msg.role === "user");
    if (userMessages.length === 0) {
      return {
        message: "Πώς μπορώ να σας βοηθήσω;",
      };
    }

    const lastMessage = userMessages[userMessages.length - 1].content.trim();

    // Handle empty messages
    if (!lastMessage || lastMessage.length === 0) {
      return {
        message: "Παρακαλώ γράψτε κάτι για να σας βοηθήσω.",
      };
    }

    // Check if API key is configured
    if (!config.groq.apiKey) {
      return {
        message:
          "Η υπηρεσία αντιμετωπίζει προσωρινό φόρτο. Παρακαλώ δοκιμάστε αργότερα.",
      };
    }

    try {
      // Build messages array for Groq API
      const groqMessages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }> = [
        {
          role: "system",
          content: this.systemPrompt,
        },
      ];

      // Add conversation history (last 10 messages to avoid token limits)
      // Filter out system messages from history as we add our own
      const conversationHistory = messages
        .filter((msg) => msg.role !== "system")
        .slice(-10);

      groqMessages.push(...conversationHistory);

      // Call Groq API
      const completion = await this.groq.chat.completions.create({
        model: this.model,
        messages: groqMessages as any,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 1,
        stream: false,
      });

      // Extract response
      const responseContent = completion.choices[0]?.message?.content?.trim();

      if (!responseContent) {
        throw new Error("Empty response from Groq API");
      }

      return {
        message: responseContent,
      };
    } catch (error: any) {
      console.error("Groq API error:", error);

      // Return polite fallback message in Greek
      return {
        message:
          "Η υπηρεσία αντιμετωπίζει προσωρινό φόρτο. Παρακαλώ δοκιμάστε αργότερα.",
      };
    }
  }

  // Helper to convert conversation history to messages format
  convertToMessages(
    conversation: Array<{ role: "user" | "assistant"; content: string }>
  ): ChatMessage[] {
    return conversation.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}
