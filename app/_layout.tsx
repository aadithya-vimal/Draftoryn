import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { ClerkProvider } from "@clerk/expo";
import { CLERK_PUBLISHABLE_KEY, getTokenCache } from "../src/auth/clerk";
import { theme, ThemeProvider } from "../src/ui/primitives";
import { SessionTimeoutProvider } from "../src/ui/SessionTimeoutProvider";
import { WorkspaceProvider } from "../src/context/WorkspaceContext";
import { Redirect } from "expo-router";
import { InterTight_400Regular } from "@expo-google-fonts/inter-tight/400Regular";
import { InterTight_500Medium } from "@expo-google-fonts/inter-tight/500Medium";
import { InterTight_600SemiBold } from "@expo-google-fonts/inter-tight/600SemiBold";
import { InterTight_700Bold } from "@expo-google-fonts/inter-tight/700Bold";
import { InterTight_800ExtraBold } from "@expo-google-fonts/inter-tight/800ExtraBold";
import { InterTight_900Black } from "@expo-google-fonts/inter-tight/900Black";
import { IBMPlexMono_400Regular } from "@expo-google-fonts/ibm-plex-mono/400Regular";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";

function FontSplash() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}

function MissingKey() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg, padding: 32 }}>
      <Text style={{ fontFamily: theme.font.sansSemi, fontSize: 22, color: theme.text, marginBottom: 10 }}>Draftoryn</Text>
      <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.muted, textAlign: "center" }}>
        Authentication credentials not configured. Set environment variables to enable authentication.
      </Text>
    </View>
  );
}

import Head from "expo-router/head";

export default function RootLayout() {
  const isWeb = Platform.OS === "web";
  const [fontsLoaded, fontError] = useFonts({
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    InterTight_800ExtraBold,
    InterTight_900Black,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded && !fontError && !isWeb) return <FontSplash />;
  if (!CLERK_PUBLISHABLE_KEY) return <MissingKey />;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={getTokenCache()}>
      <ThemeProvider>
        <WorkspaceProvider>
          <SessionTimeoutProvider>
            <Head>
              <title>Draftoryn</title>
              <meta name="description" content="Professional technical specification system for cybersecurity authorizations, assessment reports, threat models, and architecture documentation." />
              <link rel="icon" type="image/png" sizes="64x64" href="/favicon.png" />
              <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
              <link rel="apple-touch-icon" sizes="180x180" href="/icon.png" />
            </Head>
            <Stack screenOptions={{ headerShown: false, title: "Draftoryn" }}>
              <Stack.Screen name="(auth)" options={{ title: "Draftoryn" }} />
              <Stack.Screen name="(app)" options={{ title: "Draftoryn" }} />
              <Stack.Screen name="document" options={{ title: "Draftoryn" }} />
              <Stack.Screen name="index" options={{ title: "Draftoryn" }} />
            </Stack>
          </SessionTimeoutProvider>
        </WorkspaceProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
}
