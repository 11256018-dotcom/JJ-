import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../utils/styles';

interface AvatarPickerProps {
  avatar: string;
  name: string;
  onPickImage: () => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  avatar,
  name,
  onPickImage,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: avatar }}
          style={styles.avatar}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.editButton}
          onPress={onPickImage}
          activeOpacity={0.7}
        >
          <Ionicons
            name="camera"
            size={18}
            color={COLORS.background}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.label}>點擊相機按鈕更換頭像</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={onPickImage}
        activeOpacity={0.7}
      >
        <Ionicons
          name="image"
          size={20}
          color={COLORS.background}
          style={{ marginRight: SPACING.md }}
        />
        <Text style={styles.buttonText}>選擇相片</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.backgroundLight,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  name: {
    ...TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  label: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.lg,
  },
  buttonText: {
    ...TYPOGRAPHY.subtitle,
    color: COLORS.background,
  },
});
