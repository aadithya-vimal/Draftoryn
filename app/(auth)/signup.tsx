import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SignUp } from "@clerk/expo/web";
import { theme } from "../../src/ui/primitives";
import { Icon, PageIllustration } from "../../src/ui/components";

function AuthBrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Icon name="Shield" size={18} color={theme.accentForeground} strokeWidth={2} />
        </View>
        <Text style={styles.brandText}>Draftoryn</Text>
      </View>
      <View style={styles.brandBody}>
        <Text style={styles.brandHead}>Create your Draftoryn workspace</Text>
        <Text style={styles.brandSub}>
          Your account is the identity behind every document you generate and own. Sign up to start producing
          professional technical, software, and compliance documents.
        </Text>
        <View style={styles.brandArt}>
          <PageIllustration width={200} height={252} />
        </View>
      </View>
    </View>
  );
}

export default function SignUpScreen() {
  const { width } = useWindowDimensions();
  const isMobile = width < 840;

  return (
    <View style={[styles.screen, isMobile && { flexDirection: "column" }]}>
      {!isMobile ? <AuthBrandPanel /> : null}
      <View style={[styles.formPanel, isMobile && { padding: 16 }]}>
        {isMobile ? (
          <View style={[styles.brand, { marginBottom: 24 }]}>
            <View style={styles.brandMark}>
              <Icon name="Shield" size={18} color={theme.accentForeground} strokeWidth={2} />
            </View>
            <Text style={styles.brandText}>Draftoryn</Text>
          </View>
        ) : null}
        <View style={styles.formInner}>
          <SignUp fallbackRedirectUrl="/(app)/home" signInUrl="/(auth)/login" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, flexDirection: "row", backgroundColor: theme.bg },
  brandPanel: {
    width: "42%",
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderColor: theme.border,
    padding: 40,
    paddingTop: 48,
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandMark: { width: 32, height: 32, borderRadius: 8, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" },
  brandText: { fontFamily: theme.font.serifSemi, fontSize: 22, color: theme.text },
  brandBody: { flex: 1, justifyContent: "center", gap: 16, maxWidth: 360 },
  brandHead: { fontFamily: theme.font.serifSemi, fontSize: 26, color: theme.text, lineHeight: 32 },
  brandSub: { fontFamily: theme.font.sans, fontSize: 15, color: theme.muted, lineHeight: 22 },
  brandArt: { marginTop: 18, alignItems: "flex-start" },
  formPanel: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  formInner: { width: "100%", maxWidth: 380 },
});
