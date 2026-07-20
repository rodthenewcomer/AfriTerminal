import {
  COTE_DIVOIRE_SGIS,
  matchSgis,
  type InvestableAmount,
  type InvestorExperience,
  type SgiContactPreference,
  type SgiPriority,
  type SgiQuestionnaire,
} from "@wariba/core/sgi";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { ActionButton, Page, Section, SegmentedTabs } from "../src/components/ui";
import { useMobileAuth } from "../src/providers/AuthProvider";
import { colors, radius, type } from "../src/theme";

const DEFAULTS: SgiQuestionnaire = {
  contactPreference: "digital",
  experience: "beginner",
  priority: "support",
  amount: "under-500k",
};

type SavedSgiRequest = {
  id: string;
  sgi_id: string;
  status: string;
  created_at: string;
};

export default function SgiScreen() {
  const router = useRouter();
  const { session, user } = useMobileAuth();
  const [contactPreference, setContactPreference] = useState<SgiContactPreference>(DEFAULTS.contactPreference);
  const [experience, setExperience] = useState<InvestorExperience>(DEFAULTS.experience);
  const [priority, setPriority] = useState<SgiPriority>(DEFAULTS.priority);
  const [amount, setAmount] = useState<InvestableAmount>(DEFAULTS.amount);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedRequests, setSavedRequests] = useState<SavedSgiRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const questionnaire = { contactPreference, experience, priority, amount };
  const matches = matchSgis(questionnaire);

  useEffect(() => {
    const token = session?.access_token;
    const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!token || !base) {
      setSavedRequests([]);
      return;
    }
    const controller = new AbortController();
    setRequestsLoading(true);
    void fetch(`${base}/api/v1/sgi-requests`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("request_failed");
        const body = await response.json() as { requests?: SavedSgiRequest[] };
        setSavedRequests(body.requests ?? []);
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === "AbortError")) setSavedRequests([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRequestsLoading(false);
      });
    return () => controller.abort();
  }, [session?.access_token]);

  const saveRequest = async (sgiId: string) => {
    if (!session?.access_token) {
      router.push("/(auth)/sign-up");
      return;
    }
    const base = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!base) {
      Alert.alert("Service non configuré", "L’enregistrement des demandes SGI n’est pas disponible dans cette version.");
      return;
    }
    setSavingId(sgiId);
    try {
      const response = await fetch(`${base}/api/v1/sgi-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ sgiId, consent: true, questionnaire }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Enregistrement impossible");
      const saved = body as { request?: SavedSgiRequest };
      if (saved.request) {
        setSavedRequests((current) => [
          saved.request!,
          ...current.filter((request) => request.id !== saved.request!.id),
        ]);
      }
      Alert.alert(
        "Demande enregistrée",
        "WARIBA conserve ce choix dans votre compte. Elle n’est pas encore transmise à la SGI ; utilisez ses coordonnées vérifiées pour la contacter."
      );
    } catch (error) {
      Alert.alert("Demande non enregistrée", error instanceof Error ? error.message : "Réessayez plus tard.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Page title="Choisir une SGI" subtitle={`${COTE_DIVOIRE_SGIS.length} SGI de Côte d’Ivoire vérifiées dans l’annuaire officiel BRVM`}>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Ce comparateur ne fabrique pas de classement.</Text>
        <Text style={styles.noticeText}>
          Il rapproche votre préférence des coordonnées vérifiées. Frais, dépôt minimum, ouverture à distance et délais restent à confirmer directement auprès de chaque SGI.
        </Text>
      </View>

      <Section title="1. Comment préférez-vous échanger ?" detail="Choisissez votre canal principal">
        <SegmentedTabs
          tabs={[
            { id: "digital", label: "En ligne" },
            { id: "phone", label: "Téléphone" },
            { id: "office", label: "Agence" },
          ] as const}
          active={contactPreference}
          onChange={setContactPreference}
        />
      </Section>
      <Section title="2. Votre expérience">
        <SegmentedTabs
          tabs={[{ id: "beginner", label: "Je débute" }, { id: "experienced", label: "Expérimenté" }] as const}
          active={experience}
          onChange={setExperience}
        />
      </Section>
      <Section title="3. Votre priorité">
        <SegmentedTabs
          tabs={[
            { id: "support", label: "Accompagnement" },
            { id: "fees", label: "Frais" },
            { id: "digital", label: "Outils digitaux" },
          ] as const}
          active={priority}
          onChange={setPriority}
        />
      </Section>
      <Section title="4. Premier montant envisagé">
        <SegmentedTabs
          tabs={[
            { id: "under-500k", label: "< 500 k" },
            { id: "500k-5m", label: "500 k–5 M" },
            { id: "over-5m", label: "> 5 M" },
          ] as const}
          active={amount}
          onChange={setAmount}
        />
      </Section>

      {user ? (
        <Section
          title="Mes demandes SGI"
          detail={requestsLoading ? "Chargement…" : `${savedRequests.length} choix enregistré${savedRequests.length === 1 ? "" : "s"}`}
        >
          {savedRequests.length ? savedRequests.map((request) => {
            const sgi = COTE_DIVOIRE_SGIS.find((item) => item.id === request.sgi_id);
            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <Text style={styles.requestName}>{sgi?.shortName ?? request.sgi_id}</Text>
                  <Text style={styles.requestStatus}>{request.status === "pending" ? "À contacter" : request.status}</Text>
                </View>
                <Text style={styles.requestMeta}>
                  Enregistrée le {new Intl.DateTimeFormat("fr-CI", { dateStyle: "medium" }).format(new Date(request.created_at))}
                </Text>
                <Text style={styles.requestMeta}>Suivi privé WARIBA · aucune transmission automatique.</Text>
              </View>
            );
          }) : (
            <Text style={styles.emptyRequests}>
              Enregistrez une SGI pour retrouver ici votre choix avant de la contacter avec ses coordonnées officielles.
            </Text>
          )}
        </Section>
      ) : null}

      <Section title="Résultats adaptés" detail="Ordre fondé uniquement sur les canaux de contact vérifiés">
        {matches.map((match, index) => (
          <View key={match.sgi.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.rank}><Text style={styles.rankText}>{index + 1}</Text></View>
              <View style={styles.cardCopy}>
                <Text style={styles.name}>{match.sgi.shortName}</Text>
                <Text style={styles.verified}>SGI agréée · vérifiée le {match.sgi.verifiedOn}</Text>
              </View>
            </View>
            {match.reasons.map((reason) => <Text key={reason} style={styles.reason}>✓ {reason}</Text>)}
            <Text style={styles.askTitle}>Questions à poser avant d’ouvrir :</Text>
            {match.questionsToAsk.map((question) => <Text key={question} style={styles.question}>• {question}</Text>)}
            <View style={styles.actions}>
              <ActionButton label="Voir la fiche" icon="open-outline" onPress={() => router.push(`/sgi/${match.sgi.id}`)} />
              <Pressable
                accessibilityRole="button"
                disabled={savingId === match.sgi.id || savedRequests.some((request) => request.sgi_id === match.sgi.id)}
                onPress={() => void saveRequest(match.sgi.id)}
                style={({ pressed }) => [styles.save, pressed && styles.pressed]}
              >
                <Text style={styles.saveText}>
                  {savingId === match.sgi.id
                    ? "Enregistrement…"
                    : savedRequests.some((request) => request.sgi_id === match.sgi.id)
                      ? "Choix enregistré"
                      : user
                        ? "Enregistrer mon choix"
                        : "Compte pour enregistrer"}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  notice: { padding: 16, gap: 5, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(251,146,60,0.35)", backgroundColor: "rgba(251,146,60,0.08)" },
  noticeTitle: { color: colors.ink, fontSize: 13.5, fontWeight: "800" },
  noticeText: { ...type.caption, lineHeight: 17 },
  requestCard: { padding: 13, gap: 5, marginBottom: 8, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  requestHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  requestName: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  requestStatus: { color: colors.accent, fontSize: 10, fontWeight: "800" },
  requestMeta: { ...type.caption, lineHeight: 15 },
  emptyRequests: { ...type.caption, lineHeight: 17 },
  card: { padding: 16, gap: 8, marginBottom: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  rank: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: radius.md, backgroundColor: colors.accentSoft },
  rankText: { color: colors.accent, fontSize: 13, fontWeight: "900" },
  cardCopy: { flex: 1 },
  name: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  verified: { ...type.caption, color: colors.up, marginTop: 2 },
  reason: { color: colors.ink2, fontSize: 11.5, lineHeight: 16 },
  askTitle: { ...type.label, color: colors.ink2, marginTop: 4 },
  question: { ...type.caption, lineHeight: 16 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
  save: { minHeight: 38, justifyContent: "center", paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.accent },
  saveText: { color: colors.onAccent, fontSize: 11.5, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
