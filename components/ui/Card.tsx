import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import { radius, shadow, spacing } from "@/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

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
  const { palette } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.card, borderColor: palette.border },
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
    borderRadius: radius.xl,
    borderWidth: 1,
  },
});
