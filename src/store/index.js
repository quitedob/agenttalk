// src/store/index.js
import { defineStore } from 'pinia';
export const useChatStore = defineStore('chat', {
    state: () => ({
        currentModel: 'Gemma3:4b',
        // messages 数组现在可以包含不同类型的消息对象
        messages: [],
        isTyping: false,
        isSettingsModalOpen: false,
        // (新增) 用于中止请求的控制器
        currentRequestController: null,
        personalizationSettings: {
            userNickname: '',
            userProfession: '',
            chatGptCharacteristics: '',
            additionalInfo: '',
            enableForNewChats: true,
        },
    }),
    actions: {
        setModel(modelName) { this.currentModel = modelName; },
        addMessage(message) {
            // 为每个消息添加一个唯一ID和初始时长
            const messageWithId = { ...message, id: Date.now() + Math.random(), duration: null };
            this.messages.push(messageWithId);
            return messageWithId.id;
        },
        // (新增) 为特定消息设置时长
        setMessageDuration(messageId, duration) {
            const message = this.messages.find(m => m.id === messageId);
            if (message) {
                message.duration = duration;
            }
        },
        // (新增) 设置当前请求的 AbortController
        setCurrentRequestController(controller) {
            this.currentRequestController = controller;
        },
        // (新增) 中止当前请求
        abortCurrentRequest() {
            if (this.currentRequestController) {
                this.currentRequestController.abort();
                this.currentRequestController = null;
            }
            this.setTypingStatus(false);
        },
        // (新增) 从指定索引处替换消息历史
        replaceMessagesFromIndex(startIndex, newMessages = []) {
            this.messages.splice(startIndex);
            if (Array.isArray(newMessages) && newMessages.length > 0) {
                this.messages.push(...newMessages);
            }
        },
        setTypingStatus(status) { this.isTyping = status; },
        clearChat() {
            this.abortCurrentRequest(); // 清空时也中止正在进行的请求
            this.messages = [];
            this.isTyping = false;
        },
        openSettingsModal() { this.isSettingsModalOpen = true; },
        closeSettingsModal() { this.isSettingsModalOpen = false; },
        savePersonalizationSettings(settings) {
            this.personalizationSettings = { ...this.personalizationSettings, ...settings };
            console.log('个性化设置已保存:', this.personalizationSettings);
        },
        updateMessageContent({ messageId, contentChunk }) {
            const message = this.messages.find(m => m.id === messageId);
            if (message) {
                if (message.content === null) { // 第一次接收到数据块
                    message.content = '';
                }
                message.content += contentChunk;
            }
        },
    }
});