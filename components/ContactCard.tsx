import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../utils/styles';
import { Contact } from '../utils/types';
import { OnlineIndicator } from './OnlineIndicator';

interface ContactCardProps {
  contact: Contact;
  onPress: (contact: Contact) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(contact)}
      style={styles.container}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: contact.avatar }}
          style={styles.avatar}
        />
        <View style={styles.onlineIndicatorContainer}>
          <OnlineIndicator isOnline={contact.isOnline} size={14} />
        </View>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {contact.lastMessage}
        </Text>
      </View>

      <Text style={styles.time}>{contact.lastMessageTime}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundLight,
  },
  onlineIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  contentContainer: {
    flex: 1,
  },
  name: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  lastMessage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  time: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
