<template>
  <div class="chatbot-wrapper">
    <!-- Chat Button -->
    <button
      v-if="!isOpen"
      @click="openChat"
      class="chat-button"
      aria-label="Άνοιγμα chatbot"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount }}</span>
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="chat-window">
      <div class="chat-header">
        <div class="header-content">
          <h3>BenefitPulse Assistant</h3>
          <p class="header-subtitle">Ρωτήστε με οτιδήποτε σχετικά με την πλατφόρμα</p>
        </div>
        <button @click="closeChat" class="close-button" aria-label="Κλείσιμο chatbot">
          ×
        </button>
      </div>

      <div class="chat-messages" ref="messagesContainer" @click="handleLinkClick">
        <div v-if="messages.length === 0" class="welcome-message">
          <div class="welcome-content">
            <div class="welcome-icon">🤖</div>
            <h4>Γεια σας!</h4>
            <p>Είμαι ο AI assistant του BenefitPulse. Μπορώ να σας βοηθήσω με:</p>
            <ul>
              <li>Ερωτήσεις σχετικά με το πώς λειτουργεί η πλατφόρμα</li>
              <li>Πληροφορίες για τα προγράμματα και επιδόματα</li>
              <li>Οδηγίες χρήσης</li>
            </ul>
          </div>
        </div>

        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message"
          :class="msg.role"
        >
          <div class="message-content">
            <div class="message-bubble">
              <div class="message-text" v-html="formatMessage(msg.content)"></div>
              <div class="message-time">{{ formatTime(msg.timestamp) }}</div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="message assistant">
          <div class="message-content">
            <div class="message-bubble loading-bubble">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <form @submit.prevent="sendMessage" class="chat-input-form">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Γράψτε το μήνυμά σας..."
          class="chat-input"
          :disabled="loading"
          ref="inputRef"
        />
        <button
          type="submit"
          class="send-button"
          :disabled="loading || !inputMessage.trim()"
          aria-label="Αποστολή μηνύματος"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api/endpoints';
import DOMPurify from 'dompurify';

const router = useRouter();

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const isOpen = ref(false);
const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const loading = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref<HTMLElement>();
const inputRef = ref<HTMLInputElement>();

function openChat() {
  isOpen.value = true;
  unreadCount.value = 0;
  nextTick(() => {
    scrollToBottom();
    inputRef.value?.focus();
  });
}

function closeChat() {
  isOpen.value = false;
}

function formatMessage(content: string): string {
  // Convert newlines to <br>
  let formatted = content.replace(/\n/g, '<br>');
  
  // Sanitize HTML to prevent XSS attacks
  // Allow only safe tags: br, a, strong, em, and their attributes
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['br', 'a', 'strong', 'em', 'b', 'i', 'p'],
    ALLOWED_ATTR: ['href', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

function handleLinkClick(event: Event) {
  const target = event.target as HTMLElement;
  if (target.tagName === 'A') {
    const href = (target as HTMLAnchorElement).href;
    if (href && href.startsWith(window.location.origin)) {
      // Internal link - use router
      event.preventDefault();
      const path = (target as HTMLAnchorElement).pathname + (target as HTMLAnchorElement).search;
      router.push(path);
      // Optionally close chat after navigation
      // closeChat();
    }
    // External links will open normally
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('el-GR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function sendMessage() {
  const message = inputMessage.value.trim();
  if (!message || loading.value) return;

  // Add user message
  const userMessage: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: new Date(),
  };
  messages.value.push(userMessage);
  inputMessage.value = '';
  
  scrollToBottom();

  // Prepare conversation history (without timestamps for API)
  const conversation = messages.value.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));

  loading.value = true;

  try {
    const response = await api.chatbot.chat({
      message,
      conversation: conversation.slice(0, -1), // Exclude current message
    });

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: response.data.message,
      timestamp: new Date(),
    };
    messages.value.push(assistantMessage);
  } catch (error: any) {
    const errorMessage: ChatMessage = {
      role: 'assistant',
      content: error.response?.data?.error || 'Συγγνώμη, συνέβη κάποιο σφάλμα. Παρακαλώ δοκιμάστε ξανά.',
      timestamp: new Date(),
    };
    messages.value.push(errorMessage);
  } finally {
    loading.value = false;
    scrollToBottom();
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
}

// Watch for new messages when chat is closed
watch(
  () => messages.value.length,
  (newLength, oldLength) => {
    if (!isOpen.value && newLength > oldLength) {
      // Check if last message is from assistant
      const lastMessage = messages.value[messages.value.length - 1];
      if (lastMessage?.role === 'assistant') {
        unreadCount.value++;
      }
    }
  }
);

onMounted(() => {
  // Focus input when chat opens
  watch(isOpen, (open) => {
    if (open) {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  });
});
</script>

<style scoped>
.chatbot-wrapper {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 999;
}

/* Chat Button */
.chat-button {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  transition: all 0.3s ease;
  position: relative;
}

.chat-button:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.chat-button .badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Chat Window */
.chat-window {
  width: 400px;
  max-width: calc(100vw - 2rem);
  height: 600px;
  max-height: calc(100vh - 4rem);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  background: var(--accent-primary);
  color: white;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.header-subtitle {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.close-button {
  background: transparent;
  border: none;
  color: white;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background 0.2s;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Messages */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.welcome-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
}

.welcome-content {
  text-align: center;
  color: var(--text-secondary);
}

.welcome-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.welcome-content h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  font-size: 1.25rem;
}

.welcome-content p {
  margin: 0 0 1rem 0;
}

.welcome-content ul {
  text-align: left;
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.welcome-content li {
  margin-bottom: 0.5rem;
}

.message {
  display: flex;
  flex-direction: column;
}

.message.user {
  align-items: flex-end;
}

.message.assistant {
  align-items: flex-start;
}

.message-content {
  max-width: 75%;
}

.message-bubble {
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  word-wrap: break-word;
}

.message.user .message-bubble {
  background: var(--accent-primary);
  color: white;
  border-bottom-right-radius: 0.25rem;
}

.message.assistant .message-bubble {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 0.25rem;
}

.message-text {
  line-height: 1.5;
  margin-bottom: 0.25rem;
}

.message-text a {
  color: var(--accent-primary);
  text-decoration: underline;
  transition: color 0.2s;
}

.message-text a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.message.assistant .message-text a {
  color: var(--accent-primary);
}

.message-time {
  font-size: 0.7rem;
  opacity: 0.7;
  margin-top: 0.25rem;
}

.loading-bubble {
  padding: 1rem;
}

.typing-indicator {
  display: flex;
  gap: 0.25rem;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-tertiary);
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

/* Input Form */
.chat-input-form {
  display: flex;
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  gap: 0.5rem;
  background: var(--bg-secondary);
}

.chat-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-color);
  border-radius: 1.5rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.chat-input:focus {
  border-color: var(--accent-primary);
}

.chat-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.send-button:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scrollbar */
.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--border-hover);
}

@media (max-width: 768px) {
  .chatbot-wrapper {
    bottom: 1rem;
    right: 1rem;
  }

  .chat-window {
    width: calc(100vw - 2rem);
    height: calc(100vh - 2rem);
    max-height: calc(100vh - 2rem);
  }
}
</style>



