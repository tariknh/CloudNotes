import { router, useLocalSearchParams } from "expo-router";
import { useRef } from "react";
import { Alert, Button, Pressable, Text, TextInput, View } from "react-native";
import { useNotesStore } from "@/context/notes-store";

export default function NoteDetailed() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const noteId = Array.isArray(id) ? id[0] : id;
  const updateNote = useNotesStore((state) => state.updateNote);
  const saveNote = useNotesStore((state) => state.saveNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (
    id: string,
    updates: Partial<{ title: string; description: string }>,
  ) => {
    updateNote(id, updates); // instant local update
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNote(id, updates); // persist to Supabase after 600ms of no typing
    }, 600);
  };
  const note = useNotesStore((state) =>
    noteId ? state.notes.find((item) => item.id === noteId) : undefined,
  );

  if (!noteId) {
    if (__DEV__) {
      console.warn("[note] Missing note id", { id });
    }
    return (
      <View style={{ padding: 16 }}>
        <Text>Missing note id.</Text>
        <Button title="Tilbake" onPress={() => router.back()} />
      </View>
    );
  }

  if (!note) {
    if (__DEV__) {
      console.warn("[note] Note not found", { noteId });
    }
    return (
      <View style={{ padding: 16 }}>
        <Text>Fant ikke notat.</Text>
        <Button title="Tilbake" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>Rediger notat</Text>

      <TextInput
        placeholder="Tittel"
        autoFocus={true}
        value={note.title}
        onChangeText={(title) => handleChange(note.id, { title })}
        style={{ borderWidth: 1, borderColor: "#aaa", padding: 10 }}
      />

      <TextInput
        placeholder="Beskrivelse"
        value={note.description}
        onChangeText={(description) => handleChange(note.id, { description })}
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#aaa",
          padding: 10,
          minHeight: 120,
        }}
      />
      <Pressable
        onPress={() => {
          if (!note.title.trim() || !note.description.trim()) {
            Alert.alert("Validation", "Title and description cannot be empty.");
            return;
          }
          if (debounceRef.current) clearTimeout(debounceRef.current);
          saveNote(note.id, { title: note.title, description: note.description }).then(() => {
            Alert.alert("Saved", "Note updated successfully.");
            router.back();
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
          Save
        </Text>
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete note",
            "Are you sure you want to delete this note?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  useNotesStore.getState().deleteNote(note.id);
                  router.back();
                },
              },
            ],
          )
        }
        style={({ pressed }) => ({
          width: "100%",
          backgroundColor: "#ffffff",
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
          borderColor: "#ff3b30",
          borderWidth: 1,
        })}
      >
        <Text style={{ color: "#ff3b30", fontSize: 16, fontWeight: "600" }}>
          Delete
        </Text>
      </Pressable>
    </View>
  );
}
