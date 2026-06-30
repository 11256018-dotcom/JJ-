import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import React from 'react';
import { COLORS, TYPOGRAPHY } from '../../utils/styles';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          ...TYPOGRAPHY.title,
          color: COLORS.text,
        },
        headerStyle: {
          backgroundColor: COLORS.background,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      } as any}
    >
      <Tabs.Screen
        name="chats"
        options={{
          title: '聊天',
          tabBarLabel: '聊天',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: '聊天',
        } as BottomTabNavigationOptions}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarLabel: '設定',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings' : 'settings-outline'}
              size={24}
              color={color}
            />
          ),
          headerTitle: '個人設定',
        } as BottomTabNavigationOptions}
      />
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // 隱藏 Tab 按鈕，作為動態路由頁面
        } as any}
      />
    </Tabs>
  );
}
