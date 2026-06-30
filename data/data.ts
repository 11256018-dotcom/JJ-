import { ChatMessage, Contact } from '../utils/types';

export const CURRENT_USER_ID = 'user-001';

export const CONTACTS: Contact[] = [
  {
    id: 'ava',
    name: '林語安',
    avatar: 'https://i.pravatar.cc/150?img=1',
    isOnline: true,
    lastMessage: '好啊，待會見！',
    lastMessageTime: '09:30',
  },
  {
    id: 'emma',
    name: 'Emma Wilson',
    avatar: 'https://i.pravatar.cc/150?img=2',
    isOnline: true,
    lastMessage: '專案進展如何？',
    lastMessageTime: '09:15',
  },
  {
    id: 'sophia',
    name: 'Sophia Chen',
    avatar: 'https://i.pravatar.cc/150?img=3',
    isOnline: false,
    lastMessage: '謝謝你的幫助！',
    lastMessageTime: '昨天',
  },
  {
    id: 'oliver',
    name: 'Oliver Brown',
    avatar: 'https://i.pravatar.cc/150?img=4',
    isOnline: true,
    lastMessage: '看起來不錯 👍',
    lastMessageTime: '08:45',
  },
  {
    id: 'alice',
    name: 'Alice Johnson',
    avatar: 'https://i.pravatar.cc/150?img=5',
    isOnline: false,
    lastMessage: '明天見面可以嗎？',
    lastMessageTime: '3天前',
  },
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  ava: [
    {
      id: '1',
      senderId: CURRENT_USER_ID,
      text: '嘿！最近怎麼樣？',
      timestamp: '09:00',
      isSender: true,
    },
    {
      id: '2',
      senderId: 'ava',
      text: '不錯啊！最近在忙專案',
      timestamp: '09:05',
      isSender: false,
    },
    {
      id: '3',
      senderId: CURRENT_USER_ID,
      text: '是喔，什麼專案？',
      timestamp: '09:10',
      isSender: true,
    },
    {
      id: '4',
      senderId: 'ava',
      text: '一個新的社群軟體功能，頗複雜的',
      timestamp: '09:12',
      isSender: false,
    },
    {
      id: '5',
      senderId: CURRENT_USER_ID,
      text: '聽起來很有趣！',
      timestamp: '09:20',
      isSender: true,
    },
    {
      id: '6',
      senderId: 'ava',
      text: '好啊，待會見！',
      timestamp: '09:30',
      isSender: false,
    },
  ],
  emma: [
    {
      id: '1',
      senderId: CURRENT_USER_ID,
      text: '嗨 Emma！',
      timestamp: '08:00',
      isSender: true,
    },
    {
      id: '2',
      senderId: 'emma',
      text: '早上好！',
      timestamp: '08:05',
      isSender: false,
    },
    {
      id: '3',
      senderId: 'emma',
      text: '專案進展如何？',
      timestamp: '09:15',
      isSender: false,
    },
    {
      id: '4',
      senderId: CURRENT_USER_ID,
      text: '進行順利，今天應該能完成測試',
      timestamp: '09:20',
      isSender: true,
    },
  ],
  sophia: [
    {
      id: '1',
      senderId: CURRENT_USER_ID,
      text: '嗨 Sophia，上次的文件妳收到了嗎？',
      timestamp: '昨天 14:30',
      isSender: true,
    },
    {
      id: '2',
      senderId: 'sophia',
      text: '收到了，謝謝你的幫助！',
      timestamp: '昨天 15:00',
      isSender: false,
    },
    {
      id: '3',
      senderId: CURRENT_USER_ID,
      text: '不客氣，有問題隨時問',
      timestamp: '昨天 15:05',
      isSender: true,
    },
  ],
  oliver: [
    {
      id: '1',
      senderId: CURRENT_USER_ID,
      text: '你覺得新方案怎麼樣？',
      timestamp: '08:30',
      isSender: true,
    },
    {
      id: '2',
      senderId: 'oliver',
      text: '嗯...我看看',
      timestamp: '08:40',
      isSender: false,
    },
    {
      id: '3',
      senderId: 'oliver',
      text: '看起來不錯 👍',
      timestamp: '08:45',
      isSender: false,
    },
  ],
  alice: [
    {
      id: '1',
      senderId: CURRENT_USER_ID,
      text: '嗨 Alice！',
      timestamp: '3天前 10:00',
      isSender: true,
    },
    {
      id: '2',
      senderId: 'alice',
      text: '嗨！最近有點忙',
      timestamp: '3天前 10:30',
      isSender: false,
    },
    {
      id: '3',
      senderId: 'alice',
      text: '明天見面可以嗎？',
      timestamp: '3天前 11:00',
      isSender: false,
    },
  ],
};
