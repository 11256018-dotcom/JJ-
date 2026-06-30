import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { UserProfile } from './authService';

export interface Friend extends UserProfile {
  addedAt?: any;
}

// Search users by name, email, or uid
export async function searchUsers(searchTerm: string): Promise<UserProfile[]> {
  console.log('[SEARCH_USERS] Starting search with term:', searchTerm);
  
  // ⚠️ 防禦性檢查：確保使用者已認證
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.warn('[SEARCH_USERS] User not authenticated, returning empty results');
    return [];
  }

  console.log('[SEARCH_USERS] Current user authenticated, UID:', currentUser.uid);

  const searchTermLower = searchTerm.toLowerCase().trim();
  if (!searchTermLower) {
    console.log('[SEARCH_USERS] Search term is empty, returning empty results');
    return [];
  }

  try {
    console.log('[SEARCH_USERS] Querying by name with term:', searchTermLower);
    
    // Search by name (contains)
    const nameQuery = query(
      collection(db, 'users'),
      where('name', '>=', searchTermLower),
      where('name', '<=', searchTermLower + '\uf8ff')
    );

    const nameSnap = await getDocs(nameQuery);
    let results: UserProfile[] = [];

    console.log('[SEARCH_USERS] Name query returned', nameSnap.size, 'results');
    
    nameSnap.forEach((docSnap) => {
      if (docSnap.id !== currentUser.uid) {
        results.push({ uid: docSnap.id, ...(docSnap.data() as UserProfile) });
      }
    });

    if (!searchTermLower) {
      console.log('[SEARCH_USERS] Search term lower-case is empty, skipping nameLower query');
    } else {
      console.log('[SEARCH_USERS] Querying by normalized nameLower...');
      const nameLowerQuery = query(
        collection(db, 'users'),
        where('nameLower', '>=', searchTermLower),
        where('nameLower', '<=', searchTermLower + '\uf8ff')
      );
      const nameLowerSnap = await getDocs(nameLowerQuery);
      nameLowerSnap.forEach((docSnap) => {
        if (docSnap.id !== currentUser.uid && !results.find((u) => u.uid === docSnap.id)) {
          results.push({ uid: docSnap.id, ...(docSnap.data() as UserProfile) });
        }
      });
    }

    console.log('[SEARCH_USERS] After filtering current user, name results:', results.length);

    // Search by exact UID
    if (searchTermLower.length >= 20) {
      console.log('[SEARCH_USERS] Querying by UID...');
      const uidDoc = await getDoc(doc(db, 'users', searchTerm));
      if (uidDoc.exists() && uidDoc.id !== currentUser.uid && !results.find((u) => u.uid === uidDoc.id)) {
        results.push({ uid: uidDoc.id, ...(uidDoc.data() as UserProfile) });
      }
    }

    // Search by email (exact match). Try both original and lower-cased email field.
    console.log('[SEARCH_USERS] Querying by email...');
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', searchTerm)
    );

    const emailSnap = await getDocs(emailQuery);
    emailSnap.forEach((docSnap) => {
      if (docSnap.id !== currentUser.uid && !results.find((u) => u.uid === docSnap.id)) {
        results.push({ uid: docSnap.id, ...(docSnap.data() as UserProfile) });
      }
    });

    // Also try matching the normalized `emailLower` field if present
    const emailLowerQuery = query(
      collection(db, 'users'),
      where('emailLower', '==', searchTermLower)
    );
    const emailLowerSnap = await getDocs(emailLowerQuery);
    emailLowerSnap.forEach((docSnap) => {
      if (docSnap.id !== currentUser.uid && !results.find((u) => u.uid === docSnap.id)) {
        results.push({ uid: docSnap.id, ...(docSnap.data() as UserProfile) });
      }
    });
    
    // email results already merged above
    console.log('[SEARCH_USERS] Search completed successfully, returning', results.length, 'results');
    return results;
  } catch (error: any) {
    console.error('[SEARCH_USERS] Error during search:', error?.message || error?.toString?.());
    console.error('[SEARCH_USERS] Error type:', error?.constructor?.name);
    
    // 優雅處理：返回空陣列而不是拋出錯誤，避免 JavaScript 被異常卡死
    console.warn('[SEARCH_USERS] Returning empty results due to error');
    return [];
  }
}

// Get user by ID
export async function getUserById(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function getFriendshipBetween(userA: string, userB: string): Promise<{ id: string; data: any } | null> {
  const friendshipsRef = collection(db, 'friendships');

  const q1 = query(
    friendshipsRef,
    where('requesterId', '==', userA),
    where('receiverId', '==', userB)
  );
  const q2 = query(
    friendshipsRef,
    where('requesterId', '==', userB),
    where('receiverId', '==', userA)
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const allDocs = [...snap1.docs, ...snap2.docs];

  if (allDocs.length === 0) {
    const q3 = query(
      friendshipsRef,
      where('requester', '==', userA),
      where('recipient', '==', userB)
    );
    const q4 = query(
      friendshipsRef,
      where('requester', '==', userB),
      where('recipient', '==', userA)
    );

    const [snap3, snap4] = await Promise.all([getDocs(q3), getDocs(q4)]);
    allDocs.push(...snap3.docs, ...snap4.docs);
  }

  if (allDocs.length === 0) return null;

  const docSnap = allDocs[0];
  return { id: docSnap.id, data: docSnap.data() };
}

export async function deleteFriendshipById(friendshipId: string): Promise<void> {
  const friendshipRef = doc(db, 'friendships', friendshipId);
  const friendshipSnap = await getDoc(friendshipRef);
  if (!friendshipSnap.exists()) return;

  const data: any = friendshipSnap.data();
  const requesterUid = data.requesterId || data.requester;
  const receiverUid = data.receiverId || data.recipient;
  const status = data.status;

  await updateDoc(friendshipRef, {
    status: 'none',
    updatedAt: serverTimestamp(),
  });

  if (status === 'accepted' && requesterUid && receiverUid) {
    try {
      await Promise.all([
        updateDoc(doc(db, 'users', requesterUid), {
          friendIds: arrayRemove(receiverUid),
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', receiverUid), {
          friendIds: arrayRemove(requesterUid),
          updatedAt: serverTimestamp(),
        }),
      ]);
    } catch (cleanupError) {
      console.error('[FRIEND_SERVICE] Failed to clean friendIds after soft deleting friendship:', cleanupError);
    }
  }
}

export async function deleteFriendshipBetween(userA: string, userB: string): Promise<void> {
  const friendship = await getFriendshipBetween(userA, userB);
  if (!friendship) return;
  await deleteFriendshipById(friendship.id);
}

// Add friend (bidirectional)
export async function addFriend(friendUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  if (friendUid === currentUser.uid) {
    throw new Error('You cannot add yourself as a friend.');
  }

  try {
    const existingFriendship = await getFriendshipBetween(currentUser.uid, friendUid);
    if (existingFriendship) {
      const friendshipRef = doc(db, 'friendships', existingFriendship.id);
      const data: any = existingFriendship.data;
      const status = data.status || 'none';

      if (status === 'accepted') {
        throw new Error('This user is already your friend.');
      }

      await updateDoc(friendshipRef, {
        status: 'accepted',
        senderId: currentUser.uid,
        receiverId: friendUid,
        requester: currentUser.uid,
        recipient: friendUid,
        requesterId: currentUser.uid,
        updatedAt: serverTimestamp(),
      });

      await Promise.all([
        updateDoc(doc(db, 'users', currentUser.uid), {
          friendIds: arrayUnion(friendUid),
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', friendUid), {
          friendIds: arrayUnion(currentUser.uid),
          updatedAt: serverTimestamp(),
        }),
      ]).catch(() => {
        // Ignore failures when friendIds is absent or cannot be updated
      });

      console.log('[FRIEND_SERVICE] Re-opened friendship status to accepted:', existingFriendship.id);
      return;
    }

    const friendshipRef = await addDoc(collection(db, 'friendships'), {
      requester: currentUser.uid,
      recipient: friendUid,
      requesterId: currentUser.uid,
      receiverId: friendUid,
      senderId: currentUser.uid,
      status: 'accepted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await Promise.all([
      updateDoc(doc(db, 'users', currentUser.uid), {
        friendIds: arrayUnion(friendUid),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, 'users', friendUid), {
        friendIds: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      }),
    ]).catch(() => {
      // Ignore failures when friendIds is absent or cannot be updated
    });

    console.log('[FRIEND_SERVICE] Friendship created and accepted, id:', friendshipRef.id);
  } catch (error: any) {
    console.error('Error adding friend:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Remove friend (bidirectional)
export async function removeFriend(friendUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // Remove friend from current user's friend list
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friendIds: arrayRemove(friendUid),
      updatedAt: serverTimestamp(),
    });

    // Remove current user from friend's friend list
    await updateDoc(doc(db, 'users', friendUid), {
      friendIds: arrayRemove(currentUser.uid),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}

// Delete friendship by friendship ID (most direct method)
export async function deleteFriendshipWithId(friendshipId: string): Promise<void> {
  if (!friendshipId) throw new Error('Friendship ID is required');

  try {
    const friendshipRef = doc(db, 'friendships', friendshipId);
    const friendshipSnap = await getDoc(friendshipRef);

    if (!friendshipSnap.exists()) {
      throw new Error('Friendship document not found');
    }

    const data: any = friendshipSnap.data();
    const requesterUid = data.requesterId || data.requester;
    const receiverUid = data.receiverId || data.recipient;

    // Update friendship status to 'none'
    await updateDoc(friendshipRef, {
      status: 'none',
      updatedAt: serverTimestamp(),
    });

    // Clean up both sides' friendIds arrays
    if (requesterUid && receiverUid) {
      await Promise.all([
        updateDoc(doc(db, 'users', requesterUid), {
          friendIds: arrayRemove(receiverUid),
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, 'users', receiverUid), {
          friendIds: arrayRemove(requesterUid),
          updatedAt: serverTimestamp(),
        }),
      ]).catch(() => {
        // Ignore failures when friendIds cannot be updated
      });
    }

    console.log(`[FRIEND_SERVICE] Friendship ${friendshipId} status changed to 'none'`);
  } catch (error) {
    console.error('Error deleting friendship by ID:', error);
    throw error;
  }
}

// Delete friendship records and clean up both sides
export async function deleteFriend(friendUid: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  const friendship = await getFriendshipBetween(currentUser.uid, friendUid);
  if (!friendship) {
    return;
  }

  const friendshipRef = doc(db, 'friendships', friendship.id);
  try {
    await updateDoc(friendshipRef, {
      status: 'none',
      updatedAt: serverTimestamp(),
    });

    await Promise.all([
      updateDoc(doc(db, 'users', currentUser.uid), {
        friendIds: arrayRemove(friendUid),
        updatedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, 'users', friendUid), {
        friendIds: arrayRemove(currentUser.uid),
        updatedAt: serverTimestamp(),
      }),
    ]).catch(() => {
      // Ignore failures when friendIds cannot be updated
    });
  } catch (error) {
    console.error('Error soft deleting friend relationship:', error);
    throw error;
  }
}

// Get all friends of current user
export async function getFriendsOfCurrentUser(): Promise<Friend[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const friendshipsRef = collection(db, 'friendships');
    const q1 = query(
      friendshipsRef,
      where('requesterId', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );
    const q2 = query(
      friendshipsRef,
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );
    const q3 = query(
      friendshipsRef,
      where('requester', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );
    const q4 = query(
      friendshipsRef,
      where('recipient', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );

    const [snap1, snap2, snap3, snap4] = await Promise.all([getDocs(q1), getDocs(q2), getDocs(q3), getDocs(q4)]);
    const friendIds = new Set<string>();
    snap1.forEach((doc) => {
      const data: any = doc.data();
      if (data.receiverId) friendIds.add(data.receiverId);
    });
    snap2.forEach((doc) => {
      const data: any = doc.data();
      if (data.requesterId) friendIds.add(data.requesterId);
    });
    snap3.forEach((doc) => {
      const data: any = doc.data();
      if (data.recipient) friendIds.add(data.recipient);
    });
    snap4.forEach((doc) => {
      const data: any = doc.data();
      if (data.requester) friendIds.add(data.requester);
    });

    if (friendIds.size === 0) return [];

    const friendsPromises = Array.from(friendIds).map((friendUid) => getUserById(friendUid));
    const friends = await Promise.all(friendsPromises);

    return friends.filter((friend) => friend !== null) as Friend[];
  } catch (error) {
    console.error('Error getting friends:', error);
    throw error;
  }
}

// Get friends list for a specific user
export async function getFriendsOfUser(uid: string): Promise<Friend[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.data();
    const friendIds = (userData?.friendIds as string[]) || [];

    if (friendIds.length === 0) return [];

    const friendsPromises = friendIds.map((friendUid) => getUserById(friendUid));
    const friends = await Promise.all(friendsPromises);

    return friends.filter((friend) => friend !== null) as Friend[];
  } catch (error) {
    console.error('Error getting user friends:', error);
    throw error;
  }
}

// Check if two users are friends
export async function areFriends(user1Uid: string, user2Uid: string): Promise<boolean> {
  try {
    const friendship = await getFriendshipBetween(user1Uid, user2Uid);
    return friendship?.data?.status === 'accepted';
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
}

// Get incoming friend requests for the current user (status: 'pending')
export async function getIncomingFriendRequests(): Promise<any[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // Prefer `receiverId` field, fall back to `recipient` if needed
    let q = query(
      collection(db, 'friendships'),
      where('receiverId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );

    const snap = await getDocs(q);
    if (snap.empty) {
      // try legacy field
      q = query(
        collection(db, 'friendships'),
        where('recipient', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
    }
    const requests: any[] = [];
    snap.forEach((d) => requests.push({ id: d.id, ...d.data() }));
    return requests;
  } catch (error) {
    console.error('[FRIEND_SERVICE] Error fetching incoming requests:', error);
    return [];
  }
}

// Accept friend request: update friendship.status to 'accepted' and update both users' friendIds
export async function acceptFriend(friendshipId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const friendshipDocRef = doc(db, 'friendships', friendshipId);
    const friendshipDoc = await getDoc(friendshipDocRef);
    if (!friendshipDoc.exists()) throw new Error('Friendship request not found');

    const data: any = friendshipDoc.data();
    const recipientId = data.receiverId || data.recipient;
    if (recipientId !== currentUser.uid) throw new Error('Not authorized to accept this request');
    if (data.status !== 'pending') throw new Error('Friendship request is not pending');

    // Update friendship status
    await updateDoc(friendshipDocRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });

    const requesterUid = (data.senderId || data.requester) as string;

    // Update both users' friend lists. Use setDoc with merge as fallback if update fails.
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        friendIds: arrayUnion(requesterUid),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      await setDoc(doc(db, 'users', currentUser.uid), { friendIds: [requesterUid], updatedAt: serverTimestamp() }, { merge: true });
    }

    try {
      await updateDoc(doc(db, 'users', requesterUid), {
        friendIds: arrayUnion(currentUser.uid),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      await setDoc(doc(db, 'users', requesterUid), { friendIds: [currentUser.uid], updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch (error: any) {
    console.error('[FRIEND_SERVICE] Error accepting friend request:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Reject friend request: mark as 'rejected' or delete
export async function rejectFriend(friendshipId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Not authenticated');

  try {
    const friendshipDocRef = doc(db, 'friendships', friendshipId);
    const friendshipDoc = await getDoc(friendshipDocRef);
    if (!friendshipDoc.exists()) return;

    const data: any = friendshipDoc.data();
    const recipientId = data.receiverId || data.recipient;
    if (recipientId !== currentUser.uid) throw new Error('Not authorized to reject this request');

    await updateDoc(friendshipDocRef, {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('[FRIEND_SERVICE] Error rejecting friend request:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
