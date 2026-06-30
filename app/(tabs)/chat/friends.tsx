import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { deleteFriend, Friend, getFriendsOfCurrentUser } from '../../../services/friendService';

export default function FriendsScreen() {
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsList = await getFriendsOfCurrentUser();
      setFriends(friendsList);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load friends');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFriends();
    }, [])
  );

  const handleDeleteFriend = async (friend: Friend) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friend.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingFriendId(friend.uid);
            try {
              await deleteFriend(friend.uid);
              setFriends((prev) => prev.filter((f) => f.uid !== friend.uid));
              Alert.alert('已解除好友關係');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            } finally {
              setRemovingFriendId(null);
            }
          },
        },
      ]
    );
  };

  const handleStartChat = (friend: Friend) => {
    if (!friend?.uid) {
      Alert.alert('錯誤', '無法開啟聊天室，缺少好友識別碼。');
      return;
    }

    try {
      router.push({
        pathname: '/chat/[id]',
        params: { id: friend.uid },
      });
    } catch (error) {
      console.error('Navigation error on start chat', error);
      router.push(`/chat/${friend.uid}`);
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <TouchableOpacity
        style={styles.friendContent}
        onPress={() => handleStartChat(item)}
      >
        {item.avatarURL ? (
          <Image source={{ uri: item.avatarURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.name}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleStartChat(item)}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.removeButton,
            removingFriendId === item.uid && styles.buttonLoading,
          ]}
          onPress={() => handleDeleteFriend(item)}
          disabled={removingFriendId === item.uid}
        >
          {removingFriendId === item.uid ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons name="trash" size={18} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {friends.length > 0 ? (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.friendsList}
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons name="people" size={48} color="#ddd" />
          <Text style={styles.emptyText}>No friends yet</Text>
          <Text style={styles.emptySubtext}>Search and add friends to get started</Text>
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
  friendsList: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  friendEmail: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLoading: {
    opacity: 0.7,
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
