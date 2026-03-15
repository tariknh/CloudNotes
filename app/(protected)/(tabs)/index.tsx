import {
  Button,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  Text,
  Alert,
  Image,
} from "react-native";
import { useCallback, useState } from "react";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { router, useFocusEffect } from "expo-router";

import "react-native-get-random-values";
import { useSupabase } from "@/hooks/useSupabase";
import { useNotesStore } from "@/context/notes-store";

export function NotePreview() {
  const notes = useNotesStore((state) => state.notes);
  const deleteNote = useNotesStore((state) => state.deleteNote);

  return (
    <View
      style={{
        paddingTop: 12,
        display: "flex",
        gap: 12,
        width: "100%",
      }}
    >
      {notes.map((note) => {
        return (
          <Pressable
            key={note.id}
            style={({ pressed }) => ({
              backgroundColor: "#FFFFFF",
              padding: 18,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E5EA",
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
            onPress={() =>
              router.push({
                pathname: "/note/[id]" as const,
                params: { id: String(note.id) },
              })
            }
          >
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                width: "100%",
                alignItems: "flex-start",
              }}
            >
              {note.imageUri ? (
                <Image
                  source={{ uri: note.imageUri }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    backgroundColor: "#E5E7EB",
                  }}
                  resizeMode="cover"
                />
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      fontWeight: "600",
                      fontSize: 18,
                      color: "#1C1C1E",
                      flex: 1,
                      marginRight: 8,
                    }}
                  >
                    {note.title}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() =>
                      Alert.alert(
                        "Delete note",
                        "Are you sure you want to delete this note?",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              await deleteNote(note.id);
                              Alert.alert(
                                "Deleted",
                                "Note deleted successfully.",
                              );
                            },
                          },
                        ],
                      )
                    }
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Text
                      style={{ fontSize: 18, color: "#8E8E93", lineHeight: 22 }}
                    >
                      ✕
                    </Text>
                  </Pressable>
                </View>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, color: "#8E8E93" }}
                >
                  {note.description}
                </Text>
                <Text style={{ fontSize: 11, color: "#C7C7CC", marginTop: 6 }}>
                  {note.last_changed
                    ? new Date(note.last_changed).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function Page() {
  const { signOut } = useSupabase();
  const fetchNotes = useNotesStore((state) => state.fetchNotes);
  const loadMoreNotes = useNotesStore((state) => state.loadMoreNotes);
  const hasMoreNotes = useNotesStore((state) => state.hasMoreNotes);
  const isLoadingMoreNotes = useNotesStore((state) => state.isLoadingMoreNotes);
  const [isRefreshing, setIsRefreshing] = useState(false);
  useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      void fetchNotes();
    }, [fetchNotes]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchNotes();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchNotes]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "flex-start",
        padding: 16,
        backgroundColor: "#F2F2F7",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#1C1C1E" }}>
        Jobb Notater
      </Text>

      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{ paddingBottom: 12 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        <NotePreview />
        {hasMoreNotes ? (
          <Pressable
            onPress={() => {
              void loadMoreNotes();
            }}
            disabled={isLoadingMoreNotes}
            style={({ pressed }) => ({
              marginTop: 12,
              width: "100%",
              backgroundColor: "#ffffff",
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              borderColor: "#d0d7de",
              borderWidth: 1,
              opacity: isLoadingMoreNotes ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "600" }}>
              {isLoadingMoreNotes ? "Laster..." : "Last mer"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={{ width: "100%", marginTop: 8 }}>
        <Pressable
          onPress={() => {
            router.push({
              pathname: "/note/[id]",
              params: { id: "new" },
            });
          }}
          style={({ pressed }) => ({
            width: "100%",
            backgroundColor: "#007AFF",
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 6 },
            elevation: 3,
          })}
        >
          <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
            Add Note
          </Text>
        </Pressable>
      </View>
      <Button title="Sign Out" onPress={handleSignOut} />
    </SafeAreaView>
  );
}
