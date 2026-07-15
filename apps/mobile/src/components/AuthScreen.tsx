import { useEffect, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import { mobileSupabase } from "../lib/supabase";
import { colors, radius, type } from "../theme";
import waribaIcon from "../../assets/icon.png";

WebBrowser.maybeCompleteAuthSession();

type Mode = "login" | "signup" | "verify";

function humanError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (normalized.includes("already registered")) return "Un compte existe déjà avec cet e-mail.";
  if (normalized.includes("password")) return "Utilisez au moins 8 caractères, avec lettres et chiffres.";
  if (normalized.includes("expired") || normalized.includes("invalid token")) return "Ce code a expiré ou n'est pas valide.";
  if (normalized.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "L'opération n'a pas abouti. Réessayez.";
}

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const complete = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/account");
  };

  const submit = async () => {
    if (!mobileSupabase) return;
    setPending(true);
    setError(null);
    try {
      if (mode === "verify") {
        const { error: verifyError } = await mobileSupabase.auth.verifyOtp({
          email: email.trim().toLowerCase(), token: code, type: "signup",
        });
        if (verifyError) throw verifyError;
        await complete();
      } else if (mode === "signup") {
        const { data, error: signUpError } = await mobileSupabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: displayName.trim() }, emailRedirectTo: Linking.createURL("auth/callback") },
        });
        if (signUpError) throw signUpError;
        if (data.session) await complete();
        else router.push({ pathname: "/(auth)/verify", params: { email: email.trim().toLowerCase() } });
      } else {
        const { error: signInError } = await mobileSupabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (signInError) throw signInError;
        await complete();
      }
    } catch (caught) {
      setError(humanError(caught instanceof Error ? caught.message : "unknown"));
    } finally {
      setPending(false);
    }
  };

  const googleLogin = async () => {
    if (!mobileSupabase) return;
    setPending(true);
    setError(null);
    try {
      const redirectTo = Linking.createURL("auth/callback");
      const { data, error: oauthError } = await mobileSupabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "consent" } },
      });
      if (oauthError || !data.url) throw oauthError ?? new Error("OAuth URL missing");
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") return;
      const resultUrl = new URL(result.url);
      const authorizationCode = resultUrl.searchParams.get("code");
      if (authorizationCode) {
        const { error: exchangeError } = await mobileSupabase.auth.exchangeCodeForSession(authorizationCode);
        if (exchangeError) throw exchangeError;
      } else {
        const hash = new URLSearchParams(resultUrl.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (!accessToken || !refreshToken) throw new Error("OAuth callback incomplete");
        const { error: sessionError } = await mobileSupabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (sessionError) throw sessionError;
      }
      await complete();
    } catch (caught) {
      setError(humanError(caught instanceof Error ? caught.message : "unknown"));
    } finally {
      setPending(false);
    }
  };

  const appleLogin = async () => {
    if (!mobileSupabase) return;
    setPending(true);
    setError(null);
    try {
      const bytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) throw new Error("Apple identity token missing");
      const { error: appleError } = await mobileSupabase.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken, nonce: rawNonce });
      if (appleError) throw appleError;
      await complete();
    } catch (caught) {
      const codeValue = typeof caught === "object" && caught && "code" in caught ? String(caught.code) : "";
      if (codeValue !== "ERR_REQUEST_CANCELED") setError(humanError(caught instanceof Error ? caught.message : "unknown"));
    } finally {
      setPending(false);
    }
  };

  const configured = Boolean(mobileSupabase);
  const title = mode === "verify" ? "Confirmez votre e-mail" : mode === "signup" ? "Créer votre espace" : "Content de vous revoir";
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.glow} />
        <View style={styles.brandRow}>
          <Image source={waribaIcon} alt="" style={styles.mark} />
          <Text style={styles.wordmark}>WARIBA</Text>
        </View>
        <Text style={styles.eyebrow}>ESPACE PRIVÉ · SYNCHRONISÉ</Text>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{mode === "verify" ? `Code envoyé à ${email}` : "Synchronisez vos données privées. Le marché reste accessible sans compte."}</Text>

        {!configured ? <Text style={styles.warning}>Le service de compte attend les variables Supabase du build.</Text> : null}
        {mode !== "verify" ? (
          <View style={styles.socials}>
            {appleAvailable ? <AppleAuthentication.AppleAuthenticationButton buttonType={mode === "signup" ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE} cornerRadius={10} style={styles.appleButton} onPress={() => void appleLogin()} /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Continuer avec Google" disabled={pending || !configured} onPress={() => void googleLogin()} style={({ pressed }) => [styles.socialButton, pressed && styles.pressed]}><Text style={styles.socialText}>Continuer avec Google</Text></Pressable>
            <Text style={styles.separator}>ou par e-mail</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.form}>
          {mode === "signup" ? <Field label="Nom affiché" value={displayName} onChangeText={setDisplayName} autoComplete="name" /> : null}
          <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={mode !== "verify"} />
          {mode === "verify" ? <Field label="Code à 6 chiffres" value={code} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" maxLength={6} /> : <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={pending || !configured} onPress={() => void submit()} style={({ pressed }) => [styles.primary, (pending || !configured) && styles.disabled, pressed && styles.pressed]}>{pending ? <ActivityIndicator color={colors.background} /> : <Text style={styles.primaryText}>{mode === "verify" ? "Vérifier le code" : mode === "signup" ? "Créer mon espace" : "Se connecter"}</Text>}</Pressable>
          </View>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.replace(mode === "signup" ? "/(auth)/sign-in" : "/(auth)/sign-up")}><Text style={styles.link}>{mode === "signup" ? "Déjà un compte ? Se connecter" : "Nouveau ? Créer un espace"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)")}><Text style={styles.guest}>Continuer sans compte</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, ...inputProps } = props;
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.ink3} style={styles.input} {...inputProps} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: "center", overflow: "hidden", paddingHorizontal: 22, paddingVertical: 40 },
  glow: { position: "absolute", top: -120, right: -150, width: 360, height: 360, borderRadius: 180, backgroundColor: "rgba(52,217,143,0.055)" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  mark: { width: 52, height: 52, borderRadius: 16 },
  wordmark: { color: colors.ink, fontSize: 17, fontWeight: "900", letterSpacing: 3 },
  eyebrow: { ...type.label, color: colors.accent, marginTop: 18, letterSpacing: 1.8 },
  title: { ...type.display, marginTop: 8, fontSize: 31, lineHeight: 36 },
  subtitle: { ...type.sub, marginTop: 8, maxWidth: 360 },
  warning: { ...type.caption, color: colors.warn, marginTop: 14, padding: 12, borderRadius: radius.md, backgroundColor: "rgba(251,146,60,0.1)" },
  socials: { gap: 10, marginTop: 24 },
  appleButton: { width: "100%", height: 46 },
  socialButton: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.lineStrong },
  socialText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  separator: { ...type.caption, textAlign: "center", marginVertical: 4 },
  formCard: { marginTop: 18, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: "rgba(10,24,18,0.94)" },
  form: { gap: 14 },
  field: { gap: 6 },
  label: { color: colors.ink2, fontSize: 12, fontWeight: "700" },
  input: { minHeight: 50, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface2, color: colors.ink, paddingHorizontal: 14, fontSize: 15 },
  error: { ...type.caption, color: colors.down },
  primary: { minHeight: 50, alignItems: "center", justifyContent: "center", borderRadius: radius.lg, backgroundColor: colors.accent },
  primaryText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.7 },
  link: { color: colors.accent, textAlign: "center", fontSize: 13, fontWeight: "700", marginTop: 20, minHeight: 44, textAlignVertical: "center" },
  guest: { color: colors.ink2, textAlign: "center", fontSize: 13, fontWeight: "700", minHeight: 44, textAlignVertical: "center" },
});
