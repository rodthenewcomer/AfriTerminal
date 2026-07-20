import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, type } from "../theme";

interface AccountGateProps {
  title: string;
  detail: string;
  benefits: string[];
}

export function AccountGate({ title, detail, benefits }: AccountGateProps) {
  const router = useRouter();
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="cloud-done-outline" size={23} color={colors.accent} />
      </View>
      <Text style={styles.eyebrow}>ESPACE PERSONNEL SÉCURISÉ</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      <View style={styles.benefits}>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefit}>
            <Ionicons name="checkmark-circle" size={17} color={colors.up} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(auth)/sign-up")}
        style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
      >
        <Text style={styles.primaryText}>Créer mon compte gratuit</Text>
        <Ionicons name="arrow-forward" size={17} color={colors.onAccent} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/(auth)/sign-in")}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>J’ai déjà un compte</Text>
      </Pressable>
      <Text style={styles.reassurance}>La cote, les graphiques, les actualités et le screener restent publics.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 22,
    gap: 10,
    backgroundColor: colors.surface,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  icon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
  },
  eyebrow: { ...type.label, color: colors.accent, marginTop: 4 },
  title: { ...type.title, fontSize: 22, lineHeight: 27 },
  detail: { ...type.caption, fontSize: 13, lineHeight: 19 },
  benefits: { gap: 9, marginVertical: 4 },
  benefit: { flexDirection: "row", alignItems: "center", gap: 9 },
  benefitText: { color: colors.ink, fontSize: 12.5, lineHeight: 17, flex: 1 },
  primary: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  primaryText: { color: colors.onAccent, fontSize: 13.5, fontWeight: "800" },
  secondary: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderColor: colors.line,
    borderWidth: 1,
  },
  secondaryText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  reassurance: { ...type.caption, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
  pressed: { opacity: 0.72 },
});
