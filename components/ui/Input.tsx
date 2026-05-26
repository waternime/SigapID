import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "@/theme";
import { useAppTheme } from "@/hooks/useAppTheme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);
  const { palette } = useAppTheme();

  return (
    <View style={styles.wrap}>
      {label && (
        <Text style={[typography.caption, styles.label, { color: palette.muted }]}>
          {label}
        </Text>
      )}
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={palette.subtle}
        style={[
          styles.input,
          {
            backgroundColor: palette.input,
            borderColor: palette.border,
            color: palette.text,
          },
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: {
    marginBottom: spacing.xs,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
  },
  inputFocused: { borderColor: colors.secondary },
  inputError: { borderColor: colors.danger },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
