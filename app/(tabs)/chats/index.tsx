import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../../config/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import { ChatPreview, getChatList } from '../../../services/chatService';
import { addFriend } from '../../../services/friendService';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../../../utils/styles';

type TabType = 'chats' | 'friends';

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Chat list state
  const [chats, setChats] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(true);
  const [chatRefreshing, setChatRefreshing] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Friends list state
  const [friends, setFriends] = useState<any[]>([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendRefreshing, setFriendRefreshing] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState<string | null>(null);
  const friendsUnsubRef = useRef<(() => void) | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchId, setSearchId] = useState(''); // For adding friends

  // Real-time chat listener using onSnapshot
  useEffect(() => {
    if (!user?.uid) {
      console.warn('[CHATS] No user.uid available, clearing chats');
      setChats([]);
      setChatLoading(false);
      return;
    }

    const currentUid = user.uid;
    console.log('[CHATS] Subscribing to chats for uid:', currentUid);
    setChatLoading(true);

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUid)
    );
    console.log('[CHATS] Querying chats with participants array-contains', currentUid);

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        console.log('當前登入的UID是:', currentUid);
        console.log('一共捞到了幾個聊天室:', snapshot.size);
        snapshot.forEach((doc) => {
          console.log('找到房間ID:', doc.id, '房間資料為:', doc.data());
        });

        try {
          // 🔍 檢查好友狀態：只顯示對應好友關係狀態為 'accepted' 的聊天室
          const validChats = await Promise.all(snapshot.docs.map(async (docSnap) => {
            const data: any = docSnap.data();
            const participants: string[] = Array.isArray(data.participants) ? data.participants : [];
            const otherUid = participants.find((id) => id !== currentUid) || null;

            // 檢查該好友的關係狀態是否為 accepted，否則過濾掉
            if (otherUid) {
              try {
                const friendshipsRef = collection(db, 'friendships');
                // 🔎 雙向查詢：查找我加他、或他加我的文件
                const q1 = query(
                  friendshipsRef,
                  where('requesterId', '==', currentUid),
                  where('receiverId', '==', otherUid)
                );
                const q2 = query(
                  friendshipsRef,
                  where('requesterId', '==', otherUid),
                  where('receiverId', '==', currentUid)
                );

                const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                const friendshipDoc = snap1.docs[0] || snap2.docs[0];

                // 如果找不到好友關係或狀態不是 'accepted'，就過濾掉此聊天室
                if (!friendshipDoc || friendshipDoc.data().status !== 'accepted') {
                  console.log(`[CHATS] Filtering out chat ${docSnap.id}: friendship status is not 'accepted'`);
                  return null; // 返回 null 表示要過濾掉
                }
              } catch (err) {
                console.warn('[CHATS] Error checking friendship status for chat:', err);
                // 如果查詢失敗，保留該聊天，避免誤刪
              }
            }

            // 返回該聊天的完整資訊
            let otherName = 'Unknown';
            let otherAvatar = '';
            let otherEmail = '';

            if (otherUid) {
              try {
                const userDoc = await getDoc(doc(db, 'users', otherUid));
                if (userDoc.exists()) {
                  const ud: any = userDoc.data();
                  otherName = ud.name || ud.displayName || otherName;
                  otherAvatar = ud.avatarURL || ud.photoURL || otherAvatar;
                  otherEmail = ud.email || ud.userEmail || otherEmail;
                }
              } catch (err) {
                console.error('[CHATS] Error fetching user for chat list', err);
              }
            }

            return {
              id: docSnap.id,
              participants,
              lastMessage: data.lastMessage || '',
              lastMessageTime: data.lastMessageTime || data.updatedAt || null,
              otherUid,
              otherName,
              otherAvatar,
              otherEmail,
            };
          }));

          // 過濾掉 null 值（已刪除好友的聊天室）
          const filteredChats = validChats.filter((chat) => chat !== null);

          const sortedChats = filteredChats.sort((a, b) => {
            const aTime = a.lastMessageTime?.toDate?.()?.getTime?.() ?? new Date(a.lastMessageTime).getTime?.() ?? 0;
            const bTime = b.lastMessageTime?.toDate?.()?.getTime?.() ?? new Date(b.lastMessageTime).getTime?.() ?? 0;
            return bTime - aTime;
          });
          setChats(sortedChats);
        } catch (err) {
          console.error('主頁面監聽失敗原因：', err);
          setChats([]);
        } finally {
          setChatLoading(false);
        }
      },
      (error) => {
        console.error('[CHATS] onSnapshot query error:', error);
        if (error?.message) {
          console.error('[CHATS] error.message:', error.message);
        }
        setChats([]);
        setChatLoading(false);
      }
    );

    unsubscribeRef.current = unsub;
    return () => {
      try { unsub(); } catch {}
      unsubscribeRef.current = null;
    };
  }, [user?.uid]);

  const loadFriendships = async () => {
    if (!user?.uid) return;
    setFriendLoading(true);

    try {
      const friendshipsRef = collection(db, 'friendships');
      const q1 = query(
        friendshipsRef,
        where('requesterId', '==', user.uid),
        where('status', '==', 'accepted')
      );
      const q2 = query(
        friendshipsRef,
        where('receiverId', '==', user.uid),
        where('status', '==', 'accepted')
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const docs = [...snap1.docs, ...snap2.docs];
      const uniqueDocs = new Map<string, any>();
      docs.forEach((docSnap) => uniqueDocs.set(docSnap.id, docSnap));

      const mappedFriends = await Promise.all(
        Array.from(uniqueDocs.values()).map(async (docSnap) => {
          const data: any = docSnap.data();
          const friendUid = data.requesterId === user.uid ? data.receiverId : data.requesterId;
          const friendDoc = await getDoc(doc(db, 'users', friendUid));
          const friendData: any = friendDoc.exists() ? friendDoc.data() : {};

          return {
            id: docSnap.id, // ✅ 文件 ID（關鍵！）
            friendshipId: docSnap.id, // 向後相容
            uid: friendUid,
            name: friendData?.name || 'Unknown',
            email: friendData?.email || '',
            avatarURL: friendData?.avatarURL || '',
            chatId: chats.find((chat) => chat.otherUid === friendUid)?.id || '',
          };
        })
      );

      setFriends(mappedFriends.filter((item) => item.uid));
    } catch (error: any) {
      console.error('[CHATS] Error loading friendships:', error);
    } finally {
      setFriendLoading(false);
    }
  };

  const handleChatRefresh = async () => {
    setChatRefreshing(true);
    try {
      const updatedChats = await getChatList();
      setChats(updatedChats);
    } catch (error) {
      console.error('Error refreshing chats:', error);
    } finally {
      setChatRefreshing(false);
    }
  };

  const handleFriendRefresh = async () => {
    setFriendRefreshing(true);
    try {
      await loadFriendships();
    } catch (error: any) {
      console.error('Error refreshing friends:', error);
    } finally {
      setFriendRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends' && user?.uid) {
      loadFriendships();
    }
  }, [activeTab, user?.uid, chats]);

  const handleChatPress = (chat: ChatPreview) => {
    if (!chat?.id) {
      console.warn('[CHATS] chat id missing on press', chat);
      return;
    }

    try {
      router.push({ pathname: '/chat/room', params: { chatId: chat.id } });
    } catch (err) {
      console.error('Navigation error on chat press', err);
    }
  };

  const handleFriendPress = (friend: any) => {
    if (!friend?.uid) {
      console.warn('[CHATS] Friend uid missing:', friend);
      Alert.alert('錯誤', '無法開啟聊天室，缺少好友識別碼。');
      return;
    }

    if (friend?.chatId) {
      console.log('[CHATS] Navigating to existing chat room:', friend.chatId);
      router.push({ pathname: '/chat/room', params: { chatId: friend.chatId } });
      return;
    }

    console.log('[CHATS] Navigating to friend chat screen:', friend.uid);
    router.push({
      pathname: '/chat/[id]',
      params: { id: friend.uid },
    });
  };

  const handleDisableFriendship = async (friendshipId: string) => {
    console.log('👉 垃圾桶點擊成功！準備關閉權限的文件 ID 為:', friendshipId);

    if (!friendshipId) {
      Alert.alert('錯誤', '無法取得該好友關係的文件 ID！');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('錯誤', '用戶未登入');
      return;
    }

    // 彈出確認對話框
    Alert.alert(
      '確認移除好友',
      '確定要將此人從好友列表移除嗎？\n移除後彼此聊天室將會鎖定。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            setRemovingFriendId(friendshipId);
            try {
              // 🔒 軟刪除：將 status 改為 "none"（不物理刪除文件）
              const friendshipRef = doc(db, 'friendships', friendshipId);
              await updateDoc(friendshipRef, {
                status: 'none',
                updatedAt: serverTimestamp(),
              });

              console.log('✅ ✅ status 已改為 "none"，好友關係已關閉');

              // 立即刷新列表（onSnapshot 會自動觸發過濾）
              await loadFriendships();

              Alert.alert('成功', '已成功移除好友，聊天權限已關閉。');
            } catch (error: any) {
              console.error('🔥 關閉權限失敗:', error);
              Alert.alert('操作失敗', `錯誤: ${error.message}`);
            } finally {
              setRemovingFriendId(null);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleAddFriend = async () => {
    if (!searchId.trim()) {
      Alert.alert('提示', '請輸入好友的 Email 或 ID');
      return;
    }

    if (!user?.uid) {
      Alert.alert('錯誤', '使用者未登入');
      return;
    }

    const currentUserId = user.uid;
    const searchTerm = searchId.trim();

    if (!searchTerm) {
      Alert.alert('提示', '請輸入好友的 Email 或 ID');
      return;
    }

    try {
      console.log('[CHATS] Searching for user with email/id:', searchTerm);

      let targetUserId: string | null = null;
      const usersRef = collection(db, 'users');

      // 1. Try exact UID lookup first
      try {
        const docSnap = await getDoc(doc(db, 'users', searchTerm));
        if (docSnap.exists()) {
          targetUserId = docSnap.id;
        }
      } catch (uidLookupError) {
        // ignore invalid UID or direct lookup failure
      }

      // 2. If not found by UID, try email or normalized emailLower
      if (!targetUserId) {
        const qByEmail = query(usersRef, where('email', '==', searchTerm));
        const qByEmailLower = query(usersRef, where('emailLower', '==', searchTerm.toLowerCase()));
        const [snapEmail, snapEmailLower] = await Promise.all([getDocs(qByEmail), getDocs(qByEmailLower)]);

        const foundDoc = snapEmail.docs[0] || snapEmailLower.docs[0];
        if (foundDoc) {
          targetUserId = foundDoc.id;
        }
      }

      if (!targetUserId) {
        Alert.alert('錯誤', '找不到該用戶，請檢查輸入是否正確！');
        return;
      }

      if (targetUserId === currentUserId) {
        Alert.alert('提示', '不能加自己為好友喔！');
        return;
      }

      console.log('[CHATS] Searching for existing friendship...');
      
      // 🔍 檢查是否存在舊的 status === "none" 的文件
      const friendshipsRef = collection(db, 'friendships');
      const q1 = query(
        friendshipsRef,
        where('requesterId', '==', currentUserId),
        where('receiverId', '==', targetUserId)
      );
      const q2 = query(
        friendshipsRef,
        where('requesterId', '==', targetUserId),
        where('receiverId', '==', currentUserId)
      );

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const existingFriendship = snap1.docs[0] || snap2.docs[0];

      if (existingFriendship) {
        const friendshipData = existingFriendship.data();
        console.log('找到舊文件，status =', friendshipData?.status);

        if (friendshipData?.status === 'none') {
          // ✅ 復活舊關係：改 status 回 "accepted"
          console.log('🔓 檢測到舊關係，正在重新激活...');
          await updateDoc(doc(db, 'friendships', existingFriendship.id), {
            status: 'accepted',
            updatedAt: serverTimestamp(),
          });
          console.log('✅ ✅ 舊關係已重新激活，status 改回 "accepted"');
          Alert.alert('成功', '好友關係已恢復，聊天室即刻解鎖！');
          setSearchId('');
          await loadFriendships();
          return;
        } else if (friendshipData?.status === 'accepted') {
          Alert.alert('提示', '此人已經是你的好友了！');
          return;
        }
      }

      // 🆕 如果不存在舊文件，建建立新的好友關係
      console.log('[CHATS] 沒有找到舊文件，建立新好友關係');
      await addFriend(targetUserId);
      Alert.alert('成功', '好友關係已建立，聊天室已解鎖！');
      setSearchId(''); // Clear input
      await loadFriendships();
      console.log('[CHATS] Friend relationship created successfully');
    } catch (error: any) {
      console.error('[CHATS] Error adding friend:', error);
      Alert.alert('錯誤', '新增失敗：' + (error.message || String(error)));
    }
  };

  const handleRemoveFriend = async (friendItem: any) => {
    const chatId = friendItem?.chatId;
    const friendName = friendItem?.name || 'Friend';
    const friendUid = friendItem?.uid;

    if (!chatId) {
      console.error('[CHATS] Missing chatId for friend:', friendItem);
      Alert.alert('錯誤', '找不到該好友的聊天室 ID，無法刪除！');
      return;
    }

    if (!friendUid) {
      console.error('[CHATS] Missing friendUid:', friendItem);
      Alert.alert('錯誤', '找不到該好友的 ID，無法刪除！');
      return;
    }

    handleDeleteChat(chatId);
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!chatId) {
      Alert.alert('錯誤', '找不到該筆聊天室 ID，無法刪除！');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      '確認刪除',
      '你確定要刪除這個好友以及所有的聊天紀錄嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            setRemovingFriendId(chatId);
            try {
              console.log('[CHATS] Deleting chat room:', chatId);
              // Core operation: Delete the chat document from Firestore
              await deleteDoc(doc(db, 'chats', chatId));
              console.log('[CHATS] Successfully deleted chat document:', chatId);
              
              // Update local friends list (removal happens via onSnapshot listener)
              setRemovingFriendId(null);
              Alert.alert('成功', '已成功刪除該好友與聊天室！');
            } catch (error: any) {
              console.error('[CHATS] Error deleting chat room:', error);
              console.error('[CHATS] Error message:', error.message);
              console.error('[CHATS] Error code:', error.code);
              Alert.alert('錯誤', '刪除失敗：' + (error.message || String(error)));
              setRemovingFriendId(null);
            }
          },
        },
      ]
    );
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
      return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } else if (chatDate.getTime() === yesterday.getTime()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-TW', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderChatItem = ({ item }: { item: ChatPreview }) => {
    const otherName = (item as any).otherName || 'Unknown';
    const otherAvatar = (item as any).otherAvatar || '';
    return (
      <TouchableOpacity style={styles.listItem} onPress={() => handleChatPress(item)}>
        {otherAvatar ? (
          <Image source={{ uri: otherAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}

        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{otherName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || (item as any).otherEmail || 'No messages yet'}
          </Text>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.timestamp}>{formatTime(item.lastMessageTime)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFriendItem = ({ item }: { item: any }) => (
    <View style={styles.listItem}>
      <TouchableOpacity
        style={styles.friendContent}
        onPress={() => handleFriendPress(item)}
      >
        {item.avatarURL ? (
          <Image source={{ uri: item.avatarURL }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color="#999" />
          </View>
        )}
        <View style={styles.friendDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.friendEmail}>{item.email}</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleFriendPress(item)}
        >
          <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.removeButton,
            removingFriendId === item.id && styles.buttonDisabled,
          ]}
          onPress={() => {
            console.log('🎯 按鈕觸發！當前項目的 item 資料:', item);
            handleDisableFriendship(item.id);
          }}
          activeOpacity={removingFriendId === item.id ? 0.5 : 0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {removingFriendId === item.id ? (
            <ActivityIndicator size="small" color="#FF3B30" />
          ) : (
            <Ionicons name="trash" size={18} color="#FF3B30" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeAreaContainer, { backgroundColor: COLORS.background }]}>
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'chats' && styles.tabButtonActive]}
            onPress={() => setActiveTab('chats')}
          >
            <Ionicons
              name="chatbubbles"
              size={20}
              color={activeTab === 'chats' ? COLORS.primary : COLORS.textTertiary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'chats' && styles.tabTextActive,
              ]}
            >
              聊天室
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Ionicons
              name="people"
              size={20}
              color={activeTab === 'friends' ? COLORS.primary : COLORS.textTertiary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'friends' && styles.tabTextActive,
              ]}
            >
              好友列表
            </Text>
          </Pressable>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={COLORS.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'chats' ? '搜尋聊天...' : '搜尋好友...'}
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content */}
        {activeTab === 'chats' ? (
          <View style={styles.listContainer}>
            {chatLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : chats.length > 0 ? (
              <FlatList
                data={chats}
                renderItem={renderChatItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={chatRefreshing}
                    onRefresh={handleChatRefresh}
                  />
                }
              />
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="chatbubbles-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No chats yet</Text>
                <Text style={styles.emptySubtext}>
                  Start a conversation with a friend
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.listContainer, { flexDirection: 'column' }]}>
            {/* Friends section with fixed search/add bar at top */}
            <View style={styles.friendsHeaderContainer}>
              <View style={styles.friendsInputContainer}>
                <TextInput
                  style={styles.friendsInput}
                  placeholder="請輸入好友的 Email..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={searchId}
                  onChangeText={setSearchId}
                />
                <TouchableOpacity
                  style={styles.addFriendButtonFixed}
                  onPress={handleAddFriend}
                >
                  <Ionicons name="person-add" size={20} color="#fff" />
                  <Text style={styles.addFriendButtonTextFixed}>新增</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Friends list - dynamic content below */}
            {friendLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : friends.length > 0 ? (
              <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.friendshipId || item.uid}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={friendRefreshing}
                    onRefresh={handleFriendRefresh}
                  />
                }
              />
            ) : (
              <View style={styles.centerContent}>
                <Ionicons name="people-outline" size={48} color="#ddd" />
                <Text style={styles.emptyText}>No friends yet</Text>
                <Text style={styles.emptySubtext}>
                  Search and add friends to get started
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundLight,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.default,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.lg,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  lastMessage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetails: {
    flex: 1,
  },
  friendEmail: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  chatButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.default,
  },
  removeButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.default,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    ...TYPOGRAPHY.body,
    color: COLORS.textTertiary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.default,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  addFriendButtonText: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    fontWeight: '600',
  },
  friendsHeaderContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  addFriendButtonFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.default,
    gap: SPACING.sm,
    minWidth: 80,
  },
  addFriendButtonTextFixed: {
    ...TYPOGRAPHY.body,
    color: '#fff',
    fontWeight: '600',
  },
  friendsInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  friendsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundLight,
    color: COLORS.text,
    fontSize: 14,
  },
});
