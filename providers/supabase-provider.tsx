import { ReactNode, useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { supabase } from "@/lib/supabase";

import { SupabaseContext } from "@/context/supabase-context";

interface SupabaseProviderProps {
  children: ReactNode;
}

export const SupabaseProvider = ({ children }: SupabaseProviderProps) => {
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const registerForPush = async (sessionId?: string) => {
      if (!sessionId) {
        return;
      }

      try {
        const projectId =
          Constants.easConfig?.projectId ||
          Constants.expoConfig?.extra?.eas?.projectId ||
          Constants.expoConfig?.extra?.projectId;

        if (!projectId) {
          console.warn("Missing Expo projectId for push tokens.");
          return;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.warn("Push notification permission not granted.");
          return;
        }

        const token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        await supabase
          .from("profiles")
          .update({ expo_push_token: token.data })
          .eq("id", sessionId);
      } catch (error) {
        console.error("Failed to register push token", error);
      }
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      await registerForPush(data.session?.user.id);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        registerForPush(session?.user.id).catch((error) => {
          console.error("Failed to refresh push token", error);
        });
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};
