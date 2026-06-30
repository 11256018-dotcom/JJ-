# 好友系統設計文檔

## 數據庫結構

### Users Collection
```
users/
  {uid}/
    - uid: string (user ID)
    - email: string
    - name: string
    - avatarURL: string
    - friendIds: string[] (好友 UID 陣列)
    - createdAt: timestamp
    - updatedAt: timestamp
```

### Chats Collection（用於聊天室）
```
chats/
  {chatId}/
    - id: string (聊天室 ID，通常為 uid1_uid2 格式)
    - participants: string[] (參與者 UID)
    - createdAt: timestamp
    - updatedAt: timestamp
    - lastMessage: string (最後一條訊息)
    - lastMessageTime: timestamp
    
    messages/
      {messageId}/
        - id: string
        - senderId: string
        - text: string
        - timestamp: timestamp
        - senderName: string
        - senderAvatar: string
```

## 核心功能

### 1. 搜尋好友
- **搜尋方式**：按名字、Email、或 UID
- **實作方式**：
  - 名字搜尋：使用 Firestore 的 where 子句（需要複合索引）
  - Email 搜尋：精準匹配
  - 排除已加好友的使用者

### 2. 加好友
- **流程**：
  1. 使用者點擊「加好友」按鈕
  2. 系統在雙方的 `friendIds` 陣列中新增對方 UID
  3. 雙方都能立即看到彼此在好友列表中
  
- **實作方式**（位於 `friendService.ts`）：
```typescript
// 同時更新雙方的 friendIds
await updateDoc(doc(db, 'users', currentUser.uid), {
  friendIds: arrayUnion(friendUid),
});
await updateDoc(doc(db, 'users', friendUid), {
  friendIds: arrayUnion(currentUser.uid),
});
```

### 3. 移除好友
- **流程**：從雙方的 `friendIds` 陣列中移除對方 UID
- **實作方式**：使用 `arrayRemove` 操作

## Firestore 安全規則

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // 所有已驗證使用者都可以讀取其他使用者的資料
      allow read: if request.auth != null;
      
      // 使用者只能編輯自己的文件
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // 允許特定欄位的更新（好友列表）
      allow update: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(userId)).data.friendIds.hasAny([request.auth.uid]));
    }
    
    // Chats collection
    match /chats/{chatId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Messages subcollection
    match /chats/{chatId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.senderId == request.auth.uid;
    }
  }
}
```

## API 端點（friendService.ts）

### 搜尋使用者
```typescript
searchUsers(searchTerm: string): Promise<UserProfile[]>
// 搜尋名字、Email 或 UID
// 自動排除已加好友的使用者
```

### 新增好友
```typescript
addFriend(friendUid: string): Promise<void>
// 雙向新增好友關係
```

### 移除好友
```typescript
removeFriend(friendUid: string): Promise<void>
// 雙向移除好友關係
```

### 取得好友列表
```typescript
getFriendsOfCurrentUser(): Promise<Friend[]>
// 取得目前登入使用者的好友列表
```

### 檢查友誼關係
```typescript
areFriends(user1Uid: string, user2Uid: string): Promise<boolean>
// 檢查兩個使用者是否為好友
```

## UI 頁面

### 1. 搜尋好友 (`app/(tabs)/chat/contacts.tsx`)
- **功能**：
  - 搜尋框（輸入名字或 Email）
  - 顯示搜尋結果
  - 「加好友」按鈕

### 2. 好友列表 (`app/(tabs)/chat/friends.tsx`)
- **功能**：
  - 顯示所有好友
  - 點擊好友進入聊天室
  - 移除好友選項

### 3. 聊天列表導航 (`app/(tabs)/chats/index.tsx`)
- **新增功能**：
  - 「我的好友」導航按鈕 → 進入好友列表
  - 「搜尋好友」導航按鈕 → 進入搜尋頁面

## 開發建議

1. **初始化新使用者**
   - 在註冊時自動初始化 `friendIds: []`

2. **搜尋最佳化**
   - 考慮建立複合索引以提高搜尋效能
   - Firebase Console 會自動提示需要的索引

3. **好友列表快取**
   - 在第一次加載好友列表時快取
   - 使用 AuthContext 管理狀態

4. **安全性考量**
   - 不要在用戶端儲存敏感資料
   - 確保 Firestore 規則只允許授權操作

## 常見問題

### Q: 如何確保好友關係的一致性？
A: 使用 Firebase 交易（Transaction）可以確保雙方的更新同時成功或失敗。

### Q: 如何搜尋全域使用者（不限於好友）？
A: 在 `searchUsers` 中實作分頁和全文搜尋，或使用 Algolia 等第三方服務。

### Q: 如何實作好友請求審核機制？
A: 建立 `friendRequests` 集合，儲存待處理的好友請求，管理員或使用者可以接受/拒絕。
