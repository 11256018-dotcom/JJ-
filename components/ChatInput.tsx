import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../utils/styles';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="傳送訊息..."
        placeholderTextColor={COLORS.textTertiary}
        multiline
        maxLength={500}
        value={message}
        onChangeText={setMessage}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={!message.trim()}
        style={[
          styles.sendButton,
          {
            opacity: message.trim() ? 1 : 0.5,
          },
        ]}
      >
        <Ionicons
          name="send"
          size={20}
          color={message.trim() ? COLORS.primary : COLORS.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
  },
  sendButton: {
    marginLeft: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
