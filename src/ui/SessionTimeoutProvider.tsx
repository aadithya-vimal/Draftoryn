import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppUser } from "../auth/clerk";
import { Button, theme } from "./primitives";
import { Dialog, Icon } from "./components";
import { getUserSettings } from "../lib/userSettings";

interface SessionTimeoutContextType {
  extendSession: () => void;
  triggerTestWarning: () => void;
  timeoutMinutes: number;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType>({
  extendSession: () => {},
  triggerTestWarning: () => {},
  timeoutMinutes: 15,
});

export function useSessionTimeout() {
  return useContext(SessionTimeoutContext);
}

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAppUser();
  const { isSignedIn, signOut } = user;

  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(15);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(120);

  const lastActivityRef = useRef<number>(Date.now());
  const lastThrottleRef = useRef<number>(0);
  const isWarningRef = useRef<boolean>(false);
  const isTestingRef = useRef<boolean>(false);

  // Sync ref with state
  isWarningRef.current = showWarning;

  // Load configured timeout from user settings
  useEffect(() => {
    if (!isSignedIn) return;
    getUserSettings(user).then((s) => {
      if (s.sessionTimeoutMinutes && s.sessionTimeoutMinutes > 0) {
        setTimeoutMinutes(s.sessionTimeoutMinutes);
      }
    });
  }, [isSignedIn, user.userId]);

  // Activity handler: throttled to at most once every 5 seconds
  const registerActivity = () => {
    const now = Date.now();
    // Do not reset activity automatically if warning modal is active unless user explicitly clicks "Extend Session"
    if (isWarningRef.current && !isTestingRef.current) {
      return;
    }
    if (now - lastThrottleRef.current > 5000) {
      lastThrottleRef.current = now;
      lastActivityRef.current = now;
    }
  };

  // Attach DOM listeners on web
  useEffect(() => {
    if (!isSignedIn || Platform.OS !== "web" || typeof window === "undefined") return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    const handleEvent = () => registerActivity();

    events.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
    };
  }, [isSignedIn]);

  // Timer countdown loop
  useEffect(() => {
    if (!isSignedIn) {
      setShowWarning(false);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const totalSeconds = timeoutMinutes * 60;
      const warningWindowSeconds = 120; // 2 minutes warning
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = totalSeconds - elapsedSeconds;

      if (isTestingRef.current) {
        // In test mode: decrement manually
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            isTestingRef.current = false;
            setShowWarning(false);
            return 0;
          }
          return prev - 1;
        });
        return;
      }

      if (remaining <= 0) {
        // Timeout expired: perform automatic sign out
        setShowWarning(false);
        signOut().catch(() => {});
        router.replace("/(auth)/login");
      } else if (remaining <= warningWindowSeconds) {
        setShowWarning(true);
        setSecondsRemaining(remaining);
      } else {
        if (showWarning) setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSignedIn, timeoutMinutes]);

  const extendSession = () => {
    lastActivityRef.current = Date.now();
    lastThrottleRef.current = Date.now();
    isTestingRef.current = false;
    setShowWarning(false);
  };

  const handleSignOutNow = async () => {
    setShowWarning(false);
    await signOut();
    router.replace("/(auth)/login");
  };

  const triggerTestWarning = () => {
    isTestingRef.current = true;
    setSecondsRemaining(120);
    setShowWarning(true);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(Math.max(0, secs) / 60);
    const s = Math.max(0, secs) % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <SessionTimeoutContext.Provider value={{ extendSession, triggerTestWarning, timeoutMinutes }}>
      {children}

      <Dialog
        open={showWarning}
        onClose={extendSession}
        title="Session Timeout Warning"
      >
        <View style={styles.modalContent}>
          {/* Eyebrow badge */}
          <View style={styles.eyebrowRow}>
            <Icon name="ShieldAlert" size={14} color={theme.warn} />
            <Text style={styles.eyebrowText}>SECURITY ACCESS CONTROL // IDLE TERMINATION</Text>
          </View>

          {/* Countdown Clock Panel */}
          <View style={styles.countdownBox}>
            <Text style={styles.countdownLabel}>SESSION TERMINATION IN</Text>
            <Text style={styles.countdownDigits}>{formatCountdown(secondsRemaining)}</Text>
            <Text style={styles.countdownHint}>Minutes : Seconds remaining</Text>
          </View>

          {/* Policy explanation */}
          <Text style={styles.warningDescription}>
            Your Draftoryn session has been idle. In accordance with technical security standards
            for confidential deliverables and penetration testing authorizations, idle sessions
            are automatically terminated to protect client records.
          </Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Button
              label="Extend Session"
              variant="primary"
              onPress={extendSession}
              style={{ flex: 1.3 }}
            />
            <Button
              label="Sign Out Now"
              variant="danger"
              onPress={handleSignOutNow}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Dialog>
    </SessionTimeoutContext.Provider>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    paddingTop: 6,
    gap: 16,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.warnBg,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "rgba(217, 154, 36, 0.25)",
    alignSelf: "flex-start",
  },
  eyebrowText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: theme.warn,
    letterSpacing: 0.8,
  },
  countdownBox: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  countdownDigits: {
    fontFamily: theme.font.monoMedium,
    fontSize: 42,
    letterSpacing: 3,
    color: theme.warn,
  },
  countdownHint: {
    fontFamily: theme.font.sans,
    fontSize: 11,
    color: theme.muted,
    marginTop: 4,
  },
  warningDescription: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
});