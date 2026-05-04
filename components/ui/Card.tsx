import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { colors, radius, shadow, spacing } from "@/theme";

interface CardProps extends ViewProps {
  elevated?: boolean;
  padding?: keyof typeof spacing | 0;
}

export const Card: React.FC<CardProps> = ({
  elevated = true,
  padding = "lg",
  style,
  children,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.card,
        elevated && shadow.sm,
        padding !== 0 && { padding: spacing[padding] },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
