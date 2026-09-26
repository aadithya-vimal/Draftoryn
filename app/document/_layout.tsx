import { Stack } from "expo-router";
import Head from "expo-router/head";

export default function DocumentLayout() {
  return (
    <>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="new" />
        <Stack.Screen name="[id]" />
      </Stack>
    </>
  );
}
