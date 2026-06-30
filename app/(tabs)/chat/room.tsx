import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useEffect, useRef, useState } from 'react';
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
import { db, storage } from '../../../config/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import {
    getMessages,
    markAllAsRead,
    Message,
    sendMessage,
    subscribeToMessages,
} from '../../../services/chatService';
import { areFriends, getUserById } from '../../../services/friendService';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150?img=55';

export default function SpecificChatRoom() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatId?: string }>();
  const { user } = useAuth();
  const chatId = params.chatId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatTitle, setChatTitle] = useState('New Chat Room');
  const [chatSubtitle, setChatSubtitle] = useState('');
  const [avatarUri, setAvatarUri] = useState<string>(DEFAULT_AVATAR);
  const [chatParticipants, setChatParticipants] = useState<string[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isFriend, setIsFriend] = useState<boolean>(true);
  const flatListRef = useRef<FlatList>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const initializeChat = async () => {
      if (!chatId || !user) {
        setLoading(false);
        return;
      }

      try {
        const chatSnap = await getDoc(doc(db, 'chats', chatId));
        if (!chatSnap.exists()) {
          console.warn('[CHAT ROOM] Chat document not found for chatId:', chatId);
          setLoading(false);
          return;
        }

        const chatData = chatSnap.data() as any;
        const participants: string[] = Array.isArray(chatData.participants)
          ? chatData.participants
          : [];
        setChatParticipants(participants);

        const otherUid = participants.find((uid) => uid !== user.uid);
        if (otherUid) {
          const otherUser = await getUserById(otherUid);
          if (otherUser) {
            setChatTitle(otherUser.name || 'New Chat Room');
            setChatSubtitle(otherUser.email || 'Chat with friend');
            setAvatarUri(
              chatData.participantAvatars?.[otherUid] || otherUser.avatarURL || DEFAULT_AVATAR
            );
          }

          const friendship = await areFriends(user.uid, otherUid);
          setIsFriend(friendship);
        } else {
          setIsFriend(false);
        }

        const initialMessages = await getMessages(chatId, 100);
        console.log('[CHAT_DEBUG] room initialMessages', { chatId, currentUserId: user?.uid, messages: initialMessages });
        setMessages(initialMessages);

        try {
          await markAllAsRead(chatId);
          console.log('[CHAT_DEBUG] room markAllAsRead triggered', { chatId, currentUserId: user?.uid });
        } catch (error) {
          console.error('[CHAT_ROOM] markAllAsRead failed:', error);
        }

        unsubscribeRef.current = subscribeToMessages(chatId, (updatedMessages) => {
          console.log('[CHAT_DEBUG] room received Firestore realtime data', { chatId, messages: updatedMessages });
          setMessages(updatedMessages);
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      } catch (error: any) {
        console.error('[CHAT ROOM] Error initializing chat:', error);
        Alert.alert('錯誤', error?.message || '載入聊天室失敗。');
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [chatId, user]);

  const handleEditAvatar = async () => {
    if (!chatId || !user) {
      Alert.alert('錯誤', '無法取得聊天室或使用者資訊。');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('權限需求', '請允許存取相簿以更新頭像。');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const selectedUri = result.assets[0].uri;
      setUploadingAvatar(true);

      const response = await fetch(selectedUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `chatAvatars/${chatId}/${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'chats', chatId), {
        [`participantAvatars.${user.uid}`]: downloadURL,
        updatedAt: new Date(),
      });

      setAvatarUri(downloadURL);
      Alert.alert('成功', '聊天室頭像已更新。');
    } catch (error: any) {
      console.error('[CHAT ROOM] Avatar upload failed:', error);
      Alert.alert('錯誤', error?.message || '更新頭像失敗。');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSendMessage = async () => {
    if (!chatId || !inputText.trim() || !isFriend) return;

    setSending(true);
    try {
      await sendMessage(chatId, inputText.trim());
      setInputText('');
    } catch (error: any) {
      console.error('[CHAT ROOM] Send message failed:', error);
      Alert.alert('錯誤', error?.message || '傳送訊息失敗。');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!chatId) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>聊天室不存在。</Text>
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
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{chatTitle || 'New Chat Room'}</Text>
              <Text style={styles.subtitle}>{chatSubtitle || '對話已建立'}</Text>
            </View>
            <View style={styles.avatarBlock}>
              <Image source={{ uri: avatarUri || DEFAULT_AVATAR }} style={styles.chatAvatar} />
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditAvatar}
                disabled={uploadingAvatar}
              >
                <Text style={styles.editButtonText}>
                  {uploadingAvatar ? 'Uploading...' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.uid;
            const showReadStatus = isMine && (Boolean(item.isRead) || (Array.isArray(item.readBy) && item.readBy.includes(user?.uid || '')));
            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowRight : styles.messageRowLeft,
                ]}
              >
                {isMine ? (
                  <View style={styles.messageMetaRow}>
                    {showReadStatus ? <Text style={styles.readText}>已讀</Text> : null}
                    <Text style={[styles.messageTime, styles.messageTimeRight]}>
                      {formatTime(item.createdAt || item.timestamp)}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.messageBubble,
                    isMine ? styles.messageBubbleRight : styles.messageBubbleLeft,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMine && styles.messageTextRight,
                    ]}
                  >
                    {item.text}
                  </Text>
                </View>

                {!isMine ? (
                  <Text style={[styles.messageTime, styles.messageTimeLeft]}>
                    {formatTime(item.createdAt || item.timestamp)}
                  </Text>
                ) : null}
              </View>
            );
          }}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {isFriend ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              editable={!sending}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ padding: 15, alignItems: 'center', backgroundColor: '#f2f2f2' }}>
            <Text style={{ color: '#666', fontSize: 14 }}>需先加入好友才能聊天</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    color: '#333',
    fontSize: 16,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
  avatarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ddd',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 18,
  },
  messageBubbleLeft: {
    backgroundColor: '#fff',
  },
  messageBubbleRight: {
    backgroundColor: '#007AFF',
  },
  messageText: {
    fontSize: 15,
    color: '#111',
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#888',
  },
  messageTimeLeft: {
    marginLeft: 8,
  },
  messageTimeRight: {
    marginRight: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    color: '#111',
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});