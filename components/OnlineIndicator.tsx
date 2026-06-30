import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS } from '../utils/styles';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: number;
}

export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  size = 12,
}) => {
  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isOnline ? COLORS.online : '#CED0D4',
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});
