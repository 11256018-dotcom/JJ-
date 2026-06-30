export interface Contact {
  id: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSender: boolean;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}
