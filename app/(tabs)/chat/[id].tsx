import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import {
    getMessages,
    getOrCreateChat,
    markAllAsRead,
    Message,
    sendMessage,
    subscribeToMessages,
} from '../../../services/chatService';
import { Friend, getFriendsOfCurrentUser, getUserById } from '../../../services/friendService';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; chatId?: string }>();
  const { user, userProfile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const friendUid = params.id;
  const queryChatId = (params as any).chatId as string | undefined;

  // Initialize chat and load friend info
  useEffect(() => {
    const initializeChat = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        let cId: string | null = null;

        if (friendUid) {
          // Friend-initiated route (existing behavior)
          const friends = await getFriendsOfCurrentUser();
          let selectedFriend = friends.find((f) => f.uid === friendUid);

          if (!selectedFriend) {
            const userInfo = await getUserById(friendUid);
            if (userInfo) {
              selectedFriend = userInfo as Friend;
            }
          }

          if (selectedFriend) {
            setFriend(selectedFriend);
            cId = await getOrCreateChat(
              selectedFriend.uid,
              selectedFriend.name,
              selectedFriend.avatarURL || ''
            );
          } else {
            console.warn('[CHAT] Friend not found in your friend list or users collection for uid:', friendUid);
          }
        } else if (queryChatId) {
          // ChatId route (from contacts create). Use chatId to derive friend info.
          cId = queryChatId;
          try {
            // Read chat doc to get participants
            const chatRef = (await import('../../../config/firebaseConfig')).db;
          } catch (e) {
            // ignore dynamic import - use services to fetch user by id
          }

          // get participants by reading chat doc directly
          try {
            const chatDoc = await (await import('firebase/firestore')).getDoc((await import('firebase/firestore')).doc((await import('../../../config/firebaseConfig')).db, 'chats', cId));
            if (chatDoc.exists()) {
              const data: any = chatDoc.data();
              const participants: string[] = data.participants || [];
              const other = participants.find((p) => p !== user.uid);
              if (other) {
                const userInfo = await getUserById(other);
                if (userInfo) setFriend(userInfo as Friend);
              }
            }
          } catch (e: any) {
            console.error('聊天室載入失敗（讀取 chat doc）:', e);
          }
        }

        if (!cId) {
          // nothing to load
          setMessages([]);
          setLoading(false);
          return;
        }

        setChatId(cId);

        // Load initial messages
        try {
          const initialMessages = await getMessages(cId, 50);
          console.log('[CHAT_DEBUG] initialMessages', {
            chatId: cId,
            currentUserId: user?.uid,
            messages: initialMessages,
          });
          setMessages(initialMessages);
        } catch (e: any) {
          console.error('聊天室載入失敗（讀取 messages）:', e);
          setMessages([]);
        }

        // Mark all as read (best-effort)
        try {
          await markAllAsRead(cId);
        } catch (e: any) {
          console.error('聊天室載入失敗（markAllAsRead）:', e);
        }

        // Subscribe to real-time updates
        const unsubscribe = subscribeToMessages(cId, (updatedMessages) => {
          console.log('[CHAT_DEBUG] messages updated from subscription', {
            chatId: cId,
            currentUserId: user?.uid,
            messages: updatedMessages,
          });
          setMessages(updatedMessages);
          flatListRef.current?.scrollToEnd({ animated: true });
        });

        unsubscribeRef.current = unsubscribe;
      } catch (error: any) {
        console.error('聊天室載入失敗：', error);
      } finally {
        // ensure loading is cleared even if no messages
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user, friendUid, queryChatId]);


  const handleSendMessage = async () => {
    if (!inputText.trim() || !chatId || sending) return;

    setSending(true);
    try {
      await sendMessage(chatId, inputText);
      setInputText('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('錯誤', error?.message || String(error));
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.uid;
    const hasReadStatus = Boolean(item.isRead) || (Array.isArray(item.readBy) && item.readBy.includes(user?.uid || ''));
    const showReadStatus = isCurrentUser && hasReadStatus;

    console.log('[CHAT_DEBUG] renderMessage', {
      messageId: item.id,
      senderId: item.senderId,
      currentUserId: user?.uid,
      readBy: item.readBy,
      isRead: item.isRead,
      hasReadStatus,
      showReadStatus,
    });

    return (
      <View
        style={[
          styles.messageContainer,
          isCurrentUser && styles.messageContainerRight,
        ]}
      >
        {!isCurrentUser && (
          <Image
            source={{ uri: item.senderAvatar || 'https://i.pravatar.cc/150' }}
            style={styles.avatar}
          />
        )}

        <View
          style={[
            styles.messageBubble,
            isCurrentUser && styles.messageBubbleRight,
          ]}
        >
          <Text style={[styles.messageText, isCurrentUser && styles.messageTextRight]}>
            {item.text}
          </Text>
          <View style={styles.messageMetaRow}>
            {showReadStatus ? (
              <Text style={styles.readText}>已讀</Text>
            ) : null}
            <Text style={[styles.messageTime, isCurrentUser && styles.messageTimeRight]}>
              {item.timestamp?.toDate?.()?.toLocaleTimeString?.('zh-TW', {
                hour: '2-digit',
                minute: '2-digit',
              }) || 'sending...'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={90}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Image source={{ uri: friend?.avatarURL || 'https://i.pravatar.cc/150' }} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{friend?.name || '聊天室'}</Text>
              <Text style={styles.headerEmail}>{friend?.email || ''}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={setInputText}
            placeholderTextColor="#999"
            multiline
            maxHeight={100}
            editable={!sending}
          />

          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending || !chatId}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  headerEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 8,
  },
  messageContainerRight: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  messageBubbleRight: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageTextRight: {
    color: '#fff',
  },
  messageMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
  },
  messageTimeRight: {
    color: '#e0e0e0',
  },
  readText: {
    fontSize: 11,
    color: '#d0d0d0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
