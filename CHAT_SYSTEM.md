# 聊天系統設計文檔

## 數據庫結構

### Chats Collection（聊天室）
```
chats/
  {chatId}/  (格式: uid1_uid2，按字母序排列)
    - id: string (聊天室 ID)
    - participants: string[] (參與者 UID)
    - participantNames: { [uid]: string }
    - participantAvatars: { [uid]: string }
    - createdAt: timestamp
    - updatedAt: timestamp
    - lastMessage: string (最後一條訊息內容)
    - lastMessageTime: timestamp (最後訊息時間)
    - lastMessageSenderId: string (最後訊息發送者 ID)
    - archivedBy: string[] (歸檔者 UID)
    
    messages/
      {messageId}/
        - id: string (訊息 ID)
        - senderId: string (發送者 UID)
        - senderName: string (發送者名字)
        - senderAvatar: string (發送者頭像 URL)
        - text: string (訊息內容)
        - timestamp: timestamp (訊息時間戳)
        - readBy: string[] (已讀者 UID 陣列)
```

## 核心功能

### 1. 建立聊天室
- **流程**：
  1. 點擊好友進入聊天
  2. 系統根據 `uid1_uid2` 格式生成聊天室 ID
  3. 若聊天室不存在，自動建立
  4. 若存在，直接進入

- **實作**（位於 `chatService.ts`）：
```typescript
export function generateChatId(uid1: string, uid2: string): string {
  const ids = [uid1, uid2].sort();
  return `${ids[0]}_${ids[1]}`;
}
```

### 2. 發送訊息
- **流程**：
  1. 使用者輸入訊息並點擊發送
  2. 系統在 `chats/{chatId}/messages` 新增訊息文件
  3. 同時更新聊天室元數據（最後訊息、時間等）
  4. 訊息實時推送給對方

- **參數**：
  - `chatId`: 聊天室 ID
  - `text`: 訊息內容
  - `timestamp`: 伺服器時間戳
  - `readBy`: 包含發送者 UID 的陣列

### 3. 實時監聽訊息
- **使用 Firestore onSnapshot**：
  - 訂閱 `chats/{chatId}/messages` 集合
  - 按 `timestamp` 升序排列
  - 自動接收新訊息更新

- **實作**：
```typescript
export function subscribeToMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        chatId,
        ...doc.data(),
      } as Message);
    });
    callback(messages);
  });
}
```

### 4. 已讀狀態
- **實作方式**：
  - 每條訊息包含 `readBy` 陣列
  - 進入聊天室時自動標記所有訊息為已讀
  - 顯示已讀狀態：✓ (未讀) / ✓✓ (已讀)

- **流程**：
  1. 使用者進入聊天室
  2. 執行 `markAllAsRead(chatId)` 函數
  3. 批量更新聊天室中的所有訊息
  4. 在訊息氣泡上顯示已讀指示器

### 5. 聊天列表
- **功能**：
  - 顯示所有進行中的聊天
  - 按最新訊息時間排序
  - 顯示最後訊息預覽
  - 顯示未讀計數（可選）

- **實作**：
```typescript
export async function getChatList(): Promise<ChatPreview[]> {
  const currentUser = auth.currentUser;
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', currentUser.uid),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

## UI 組件

### ChatDetailScreen (`app/(tabs)/chat/[id].tsx`)
**功能**：
- 顯示聊天訊息列表
- 實時監聽新訊息
- 訊息輸入和發送
- 頭像、名字、時間戳顯示
- 已讀狀態指示器

**特性**：
- 訊息按時間順序排列
- 當前使用者訊息靠右，對方訊息靠左
- 自動捲動到最新訊息
- 支援多行文本輸入
- 載入中和發送中狀態反饋

### Message Bubble
**顯示內容**：
- 發送者頭像（非當前使用者）
- 訊息文本
- 發送時間（12 小時格式）
- 已讀狀態（僅當前使用者訊息）

### 聊天列表（待實作）
**顯示內容**：
- 聯絡人頭像
- 聯絡人名字
- 最後訊息預覽
- 最後訊息時間
- 未讀訊息計數（可選）

## Firestore 安全規則

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Chats collection
    match /chats/{chatId} {
      // 參與者可讀取
      allow read: if request.auth != null && 
        resource.data.participants.hasAny([request.auth.uid]);
      
      // 參與者可建立聊天室
      allow create: if request.auth != null;
      
      // 參與者可更新（例如最後訊息）
      allow update: if request.auth != null;
    }
    
    // Messages subcollection
    match /chats/{chatId}/messages/{messageId} {
      // 聊天參與者可讀取
      allow read: if request.auth != null;
      
      // 已驗證使用者可發送訊息
      allow create: if request.auth != null;
      
      // 訊息發送者可編輯（標記已讀）
      allow update: if request.auth != null;
      
      // 訊息發送者可刪除
      allow delete: if request.auth != null && 
        resource.data.senderId == request.auth.uid;
    }
  }
}
```

## 性能考量

### 1. 訊息分頁
- 初始加載時只載入最近 50 條訊息
- 向上滑動時載入更多舊訊息（可選）

### 2. 實時監聽優化
- 使用 `unsubscribe()` 在元件卸載時取消訂閱
- 避免內存洩漏

### 3. 批量操作
- 使用 `writeBatch` 進行批量更新已讀狀態
- 減少 API 調用次數

## 未來功能建議

### 1. 訊息搜尋
- 在特定聊天中搜尋訊息
- 全域訊息搜尋（需要第三方服務如 Algolia）

### 2. 媒體支援
- 圖片、音頻、視頻上傳
- 檔案共享

### 3. 群組聊天
- 擴展 `participants` 陣列以支援多於 2 人
- 群組設定（名字、圖片、描述）

### 4. 端到端加密
- 使用 WebCrypto 或 TweetNaCl.js
- 在 Firestore 中儲存加密訊息

### 5. 訊息已送達/已讀收據
- 三層狀態：已送達、已讀、已確認
- 顯示對方的輸入狀態

## 常見問題

### Q: 訊息會無限增長嗎？
A: 是的。可考慮實施自動刪除策略或存檔舊訊息到備份。

### Q: 如何確保訊息安全？
A: 使用 Firestore 安全規則確保只有參與者可存取。建議啟用端到端加密。

### Q: 如何處理離線訊息？
A: Firebase 支援離線功能。在網絡連接恢復時自動同步。

### Q: 如何實現訊息撤回？
A: 在訊息中新增 `deleted` 欄位，前端檢查此欄位以隱藏已撤回的訊息。
