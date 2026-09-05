import { Image, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SignUp } from "@clerk/expo/web";
import { theme } from "../../src/ui/primitives";
import { PageIllustration } from "../../src/ui/components";

function AuthBrandPanel() {
  return (
    <View style={styles.brandPanel}>
      <View style={styles.brand}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.authLogoBanner}
          resizeMode="contain"
        />
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
            <Image
              source={require("../../assets/logo.png")}
              style={styles.authLogoBanner}
              resizeMode="contain"
            />
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
  brand: { flexDirection: "row", alignItems: "center" },
  authLogoBanner: { width: 170, height: 48 },
  brandBody: { flex: 1, justifyContent: "center", gap: 16, maxWidth: 360 },
  brandHead: { fontFamily: theme.font.sansSemi, fontSize: 26, color: theme.text, lineHeight: 32 },
  brandSub: { fontFamily: theme.font.sans, fontSize: 15, color: theme.muted, lineHeight: 22 },
  brandArt: { marginTop: 18, alignItems: "flex-start" },
  formPanel: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  formInner: { width: "100%", maxWidth: 380 },
});
