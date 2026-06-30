# 第四階段：列表呈現與優化（已完成）

## 功能概述

第四階段整合了「好友列表頁」和「聊天室列表頁」的顯示功能，提供統一的列表管理界面。

---

## 實現的頁面

### 1. 聊天主頁面 (`app/(tabs)/chats/index.tsx`)
**功能**：整合的聊天和好友管理中心，支持 Tab 切換

#### Tab 1：聊天室列表
- 顯示所有進行中的聊天
- 顯示項目包含：
  - 對方的頭像
  - 對方的名字
  - **最後一筆訊息的內容**（預覽文本）
  - **最後訊息的發送時間**（相對時間：今天、昨天、日期）

#### Tab 2：好友列表
- 顯示所有已加入的好友
- 顯示項目包含：
  - 好友頭像
  - 好友名字
  - 好友 Email
  - 聊天按鈕（快速進入聊天）
  - 刪除好友按鈕

#### 特性
- **搜尋功能**：支援在聊天或好友列表中搜尋
- **下拉刷新**：兩個 Tab 都支援下拉刷新
- **實時同步**：使用 onSnapshot 監聽聊天列表變化
- **空狀態提示**：沒有聊天或好友時顯示友善的提示
- **加好友快捷按鈕**：在空狀態中直接跳轉到搜尋頁面

---

## 數據流程

### 聊天列表加載流程
```
1. 進入「聊天室」Tab
2. 執行 getChatList() 獲取初始聊天列表
3. 使用 subscribeToChatList() 監聽實時更新
4. 用戶點擊聊天項目 → 提取對方的 UID
5. 跳轉到 /(tabs)/chat/{otherParticipantUid}
```

### 好友列表加載流程
```
1. 進入「好友列表」Tab
2. 執行 getFriendsOfCurrentUser() 獲取好友列表
3. 用戶點擊好友 → 提取好友的 UID
4. 跳轉到 /(tabs)/chat/{friendUid}
5. 若點擊「刪除」按鈕 → 執行 removeFriend({friendUid})
```

---

## 時間格式化邏輯

最後訊息時間的顯示遵循以下規則：

| 時間情況 | 顯示格式 |
|--------|---------|
| 今天 | `HH:MM` (例：14:30) |
| 昨天 | `Yesterday` |
| 其他日期 | `MMM D` (例：Jun 15) |

實現代碼：
```typescript
const formatTime = (timestamp: any) => {
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
```

---

## UI 組件分布

### 主 Tab 導航 (`app/(tabs)/_layout.tsx`)
```
聊天 [active] | 設定
```

### 聊天主頁 (`app/(tabs)/chats/index.tsx`)
```
┌─────────────────────────────────┐
│ 聊天室          │ 好友列表      │  ← Tab 切換
├─────────────────────────────────┤
│ [搜尋框]                        │
├─────────────────────────────────┤
│                                 │
│ 聊天 1    [訊息預覽...]  14:30  │  ← 聊天列表
│                                 │
│ 聊天 2    [訊息預覽...]  昨天  │
│                                 │
└─────────────────────────────────┘
```

### 聊天室詳情頁 (`app/(tabs)/chat/[id].tsx`)
- 用戶點擊列表項後跳轉至此
- 顯示與特定好友的實時聊天

### 好友搜尋頁 (`app/(tabs)/chat/contacts.tsx`)
- 用戶可搜尋並加入新好友

---

## 導航流程圖

```
聊天 Tab
  ├─ 聊天室列表（索引頁）
  │   ├─ 點擊聊天 → 進入 /(tabs)/chat/{friendUid}
  │   └─ 下拉刷新 → 重新加載聊天列表
  │
  ├─ 好友列表（索引頁）
  │   ├─ 點擊好友 → 進入 /(tabs)/chat/{friendUid}
  │   ├─ 點擊刪除 → 顯示確認對話 → 刪除好友
  │   └─ 下拉刷新 → 重新加載好友列表
  │
  └─ 聊天室詳情
      ├─ 返回 → 回到聊天列表
      ├─ 接收實時訊息
      └─ 發送訊息
```

---

## 相關服務函數

### chatService.ts
```typescript
export async function getChatList(): Promise<ChatPreview[]>
  // 獲取當前使用者的所有聊天列表

export function subscribeToChatList(
  callback: (chats: ChatPreview[]) => void
): Unsubscribe
  // 實時監聽聊天列表變化
```

### friendService.ts
```typescript
export async function getFriendsOfCurrentUser(): Promise<Friend[]>
  // 獲取當前使用者的所有好友

export async function removeFriend(friendUid: string): Promise<void>
  // 移除指定好友（雙向刪除）
```

---

## 特性詳解

### 搜尋功能
- **聊天列表**：搜尋聊天室（按對方名字）
- **好友列表**：搜尋好友（按名字或 Email）
- 搜尋框提示文本會根據當前 Tab 動態改變

### 下拉刷新
- 兩個 Tab 都支援 `RefreshControl`
- 聊天列表刷新調用 `getChatList()`
- 好友列表刷新調用 `getFriendsOfCurrentUser()`

### 加載狀態
- 初始加載時顯示 `ActivityIndicator`
- 若列表為空，顯示友善的空狀態提示
- 好友列表空狀態提供「搜尋好友」按鈕快捷進入搜尋頁

### 刪除確認
- 點擊「刪除好友」時彈出確認對話
- 顯示好友名字以提醒使用者
- 刪除過程中按鈕顯示加載指示器

---

## 整合檢查清單

- [x] 改進 `app/(tabs)/chats/index.tsx` 支援聊天/好友 Tab 切換
- [x] 聊天列表顯示：頭像、名字、最後訊息、時間
- [x] 好友列表顯示：頭像、名字、Email、動作按鈕
- [x] 實現時間格式化邏輯（相對時間）
- [x] 實現搜尋功能（根據 Tab 動態改變）
- [x] 下拉刷新功能（兩個 Tab）
- [x] 空狀態提示和快捷按鈕
- [x] 點擊後正確跳轉至聊天室
- [x] 好友刪除功能和確認對話
- [x] 實時同步聊天列表變化

---

## 測試場景

### 場景 1：查看聊天列表
1. 進入「聊天」Tab → 切換到「聊天室」子 Tab
2. 應看到所有進行過聊天的好友及最後訊息
3. 點擊任一聊天進入該聊天室

### 場景 2：查看好友列表
1. 進入「聊天」Tab → 切換到「好友列表」子 Tab
2. 應看到所有好友及其信息
3. 點擊「聊天」按鈕進入該好友的聊天室
4. 點擊「刪除」按鈕移除好友

### 場景 3：搜尋聊天
1. 在聊天室列表中輸入好友名字
2. 列表應篩選出匹配的聊天

### 場景 4：搜尋好友
1. 在好友列表中輸入名字或 Email
2. 列表應篩選出匹配的好友

### 場景 5：下拉刷新
1. 在任一 Tab 下拉刷新
2. 列表應更新最新數據

### 場景 6：空狀態
1. 若使用者沒有任何聊天或好友
2. 應顯示友善提示和快捷按鈕

---

## 文件結構

```
app/(tabs)/
  ├─ chats/
  │   ├─ index.tsx         ← 聊天主頁（已改進）
  │   ├─ list.tsx          （保留，可作為單獨聊天列表頁）
  │   └─ _layout.tsx
  ├─ chat/
  │   ├─ [id].tsx          ← 聊天詳情頁
  │   ├─ friends.tsx       ← 好友列表頁（已完善）
  │   ├─ contacts.tsx      ← 搜尋好友頁
  │   └─ _layout.tsx
  ├─ settings/
  │   ├─ index.tsx
  │   └─ _layout.tsx
  └─ _layout.tsx           ← 主 Tab 導航
```

---

## 下一步：第五階段

**進階功能與優化**
- [ ] 未讀訊息計數顯示
- [ ] 聊天室置頂/取消置頂
- [ ] 聊天室存檔/恢復
- [ ] 訊息搜尋
- [ ] 對話狀態指示（「正在輸入...」）
- [ ] 聊天室靜音設定

**測試與部署**
- [ ] 完整功能測試
- [ ] 性能優化（大量聊天/好友的情況）
- [ ] 安全審計
- [ ] 用戶反饋收集
- [ ] 生產環境部署

---

## 常見問題

### Q: 為什麼聊天列表中某些聊天沒有顯示？
A: 聊天需要至少有一條訊息才會在 `lastMessageTime` 中記錄。若要顯示未有訊息的聊天，需修改查詢邏輯。

### Q: 如何清空搜尋框？
A: 清空文本後列表會自動顯示全部項目。或點擊搜尋框右側的 X 按鈕（若有實現）。

### Q: 刪除好友後，之前的聊天紀錄會保留嗎？
A: 目前聊天紀錄會保留。若要刪除，需在 `removeFriend` 中添加刪除聊天的邏輯。

### Q: 如何實現聊天排序（最近到最舊）？
A: 聊天列表已按 `updatedAt` 降序排列。若需其他排序方式，修改 `getChatList` 查詢。

---

## 性能提示

1. **分頁加載**：若聊天/好友數量很大，考慮實現分頁
2. **圖片優化**：使用縮略圖而非完整頭像以減少加載時間
3. **緩存策略**：保留本地緩存避免重複加載
4. **虛擬列表**：考慮使用虛擬列表庫以處理大量項目

---

## 規格符合檢查

✅ **1. 好友列表頁顯示所有已加入的好友**
  - 頁面：`app/(tabs)/chats/index.tsx`（好友列表 Tab）
  - 數據來源：`getFriendsOfCurrentUser()`
  - 包含：頭像、名字、Email

✅ **2. 聊天室列表頁顯示所有有互動過的聊天室**
  - 頁面：`app/(tabs)/chats/index.tsx`（聊天室 Tab）
  - 數據來源：`getChatList()`、`subscribeToChatList()`
  - 包含：頭像、名字

✅ **3. 顯示最後一筆訊息的內容與發送時間**
  - 實現：`lastMessage` 字段和 `lastMessageTime` 時間戳
  - 時間格式：相對時間（今天/昨天/日期）

✅ **4. 點擊列表後能正確帶入對應資料並跳轉**
  - 跳轉邏輯：提取對方/好友 UID → 路由至 `/(tabs)/chat/{uid}`
  - 聊天頁會自動加載該好友的聊天紀錄

---

## 版本歷史

| 版本 | 日期 | 說明 |
|-----|------|------|
| 1.0 | 2026-06-16 | 完成第四階段整合 |

