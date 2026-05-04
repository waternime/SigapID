import { TextStyle } from "react-native";

export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
  },
  h3: {
    fontSize: 17,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: "600",
  },
  caption: {
    fontSize: 13,
    fontWeight: "400",
  },
  micro: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.4,
  },
  button: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
};
