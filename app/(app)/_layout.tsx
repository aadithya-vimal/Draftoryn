import React from "react";
import { Redirect, Slot } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { AppShell } from "../../src/ui/AppShell";

import Head from "expo-router/head";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAppUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  return (
    <AppShell>
      <Head>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <Slot />
    </AppShell>
  );
}
