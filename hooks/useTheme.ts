import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

const APP_BACKGROUND_COLOR_KEY = 'app_background_color';
const APP_BACKGROUND_IMAGE_KEY = 'app_background_image';
const CHAT_BACKGROUND_KEY = 'chat_background_';
const BACKGROUND_IMAGE_KEY = 'chat_background_image_';

export const THEME_COLORS = {
  light: '#FFFFFF',
  lightGray: '#F0F2F5',
  blue: '#E3F2FD',
  green: '#E8F5E9',
  pink: '#FCE4EC',
  purple: '#F3E5F5',
  yellow: '#FFFDE7',
};

export interface ChatBackground {
  color?: string;
  imageUri?: string;
}

export const useTheme = () => {
  const [appBackgroundColor, setAppBackgroundColorState] = useState<string>(THEME_COLORS.light);
  const [appBackgroundImage, setAppBackgroundImageState] = useState<string>('');
  const [chatBackgrounds, setChatBackgrounds] = useState<Record<string, ChatBackground>>({});
  const [isLoading, setIsLoading] = useState(true);

  // 加载应用背景设置
  useEffect(() => {
    loadAppBackground();
  }, []);

  const loadAppBackground = async () => {
    try {
      const [savedColor, savedImage] = await Promise.all([
        AsyncStorage.getItem(APP_BACKGROUND_COLOR_KEY),
        AsyncStorage.getItem(APP_BACKGROUND_IMAGE_KEY),
      ]);
      if (savedColor) {
        setAppBackgroundColorState(savedColor);
      }
      if (savedImage) {
        setAppBackgroundImageState(savedImage);
      }
    } catch (error) {
      console.error('Failed to load app background:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAppBackgroundColor = async (color: string) => {
    try {
      setAppBackgroundColorState(color);
      await AsyncStorage.setItem(APP_BACKGROUND_COLOR_KEY, color);
      // 清除背景图片
      setAppBackgroundImageState('');
      await AsyncStorage.removeItem(APP_BACKGROUND_IMAGE_KEY);
    } catch (error) {
      console.error('Failed to save app background color:', error);
    }
  };

  const setAppBackgroundImage = async (imageUri: string) => {
    try {
      if (imageUri) {
        setAppBackgroundImageState(imageUri);
        await AsyncStorage.setItem(APP_BACKGROUND_IMAGE_KEY, imageUri);
      } else {
        setAppBackgroundImageState('');
        await AsyncStorage.removeItem(APP_BACKGROUND_IMAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save app background image:', error);
    }
  };

  const loadChatBackground = async (chatId: string) => {
    try {
      const [color, imageUri] = await Promise.all([
        AsyncStorage.getItem(`${CHAT_BACKGROUND_KEY}${chatId}`),
        AsyncStorage.getItem(`${BACKGROUND_IMAGE_KEY}${chatId}`),
      ]);

      const background: ChatBackground = {};
      if (color) background.color = color;
      if (imageUri) background.imageUri = imageUri;

      setChatBackgrounds((prev) => ({
        ...prev,
        [chatId]: background,
      }));

      return background;
    } catch (error) {
      console.error('Failed to load chat background:', error);
      return {};
    }
  };

  const setChatBackgroundColor = async (chatId: string, color: string) => {
    try {
      setChatBackgrounds((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          color,
          imageUri: undefined,
        },
      }));
      await AsyncStorage.setItem(`${CHAT_BACKGROUND_KEY}${chatId}`, color);
      await AsyncStorage.removeItem(`${BACKGROUND_IMAGE_KEY}${chatId}`);
    } catch (error) {
      console.error('Failed to set chat background color:', error);
    }
  };

  const setChatBackgroundImage = async (chatId: string, imageUri: string) => {
    try {
      setChatBackgrounds((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          imageUri,
          color: undefined,
        },
      }));
      await AsyncStorage.setItem(`${BACKGROUND_IMAGE_KEY}${chatId}`, imageUri);
      await AsyncStorage.removeItem(`${CHAT_BACKGROUND_KEY}${chatId}`);
    } catch (error) {
      console.error('Failed to set chat background image:', error);
    }
  };

  const getChatBackground = (chatId: string): ChatBackground => {
    return chatBackgrounds[chatId] || {};
  };

  return {
    appBackgroundColor,
    setAppBackgroundColor,
    appBackgroundImage,
    setAppBackgroundImage,
    chatBackgrounds,
    loadChatBackground,
    setChatBackgroundColor,
    setChatBackgroundImage,
    getChatBackground,
    isLoading,
  };
};
