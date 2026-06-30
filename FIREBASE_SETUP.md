# Firebase 帳號系統設定指南

## 第 1 步：建立 Firebase 專案
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「建立專案」
3. 輸入專案名稱，選擇設定
4. 建立完成後，點擊「建立應用」，選擇「Web」

## 第 2 步：複製 Firebase 配置
1. 在「應用設定」頁面複製以下資訊：
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID

2. 建立 `.env.local` 檔案（複製 `.env.example`）
3. 將上述資訊填入 `.env.local`

## 第 3 步：啟用 Firebase 服務

### Authentication（認證）
1. 在 Firebase Console 點擊「Authentication」
2. 點擊「開始使用」
3. 選擇「Email/Password」提供商
4. 啟用「Email/Password」和「Email link sign-in」

### Firestore Database
1. 在 Firebase Console 點擊「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇位置，點擊「下一步」
4. 選擇「以測試模式開始」（開發用），點擊「建立」
5. 進入「Rules」標籤，貼上以下安全規則（包含好友系統）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - 帳號系統 + 好友系統
    match /users/{userId} {
      // 所有已驗證使用者可讀取其他使用者資料
      allow read: if request.auth != null;
      
      // 使用者只能寫入自己的文件
      allow write: if request.auth != null && request.auth.uid == userId;
      
      // 允許好友新增/移除（互相更新 friendIds）
      allow update: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(userId)).data.friendIds.hasAny([request.auth.uid]));
    }
    
    // Chats collection - 聊天室
    match /chats/{chatId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    
    // Messages subcollection - 聊天訊息
    match /chats/{chatId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        resource.data.senderId == request.auth.uid;
    }
  }
}
```

### Storage
1. 在 Firebase Console 點擊「Storage」
2. 點擊「開始使用」
3. 在「Rules」標籤，貼上以下安全規則：

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 第 4 步：安裝依賴
```bash
npm install
# 或
yarn install
```

## 第 5 步：啟動應用
```bash
npm start
# 或
yarn start
```

## 帳號系統功能

### 註冊
- 使用 Email 和密碼註冊
- 可選上傳頭像
- 填入名字和 Email

### 登入
- 使用 Email 和密碼登入
- 登入成功後進入聊天室列表

### 帳號設定
進入 Settings Tab 可以：
- 修改名字
- 修改頭像
- 修改密碼（需要輸入舊密碼驗證）
- 登出

## 好友系統功能

### 搜尋好友
進入「搜尋好友」頁面可以：
- 輸入關鍵字搜尋其他使用者
- 支援按名字、Email 或 UID 搜尋
- 自動排除已加好友的使用者

### 加好友
- 點擊搜尋結果中的「加好友」按鈕
- 雙方互相成為好友（雙向關係）
- 立即出現在彼此的好友列表中

### 好友列表
進入「我的好友」頁面可以：
- 查看所有好友
- 點擊好友進入聊天室
- 移除好友

## 聊天系統功能

### 聊天訊息
- 點擊好友進入聊天室
- 實時發送和接收訊息
- 顯示發送者名字、頭像和時間戳
- 已讀狀態指示（✓ 未讀，✓✓ 已讀）

### 訊息特性
- 每條訊息包含：發送者信息、內容、時間戳、已讀狀態
- 不同好友的聊天有獨立的訊息紀錄
- 進入聊天室時自動標記訊息為已讀

### 實時同步
- 使用 Firestore 的 onSnapshot 實現實時訊息監聽
- 訊息立即出現在雙方螢幕上
- 網路連接恢復時自動同步離線訊息

## 注意事項
- 第一次使用需要在 `.env.local` 填入 Firebase 配置
- 不要將 `.env.local` 提交到 Git（已在 `.gitignore` 中）
- 在生產環境使用前，請更新 Firestore 和 Storage 的安全規則
