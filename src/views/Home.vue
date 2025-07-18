<template>
  <div class="home-layout">
    <Sidebar />

    <main class="main-content">
      <ChatContainer
          :current-theme="currentTheme"
          @toggle-theme="$emit('toggle-theme')"
          @send-message-from-container="handleSendMessage"
          @edit-and-send="handleEditAndSend"
          @regenerate="handleRegenerate"
      />
      <div class="input-area">
        <!-- Stop Generation Button -->
        <button v-if="chatStore.isTyping" @click="stopGeneration" class="stop-btn" title="中止生成">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12"></rect>
          </svg>
          <span>中止</span>
        </button>
        <InputBox @send-message="handleSendMessage" />
      </div>
    </main>
  </div>
</template>

<script setup>
import { useChatStore } from '@/store';
import Sidebar from '@/components/Sidebar.vue';
import ChatContainer from '@/components/ChatContainer.vue';
import InputBox from '@/components/InputBox.vue';
import { streamChat } from '@/services/ollama.js';

defineProps({ currentTheme: String });
defineEmits(['toggle-theme']);

const chatStore = useChatStore();

/**
 * Main function to send a message and handle the streaming response.
 */
const handleSendMessage = async (text) => {
  if (!text.trim()) return;

  // 1. Create and store an AbortController for this request
  const controller = new AbortController();
  chatStore.setCurrentRequestController(controller);

  // (计时器) 记录开始时间
  const startTime = performance.now();

  // 2. Add user message to the store
  chatStore.addMessage({
    role: 'user',
    content: text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // 3. Add a placeholder for the assistant's response
  const assistantMessageId = chatStore.addMessage({
    role: 'assistant',
    content: null, // `null` indicates the message is being generated
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // 4. Prepare message history for the API call
  const history = chatStore.messages
      .filter(m => m.id !== assistantMessageId) // Exclude the current placeholder
      .map(msg => ({ role: msg.role, content: msg.content }));

  // 5. Set typing status to true to show the indicator and stop button
  chatStore.setTypingStatus(true);

  try {
    // 6. Call the streaming API
    await streamChat(
        chatStore.currentModel,
        history,
        (contentChunk) => { // onStream callback
          chatStore.updateMessageContent({
            messageId: assistantMessageId,
            contentChunk: contentChunk
          });
        },
        () => { // onDone callback
          // (计时器) 计算并设置总时长
          const endTime = performance.now();
          const duration = ((endTime - startTime) / 1000).toFixed(1); // 秒，保留一位小数
          chatStore.setMessageDuration(assistantMessageId, duration);

          chatStore.setTypingStatus(false);
          chatStore.setCurrentRequestController(null);
        },
        controller.signal // Pass the abort signal
    );
  } catch (error) {
    // 7. Handle errors, especially AbortError
    if (error.name === 'AbortError') {
      console.log('Request aborted by user.');
      const msg = chatStore.messages.find(m => m.id === assistantMessageId);
      if (msg && msg.content === null) {
        // If no content was generated, remove the placeholder entirely
         chatStore.messages.pop();
      } else if (msg) {
        // If some content was generated, mark it as stopped
        msg.content += '\n\n*(已中止)*';
        // (计时器) 中止时也记录时间
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(1);
        chatStore.setMessageDuration(assistantMessageId, duration);
      }
    } else {
      console.error('An error occurred during streaming:', error);
    }
    // 8. Clean up state
    chatStore.setTypingStatus(false);
    chatStore.setCurrentRequestController(null);
  }
};

/**
 * Handles the 'edit-and-send' event from a MessageItem.
 */
const handleEditAndSend = ({ messageId, newContent }) => {
  const messageIndex = chatStore.messages.findIndex(m => m.id === messageId);
  if (messageIndex === -1) return;

  // Abort any ongoing requests
  chatStore.abortCurrentRequest();
  // Truncate the history from the edited message onwards
  chatStore.replaceMessagesFromIndex(messageIndex);
  // Send the edited content as a new message
  handleSendMessage(newContent);
};

/**
 * Handles the 'regenerate' event from a MessageItem.
 */
const handleRegenerate = (assistantMessage) => {
  const messageIndex = chatStore.messages.findIndex(m => m.id === assistantMessage.id);
  // Ensure there is a user message before the assistant message
  if (messageIndex < 1) return;

  const userMessage = chatStore.messages[messageIndex - 1];
  if (userMessage.role !== 'user') return;

  // Abort any ongoing requests
  chatStore.abortCurrentRequest();
  // Truncate the history, removing the previous user message and the assistant response
  chatStore.replaceMessagesFromIndex(messageIndex - 1);
  // Resend the content of that user message
  handleSendMessage(userMessage.content);
};

/**
 * Stops the current AI response generation.
 */
const stopGeneration = () => {
  chatStore.abortCurrentRequest();
};
</script>

<style scoped>
.home-layout { display: flex; height: 100vh; width: 100vw; }
.main-content { flex-grow: 1; display: flex; flex-direction: column; height: 100%; overflow-y: hidden; background-color: var(--primary-bg); }
.input-area {
  padding: 1rem 1.5rem 1.5rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 940px;
  margin: 0 auto;
  background-color: var(--primary-bg);
  /* (New) Center the stop button above the input box */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.stop-btn {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background-color: var(--secondary-bg);
  color: var(--text-primary);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
}
.stop-btn:hover { background-color: var(--hover-bg); }
/* Ensure InputBox takes full width inside the flex container */
.input-area > :last-child {
  width: 100%;
}
</style>
