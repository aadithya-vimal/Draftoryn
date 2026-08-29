import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { ActivityIndicator, Text, View } from "react-native";
import { ClerkProvider } from "@clerk/expo";
import { CLERK_PUBLISHABLE_KEY, getTokenCache } from "../src/auth/clerk";
import { theme } from "../src/ui/primitives";
import { Redirect } from "expo-router";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from "@expo-google-fonts/playfair-display";
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
} from "@expo-google-fonts/source-sans-3";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";

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
      <Text style={{ fontFamily: theme.font.serifSemi, fontSize: 22, color: theme.text, marginBottom: 10 }}>Draftoryn</Text>
      <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.muted, textAlign: "center" }}>
        Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY (and CLERK_SECRET_KEY on the server) to enable authentication.
      </Text>
    </View>
  );
}

import Head from "expo-router/head";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) return <FontSplash />;
  if (!CLERK_PUBLISHABLE_KEY) return <MissingKey />;

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={getTokenCache()}>
      <Head>
        <title>Draftoryn — Professional Technical & Security Document Studio</title>
        <meta name="description" content="Professional document studio for software requirements, architecture specifications, and security assessment scopes." />
      </Head>
      <Stack screenOptions={{ headerShown: false, title: "Draftoryn" }}>
        <Stack.Screen name="(auth)" options={{ title: "Draftoryn" }} />
        <Stack.Screen name="(app)" options={{ title: "Draftoryn" }} />
        <Stack.Screen name="document" options={{ title: "Draftoryn" }} />
        <Stack.Screen name="index" options={{ title: "Draftoryn" }} />
      </Stack>
    </ClerkProvider>
  );
}
