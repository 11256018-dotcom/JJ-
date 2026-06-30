import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import { UserProfile } from '../../../services/authService';
import { addFriend, searchUsers } from '../../../services/friendService';

interface SearchResult extends UserProfile {
  isAdding?: boolean;
}

export default function ContactsScreen() {
  const { isLoggedIn, loading: authLoading, user } = useAuth() as any;
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null);

  const handleSearch = async (text: string) => {
    console.log('[CONTACTS] handleSearch called with text:', text);
    
    // ⚠️ 防禦性檢查 1：確保使用者已認證
    if (!isLoggedIn) {
      console.warn('[CONTACTS] User not logged in, clearing search and returning');
      setSearchTerm('');
      setSearchResults([]);
      return;
    }

    // ⚠️ 防禦性檢查 2：如果還在認證加載中，拒絕搜尋
    if (authLoading) {
      console.warn('[CONTACTS] Auth still loading, ignoring search request');
      return;
    }

    console.log('[CONTACTS] All auth checks passed, proceeding with search');
    
    setSearchTerm(text);

    if (!text.trim()) {
      console.log('[CONTACTS] Search term is empty, clearing results');
      setSearchResults([]);
      return;
    }

    console.log('[CONTACTS] Setting loading state to true');
    setLoading(true);

    try {
      console.log('[CONTACTS] Calling searchUsers with term:', text);
      const results = await searchUsers(text);
      console.log('[CONTACTS] searchUsers returned', results.length, 'results');
      setSearchResults(results);
    } catch (error: any) {
      console.error('[CONTACTS] Error during search:', error);
      console.error('[CONTACTS] Error message:', error?.message);
      console.error('[CONTACTS] Error type:', error?.constructor?.name);
      
      // 優雅的錯誤提示
      const errorMessage = error?.message || 'Failed to search users. Please try again.';
      console.log('[CONTACTS] Showing alert with message:', errorMessage);
      Alert.alert('Search Error', errorMessage);
      
      // 清空搜尋結果，但不中止操作
      setSearchResults([]);
    } finally {
      console.log('[CONTACTS] Setting loading state to false');
      setLoading(false);
    }
  };

  const handleAddFriend = async (friend: UserProfile) => {
    console.log('[CONTACTS] handleAddFriend called for friend UID:', friend.uid);
    
    if (!isLoggedIn) {
      console.warn('[CONTACTS] User not logged in in handleAddFriend');
      Alert.alert('Error', 'You must be logged in to add friends');
      return;
    }

    setAddingFriendId(friend.uid);

    try {
      await addFriend(friend.uid);
      const successMsg = '好友申請已送出！對方會在通知中看到邀請。';
      Alert.alert('成功', successMsg);
      setSearchResults((prev) => prev.filter((u) => u.uid !== friend.uid));
    } catch (error: any) {
      console.error('[CONTACTS] Error adding friend:', error);
      const message = error?.message || String(error) || '寫入好友申請失敗，請稍後再試。';
      Alert.alert('錯誤', message);
    } finally {
      setAddingFriendId(null);
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <View style={styles.resultItem}>
      <View style={styles.userInfo}>
        {item.avatarURL ? (
          <Image source={{ uri: item.avatarURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.addButton,
          addingFriendId === item.uid && styles.addButtonLoading,
        ]}
        onPress={() => handleAddFriend(item)}
        disabled={addingFriendId === item.uid}
      >
        {addingFriendId === item.uid ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="person-add" size={18} color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          value={searchTerm}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
          editable={isLoggedIn && !authLoading}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : searchResults.length > 0 ? (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.resultsList}
        />
      ) : searchTerm ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <View style={styles.center}>
          <Ionicons name="search" size={48} color="#ddd" />
          <Text style={styles.placeholderText}>Search for friends by name or email</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  resultsList: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  userInfo: {
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
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonLoading: {
    opacity: 0.6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
});
