import React from "react";
import { Redirect, Slot } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { AppShell } from "../../src/ui/AppShell";

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAppUser();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
