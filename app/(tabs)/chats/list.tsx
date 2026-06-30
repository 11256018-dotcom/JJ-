import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { ChatPreview, getChatList, subscribeToChatList } from '../../../services/chatService';

export default function ChatsListScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load initial chats and subscribe to updates
  useEffect(() => {
    const loadChats = async () => {
      if (!user) return;

      try {
        // Get initial chat list
        const initialChats = await getChatList();
        setChats(initialChats);

        // Subscribe to real-time updates
        const unsubscribe = subscribeToChatList((updatedChats) => {
          setChats(updatedChats);
        });

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChats();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updatedChats = await getChatList();
      setChats(updatedChats);
    } catch (error) {
      console.error('Error refreshing chats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleChatPress = (chat: ChatPreview) => {
    // Find the other participant (not the current user)
    const otherParticipantUid = chat.participants.find((uid) => uid !== user?.uid);
    if (otherParticipantUid) {
      router.push({
        pathname: '/chat/[id]',
        params: { id: otherParticipantUid },
      });
    }
  };

  const getOtherParticipant = (chat: ChatPreview) => {
    const otherUid = chat.participants.find((uid) => uid !== user?.uid);
    if (otherUid && chat.participantNames && chat.participantAvatars) {
      return {
        uid: otherUid,
        name: chat.participantNames[otherUid] || 'Unknown',
        avatar: chat.participantAvatars[otherUid] || '',
      };
    }
    return null;
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate?.() || new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const chatDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (chatDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    } else if (chatDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    }
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => {
    const otherParticipant = getOtherParticipant(item);

    if (!otherParticipant) return null;

    return (
      <TouchableOpacity style={styles.chatItem} onPress={() => handleChatPress(item)}>
        <Image
          source={{ uri: otherParticipant.avatar || 'https://i.pravatar.cc/150' }}
          style={styles.avatar}
        />

        <View style={styles.chatInfo}>
          <Text style={styles.chatName}>{otherParticipant.name}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.timestamp}>{formatTime(item.lastMessageTime)}</Text>
          {/* Unread indicator (optional) */}
          <View style={styles.unreadIndicator} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation with a friend</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  chatsList: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 12,
    color: '#999',
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007AFF',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
