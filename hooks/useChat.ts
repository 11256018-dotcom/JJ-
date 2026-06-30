import { useCallback, useState } from 'react';
import { CURRENT_USER_ID, INITIAL_MESSAGES } from '../data/data';
import { ChatMessage } from '../utils/types';

export const useChat = (contactId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    INITIAL_MESSAGES[contactId] || []
  );

  const addMessage = useCallback((text: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: CURRENT_USER_ID,
      text,
      timestamp: new Date().toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSender: true,
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // 模拟对方回复 (延迟 1 秒)
    setTimeout(() => {
      const replyMessage: ChatMessage = {
        id: Date.now().toString(),
        senderId: contactId,
        text: '我收到你的留言了 😊',
        timestamp: new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isSender: false,
      };
      setMessages((prevMessages) => [...prevMessages, replyMessage]);
    }, 1000);
  }, [contactId]);

  return { messages, addMessage };
};
