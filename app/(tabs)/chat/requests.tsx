import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query as fsQuery, onSnapshot, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../config/firebaseConfig';
import { useAuth } from '../../../context/AuthContext';
import { acceptFriend, rejectFriend } from '../../../services/friendService';

export default function FriendRequestsScreen() {
  const { isLoggedIn, loading: authLoading, user } = useAuth() as any;
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || authLoading) return;

    const currentUserId = user?.uid;
    console.log('目前登入的B用戶UID是:', currentUserId);

    setLoading(true);

    const q = fsQuery(
      collection(db, 'friendships'),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items: any[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        console.log('[REQUESTS] incoming requests count:', items.length);
        if (items.length === 0) console.log('目前沒有找到任何給我的待處理好友申請');
        setRequests(items);
        setLoading(false);
      },
      (err) => {
        console.error('[REQUESTS] onSnapshot error', err);
        Alert.alert('錯誤', err?.message || String(err));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isLoggedIn, authLoading, user]);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      await acceptFriend(id);
      Alert.alert('成功', '已成為好友');
      await router.replace('/(tabs)/chats');
    } catch (e: any) {
      console.error('[REQUESTS] accept error', e);
      Alert.alert('錯誤', e?.message || String(e));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectFriend(id);
      Alert.alert('已拒絕', '已拒絕好友邀請');
    } catch (e: any) {
      console.error('[REQUESTS] reject error', e);
      Alert.alert('錯誤', e?.message || String(e));
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.item}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>來自: {item.senderId || item.requester}</Text>
        <Text style={styles.meta}>狀態: {item.status}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.accept}
          onPress={() => handleAccept(item.id)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reject}
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Text>請先登入以查看好友邀請</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text>目前沒有好友邀請</Text>
        </View>
      ) : (
        <FlatList data={requests} renderItem={renderItem} keyExtractor={(i) => i.id} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', margin: 8, borderRadius: 8 },
  name: { fontWeight: 'bold' },
  meta: { color: '#666', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  accept: { backgroundColor: '#28a745', padding: 8, borderRadius: 6, marginRight: 8 },
  reject: { backgroundColor: '#dc3545', padding: 8, borderRadius: 6 },
});
