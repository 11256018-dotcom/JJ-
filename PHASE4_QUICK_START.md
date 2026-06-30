# 第四階段實現快速指南

## 🎯 完成的任務

### ✅ 1. 好友列表頁
- **位置**：`app/(tabs)/chats/index.tsx` 中的「好友列表」Tab
- **功能**：
  - 顯示所有已加入的好友
  - 每個好友卡片包含：頭像、名字、Email
  - 聊天按鈕：快速進入該好友的聊天室
  - 刪除按鈕：移除好友（需確認）
  - 搜尋功能：快速篩選好友

### ✅ 2. 聊天室列表頁
- **位置**：`app/(tabs)/chats/index.tsx` 中的「聊天室」Tab
- **功能**：
  - 顯示所有有互動過的聊天室
  - 每個聊天卡片包含：
    - ✅ 對方的頭像
    - ✅ 對方的名字
    - ✅ **最後一筆訊息的內容**（預覽）
    - ✅ **最後訊息的發送時間**（相對時間）
  - 下拉刷新功能
  - 實時同步（onSnapshot 監聽）

### ✅ 3. 導航和跳轉
- 點擊「聊天室」列表中任意聊天 → 跳轉至 `/(tabs)/chat/{friendUid}`
- 點擊「好友列表」中任意好友 → 跳轉至 `/(tabs)/chat/{friendUid}`
- 聊天頁面自動加載該好友的聊天紀錄

---

## 📁 改動的文件

### 主要改動
- **`app/(tabs)/chats/index.tsx`** - 完全重構，支持 Tab 切換

### 保留的文件（備用）
- `app/(tabs)/chats/list.tsx` - 獨立的聊天列表頁（可選使用）
- `app/(tabs)/chat/friends.tsx` - 獨立的好友列表頁（可選使用）
- `app/(tabs)/chat/contacts.tsx` - 搜尋好友頁面

---

## 🔄 工作流程

### 用戶流程 1：查看聊天
```
1. 進入「聊天」主 Tab
2. 自動顯示「聊天室」子 Tab
3. 看到所有與好友的聊天列表
4. 點擊任一聊天進入對話
```

### 用戶流程 2：查看好友
```
1. 進入「聊天」主 Tab
2. 點擊「好友列表」子 Tab
3. 看到所有好友
4. 可點擊「聊天」或「刪除」操作
```

### 用戶流程 3：添加好友
```
1. 在好友列表為空時點擊「搜尋好友」
2. 或通過導航手動進入搜尋頁面
3. 搜尋並添加好友
4. 回到好友列表會自動更新
```

---

## 💻 代碼高亮

### Tab 切換實現
```tsx
const [activeTab, setActiveTab] = useState<TabType>('chats');

<Pressable
  style={[styles.tabButton, activeTab === 'chats' && styles.tabButtonActive]}
  onPress={() => setActiveTab('chats')}
>
  {/* Tab 內容 */}
</Pressable>
```

### 聊天列表渲染
```tsx
const renderChatItem = ({ item }: { item: ChatPreview }) => {
  const otherParticipant = getOtherParticipant(item);
  
  return (
    <TouchableOpacity onPress={() => handleChatPress(item)}>
      <Image source={{ uri: otherParticipant.avatar }} />
      <Text>{otherParticipant.name}</Text>
      <Text>{item.lastMessage}</Text>
      <Text>{formatTime(item.lastMessageTime)}</Text>
    </TouchableOpacity>
  );
};
```

### 時間格式化
```tsx
const formatTime = (timestamp: any) => {
  // 今天 → HH:MM
  // 昨天 → Yesterday
  // 其他 → MMM D
};
```

---

## 🧪 測試檢查清單

在測試應用時，請驗證以下項目：

### 聊天列表測試
- [ ] 進入「聊天」Tab 看到「聊天室」子 Tab（默認）
- [ ] 顯示所有聊天的頭像、名字、最後訊息、時間
- [ ] 點擊聊天進入該好友的聊天室
- [ ] 下拉刷新列表更新
- [ ] 搜尋框能篩選聊天
- [ ] 無聊天時顯示空狀態

### 好友列表測試
- [ ] 點擊「好友列表」Tab
- [ ] 顯示所有好友的頭像、名字、Email
- [ ] 點擊「聊天」按鈕進入對話
- [ ] 點擊「刪除」按鈕彈出確認對話
- [ ] 確認刪除後好友被移除
- [ ] 下拉刷新列表更新
- [ ] 搜尋框能篩選好友
- [ ] 無好友時顯示空狀態 + 快速進入搜尋

### 導航測試
- [ ] 從聊天列表點擊跳轉正確
- [ ] 從好友列表點擊跳轉正確
- [ ] 聊天頁面加載正確的對方信息
- [ ] 返回主頁面後 Tab 保持狀態

### 實時同步測試
- [ ] 在 Tab 1 中發送訊息，聊天列表實時更新最後訊息
- [ ] 在 Tab 1 中新聊天自動出現在列表中
- [ ] 修改好友狀態後好友列表實時更新

---

## 📊 數據結構

### ChatPreview（聊天預覽）
```typescript
{
  id: string;              // 聊天 ID (uid1_uid2)
  participants: string[];  // 參與者 UID
  participantNames: { [uid]: string };    // 名字映射
  participantAvatars: { [uid]: string };  // 頭像映射
  lastMessage?: string;          // 最後訊息內容
  lastMessageTime?: timestamp;   // 最後訊息時間
  lastMessageSenderId?: string;  // 最後訊息發送者
}
```

### Friend（好友）
```typescript
{
  uid: string;      // 用戶 ID
  email: string;    // Email
  name: string;     // 名字
  avatarURL: string; // 頭像 URL
  friendIds?: string[]; // 好友列表 ID
}
```

---

## 🚀 關鍵功能

### 功能 1：實時同步
- 使用 `subscribeToChatList()` 監聽聊天列表變化
- 新訊息自動更新聊天卡片
- 用戶無需手動刷新

### 功能 2：相對時間
- 智能時間顯示：時間/昨天/日期
- 用戶友善的時間格式

### 功能 3：快速搜尋
- 同一搜尋框支持兩個 Tab
- 提示文本動態改變
- 實時篩選結果

### 功能 4：下拉刷新
- 兩個 Tab 都支援 RefreshControl
- 手動同步最新數據

### 功能 5：空狀態
- 友善的空狀態提示
- 好友列表中有快速進入搜尋的按鈕

---

## 🐛 已知限制與未來改進

### 當前限制
1. 搜尋結果不排序（按 Firestore 默認順序）
2. 未實現虛擬列表（大量聊天/好友時可能性能下降）
3. 未顯示未讀計數

### 計劃的改進
- [ ] 添加未讀訊息計數和紅點提示
- [ ] 實現聊天置頂/取消置頂
- [ ] 聊天室存檔功能
- [ ] 訊息搜尋跨聊天室
- [ ] 對方輸入狀態指示

---

## 📞 故障排除

### 問題 1：聊天列表為空但有好友
**原因**：未有任何訊息交互  
**解決**：發送至少一條訊息以創建聊天記錄

### 問題 2：時間顯示不正確
**原因**：Firestore Timestamp 時區問題  
**解決**：檢查 `formatTime()` 函數中的時區設置

### 問題 3：好友刪除後仍出現在列表
**原因**：實時監聽未更新  
**解決**：確保 `useFocusEffect` 在 Tab 切換時重新加載

### 問題 4：搜尋功能不工作
**原因**：搜尋邏輯需要本地過濾（Firestore 不支持模糊搜尋）  
**解決**：檢查列表數據是否正確加載，搜尋邏輯是否應用

---

## 📚 相關文檔

- [FIREBASE_SETUP.md](FIREBASE_SETUP.md) - Firebase 配置和 Firestore 規則
- [CHAT_SYSTEM.md](CHAT_SYSTEM.md) - 聊天系統完整設計
- [FRIEND_SYSTEM.md](FRIEND_SYSTEM.md) - 好友系統設計
- [PHASE4_INTEGRATION.md](PHASE4_INTEGRATION.md) - 完整整合文檔

---

## ✅ 規格確認

此實現滿足用戶所有要求：

✅ 「好友列表頁」顯示所有已加入的好友  
✅ 「聊天室列表頁」顯示所有有互動過的聊天室  
✅ **顯示最後一筆訊息的內容**  
✅ **顯示最後訊息的發送時間**  
✅ 點擊列表後正確帶入資料並跳轉  
✅ 符合專案所有規格  

---

**版本**：1.0  
**更新時間**：2026-06-16  
**狀態**：✅ 完成

