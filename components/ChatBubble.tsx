import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../utils/styles';

interface ChatBubbleProps {
  text: string;
  isSender: boolean;
  timestamp: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  text,
  isSender,
  timestamp,
}) => {
  const containerStyle: ViewStyle = {
    alignSelf: isSender ? 'flex-end' : 'flex-start',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isSender
              ? COLORS.messageUser
              : COLORS.messageOther,
            borderBottomLeftRadius: isSender ? BORDER_RADIUS.lg : BORDER_RADIUS.xs,
            borderBottomRightRadius: isSender ? BORDER_RADIUS.xs : BORDER_RADIUS.lg,
          },
        ]}
      >
        <Text
          style={[
            styles.text,
            {
              color: isSender ? COLORS.background : COLORS.text,
            },
          ]}
        >
          {text}
        </Text>
      </View>
      <Text style={[styles.timestamp]}>
        {timestamp}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.xs,
    maxWidth: '85%',
  },
  bubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
  },
  text: {
    ...TYPOGRAPHY.body,
  },
  timestamp: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.sm,
  },
});
