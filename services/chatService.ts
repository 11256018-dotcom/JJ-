import {
    addDoc,
    arrayUnion,
    collection,
    doc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Unsubscribe,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: any;
  readBy?: string[];
  isRead?: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  participantIds: string[];
  createdAt: any;
  updatedAt: any;
  lastMessage?: string;
  lastMessageTime?: any;
  lastMessageSenderId?: string;
}

export interface ChatPreview extends Chat {
  lastMessageSenderName?: string;
  unreadCount?: number;
}

function normalizeMessage(docId: string, chatId: string, data: any): Message {
  const readBy = Array.isArray(data?.readBy) ? data.readBy : [];
  const isRead = data?.isRead ?? (readBy.length > 1);

  console.log('[CHAT_DEBUG] normalizeMessage', {
    id: docId,
    senderId: data?.senderId,
    readBy,
    isRead,
    raw: data,
  });

  return {
    id: docId,
    chatId,
    ...data,
    readBy,
    isRead,
  } as Message;
}

// Generate chat ID from two user IDs (always same order)
export function generateChatId(uid1: string, uid2: string): string {
  const ids = [uid1, uid2].sort();
  return `${ids[0]}_${ids[1]}`;
}

// Get or create chat room
export async function getOrCreateChat(
  friendUid: string,
  friendName: string,
  friendAvatar: string
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  const chatId = generateChatId(currentUser.uid, friendUid);
  const chatRef = doc(db, 'chats', chatId);

  try {
    // Check if chat already exists
    const chatDoc = await chatRef.get?.() || null;

    if (!chatDoc?.exists()) {
      // Create new chat
      await setDoc(chatRef, {
        id: chatId,
        participants: [currentUser.uid, friendUid],
        participantNames: {
          [currentUser.uid]: currentUser.displayName || 'Unknown',
          [friendUid]: friendName,
        },
        participantAvatars: {
          [currentUser.uid]: currentUser.photoURL || '',
          [friendUid]: friendAvatar,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return chatId;
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    throw error;
  }
}

// Send message
export async function sendMessage(
  chatId: string,
  text: string
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');
  if (!text.trim()) throw new Error('Message cannot be empty');

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const payload = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || 'Unknown',
      senderAvatar: currentUser.photoURL || '',
      text: text.trim(),
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      readBy: [currentUser.uid],
      isRead: false,
      status: 'sent',
    };

    console.log('[CHAT_DEBUG] sendMessage payload', { chatId, payload });

    const messageDoc = await addDoc(messagesRef, payload);
    console.log('[CHAT_DEBUG] sendMessage success', { chatId, messageId: messageDoc.id });

    // Update chat metadata
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: text.trim(),
      lastMessageTime: serverTimestamp(),
      lastMessageSenderId: currentUser.uid,
      updatedAt: serverTimestamp(),
    });

    return messageDoc.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// Get messages (initial load with limit)
export async function getMessages(chatId: string, limitCount: number = 50): Promise<Message[]> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((doc) => normalizeMessage(doc.id, chatId, doc.data()))
      .reverse();
  } catch (error) {
    console.error('Error getting messages:', error);
    return [];
  }
}

// Real-time message listener
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const rawMessages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log('[CHAT_DEBUG] 收到 Firestore 實時資料:', { chatId, rawMessages });

      const messages: Message[] = [];
      snapshot.forEach((doc) => {
        messages.push(normalizeMessage(doc.id, chatId, doc.data()));
      });

      console.log('[CHAT_DEBUG] subscribeToMessages payload', {
        chatId,
        count: messages.length,
        messages,
      });

      callback(messages);
    });
  } catch (error) {
    console.error('Error subscribing to messages:', error);
    return () => {};
  }
}

// Mark message as read
export async function markMessageAsRead(
  chatId: string,
  messageId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    console.log('[CHAT_DEBUG] markMessageAsRead start', { chatId, messageId, currentUserId: currentUser.uid });
    await updateDoc(messageRef, {
      readBy: arrayUnion(currentUser.uid),
      isRead: true,
      status: 'read',
    });
    console.log('[CHAT_DEBUG] markMessageAsRead success', { chatId, messageId, currentUserId: currentUser.uid });
  } catch (error) {
    console.error('Error marking message as read:', error);
  }
}

// Mark all messages in chat as read
export async function markAllAsRead(chatId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);

    console.log('[CHAT_DEBUG] markAllAsRead start', { chatId, currentUserId: currentUser.uid, count: snapshot.size });

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const senderIsCurrentUser = data.senderId === currentUser.uid;
      const alreadyRead = data.readBy?.includes(currentUser.uid) || data.isRead === true || senderIsCurrentUser;

      if (!alreadyRead) {
        batch.update(docSnap.ref, {
          readBy: arrayUnion(currentUser.uid),
          isRead: true,
          status: 'read',
        });
      }
    });

    await batch.commit();
    console.log('[CHAT_DEBUG] markAllAsRead success', { chatId, currentUserId: currentUser.uid });
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

// Get chat list with previews
export async function getChatList(): Promise<ChatPreview[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as ChatPreview));
  } catch (error) {
    console.error('Error getting chat list:', error);
    return [];
  }
}

// Real-time chat list listener
export function subscribeToChatList(
  callback: (chats: ChatPreview[]) => void
): Unsubscribe {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.error('Not authenticated');
    return () => {};
  }

  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const chats: ChatPreview[] = [];
      snapshot.forEach((doc) => {
        chats.push({
          id: doc.id,
          ...doc.data(),
        } as ChatPreview);
      });
      callback(chats);
    });
  } catch (error) {
    console.error('Error subscribing to chat list:', error);
    return () => {};
  }
}

// Get unread count for a chat
export async function getUnreadCount(chatId: string): Promise<number> {
  const currentUser = auth.currentUser;
  if (!currentUser) return 0;

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('readBy', 'array-contains', currentUser.uid)
    );

    const snapshot = await getDocs(messagesRef);
    let unreadCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const alreadyRead = data.readBy?.includes(currentUser.uid) || data.isRead === true;
      if (!alreadyRead) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

// Delete chat (soft delete - archive)
export async function archiveChat(chatId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      archivedBy: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error archiving chat:', error);
    throw error;
  }
}
