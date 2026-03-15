import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Image,
  Pressable,
  ScrollView,
  Text,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import * as ImagePicker from "expo-image-picker";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType } from "expo-camera";
import { useIsFocused } from "@react-navigation/native";
import { useNotesStore } from "@/context/notes-store";
import {
  getNoteImagePublicUrl,
  removeNoteImage,
  uploadNoteImage,
  validateImage,
} from "@/lib/note-images";

function CameraSection({
  disabled,
  hasImage,
  isFocused,
  onCapture,
  onPickFromLibrary,
}: {
  disabled: boolean;
  hasImage: boolean;
  isFocused: boolean;
  onCapture: (uri: string) => Promise<void>;
  onPickFromLibrary: () => Promise<void>;
}) {
  const cameraRef = useRef<CameraView | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();

  const handleTakePicture = async () => {
    if (disabled) {
      return;
    }

    try {
      const result = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
      });

      if (!result?.uri) {
        Alert.alert("Camera", "Could not capture a photo.");
        return;
      }

      await onCapture(result.uri);
    } catch (error) {
      console.error("Failed to take picture:", error);
      Alert.alert("Camera", "Could not take a picture right now.");
    }
  };

  if (!permission) {
    return <View style={styles.cameraPlaceholder} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionCard}>
        <Text style={styles.sectionTitle}>Camera</Text>
        <Text style={styles.message}>
          We need your permission to show the camera.
        </Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  if (hasImage) {
    return (
      <View style={styles.mediaCard}>
        <Text style={styles.sectionTitle}>Replace photo</Text>
        <View style={styles.compactActionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() =>
              setFacing((current) => (current === "back" ? "front" : "back"))
            }
            disabled={disabled}
          >
            <Text style={styles.buttonText}>Flip Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => void handleTakePicture()}
            disabled={disabled}
          >
            <Text style={styles.buttonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.libraryButton,
            pressed && !disabled ? styles.buttonPressed : null,
            disabled ? styles.buttonDisabled : null,
          ]}
          onPress={() => void onPickFromLibrary()}
          disabled={disabled}
        >
          <Text style={styles.libraryButtonText}>Choose different image</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.mediaCard}>
      <Text style={styles.sectionTitle}>Add photo</Text>
      <View style={styles.cameraSection}>
        {isFocused ? (
          <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
        ) : (
          <View style={styles.cameraInactiveState}>
            <Text style={styles.message}>
              Camera paused while screen is not active.
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cameraActionsRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            setFacing((current) => (current === "back" ? "front" : "back"))
          }
          disabled={disabled}
        >
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => void handleTakePicture()}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.libraryButton,
          pressed && !disabled ? styles.buttonPressed : null,
          disabled ? styles.buttonDisabled : null,
        ]}
        onPress={() => void onPickFromLibrary()}
        disabled={disabled}
      >
        <Text style={styles.libraryButtonText}>Upload from library</Text>
      </Pressable>
    </View>
  );
}

export default function NoteDetailed() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const isFocused = useIsFocused();
  const noteId = Array.isArray(id) ? id[0] : id;
  const isNewNote = noteId === "new";
  const updateNote = useNotesStore((state) => state.updateNote);
  const createNote = useNotesStore((state) => state.createNote);
  const fetchNotes = useNotesStore((state) => state.fetchNotes);
  const saveNote = useNotesStore((state) => state.saveNote);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [stagedImageUri, setStagedImageUri] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const note = useNotesStore((state) =>
    noteId ? state.notes.find((item) => item.id === noteId) : undefined,
  );

  useEffect(() => {
    if (!noteId || isNewNote || note) {
      return;
    }

    let isMounted = true;
    setIsLoadingNote(true);

    fetchNotes()
      .catch((error) => {
        console.error("Failed to fetch note:", error);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingNote(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [noteId, isNewNote, note, fetchNotes]);

  const saveImageState = async (nextImagePath?: string) => {
    if (!note) {
      return;
    }

    const nextImageUri = getNoteImagePublicUrl(
      nextImagePath,
      new Date().toISOString(),
    );

    updateNote(note.id, {
      image_path: nextImagePath,
      imageUri: nextImageUri,
    });
    await saveNote(note.id, {
      image_path: nextImagePath,
      imageUri: nextImageUri,
    });
  };

  const handleStageImage = async (sourceUri: string) => {
    try {
      await validateImage(sourceUri);
      setStagedImageUri(sourceUri);
    } catch (error: any) {
      Alert.alert(
        "Invalid Image",
        error.message || "Could not validate the image.",
      );
    }
  };

  const handleConfirmUpload = async () => {
    if (isNewNote) {
      Alert.alert("Save first", "Image will be uploaded after you save.");
      return;
    }

    if (!note || !stagedImageUri) {
      return;
    }

    setIsSavingImage(true);

    try {
      const imagePath = await uploadNoteImage(note.id, stagedImageUri);
      await saveImageState(imagePath);
      setStagedImageUri(null);
      Alert.alert(
        "Photo added",
        "The image was uploaded and attached to this note.",
      );
    } catch (error: any) {
      console.error("Failed to upload note image:", error);
      Alert.alert(
        "Upload Failed",
        error.message || "Could not upload the image right now.",
      );
    } finally {
      setIsSavingImage(false);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Photos permission",
          "Allow photo library access to attach an image to the note.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        mediaTypes: ["images"],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      await handleStageImage(result.assets[0].uri);
    } catch (error) {
      console.error("Failed to open image library:", error);
      Alert.alert("Photos", "Could not open the photo library right now.");
    }
  };

  const handleRemoveImage = () => {
    if (!note?.imageUri) {
      return;
    }

    Alert.alert("Remove photo", "Remove the attached image from this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          setIsSavingImage(true);

          try {
            await removeNoteImage(note.image_path);
            await saveImageState(undefined);
          } catch (error) {
            console.error("Failed to remove note image:", error);
            Alert.alert("Photo", "Could not remove the image right now.");
          } finally {
            setIsSavingImage(false);
          }
        },
      },
    ]);
  };

  const handleChange = (
    id: string,
    updates: Partial<{ title: string; description: string }>,
  ) => {
    if (isNewNote) {
      if (updates.title !== undefined) {
        setDraftTitle(updates.title);
      }
      if (updates.description !== undefined) {
        setDraftDescription(updates.description);
      }
      return;
    }

    updateNote(id, updates);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveNote(id, updates).catch((error) => {
        console.error("Failed to auto-save note:", error);
      });
    }, 600);
  };

  const handleSavePress = async () => {
    if (isNewNote) {
      if (!draftTitle.trim() || !draftDescription.trim()) {
        Alert.alert("Validation", "Title and description cannot be empty.");
        return;
      }

      const newId = uuidv4();
      const created = await createNote({
        id: newId,
        title: draftTitle.trim(),
        description: draftDescription.trim(),
      });

      if (!created) {
        Alert.alert("Save failed", "Could not save the note right now.");
        return;
      }

      if (stagedImageUri) {
        try {
          const imagePath = await uploadNoteImage(newId, stagedImageUri);
          const imageUri = getNoteImagePublicUrl(
            imagePath,
            new Date().toISOString(),
          );
          await saveNote(newId, { image_path: imagePath, imageUri });
        } catch (error) {
          console.error("Failed to upload image for new note:", error);
          Alert.alert(
            "Image upload failed",
            "Note was saved, but the image could not be uploaded.",
          );
        }
      }

      Alert.alert("Saved", "Note created successfully.");
      router.back();
      return;
    }

    if (!note) {
      Alert.alert("Save failed", "Note not found.");
      return;
    }

    if (!note.title.trim() || !note.description.trim()) {
      Alert.alert("Validation", "Title and description cannot be empty.");
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    saveNote(note.id, {
      title: note.title,
      description: note.description,
      image_path: note.image_path,
      imageUri: note.imageUri,
    })
      .then(() => {
        Alert.alert("Saved", "Note updated successfully.");
        router.back();
      })
      .catch((error) => {
        console.error("Failed to save note:", error);
        Alert.alert("Save failed", "Could not save the note right now.");
      });
  };

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

  if (!note && !isNewNote) {
    if (isLoadingNote) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" testID="note-loader" />
          <Text>Loading note...</Text>
        </View>
      );
    }

    if (!__DEV__) {
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
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={{ fontSize: 18, fontWeight: "600" }}>
        {isNewNote ? "Nytt notat" : "Rediger notat"}
      </Text>

      <TextInput
        placeholder="Tittel"
        autoFocus={true}
        value={isNewNote ? draftTitle : (note?.title ?? "")}
        onChangeText={(title) => handleChange(note?.id ?? "", { title })}
        style={{ borderWidth: 1, borderColor: "#aaa", padding: 10 }}
      />

      <TextInput
        placeholder="Beskrivelse"
        value={isNewNote ? draftDescription : (note?.description ?? "")}
        onChangeText={(description) =>
          handleChange(note?.id ?? "", { description })
        }
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#aaa",
          padding: 10,
          minHeight: 120,
        }}
      />

      {stagedImageUri ? (
        <View style={styles.mediaCard}>
          <Text style={styles.sectionTitle}>Preview Selection</Text>
          <Image
            source={{ uri: stagedImageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.secondaryButton, { flex: 1 }]}
              onPress={() => setStagedImageUri(null)}
              disabled={isSavingImage}
            >
              <Text style={styles.buttonText}>Remove</Text>
            </TouchableOpacity>
            {!isNewNote ? (
              <TouchableOpacity
                style={[styles.primaryButton, { flex: 1 }]}
                onPress={handleConfirmUpload}
                disabled={isSavingImage}
              >
                {isSavingImage ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Confirm Upload</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={[styles.primaryButton, { flex: 1, opacity: 0.6 }]}>
                <Text style={styles.buttonText}>Uploads on Save</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <>
          {!isNewNote && note?.imageUri ? (
            <View style={styles.mediaCard}>
              <View style={styles.imageHeaderRow}>
                <Text style={styles.sectionTitle}>Attached photo</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.removeChip,
                    pressed ? styles.buttonPressed : null,
                  ]}
                  onPress={handleRemoveImage}
                  disabled={isSavingImage}
                >
                  <Text style={styles.removeChipText}>Remove</Text>
                </Pressable>
              </View>
              <Image
                source={{ uri: note.imageUri }}
                style={styles.previewImage}
              />
            </View>
          ) : null}

          <CameraSection
            disabled={isSavingImage}
            hasImage={!isNewNote && Boolean(note?.imageUri)}
            isFocused={isFocused}
            onCapture={handleStageImage}
            onPickFromLibrary={handlePickFromLibrary}
          />
        </>
      )}

      <Pressable
        onPress={() => void handleSavePress()}
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
      {!isNewNote ? (
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
                    if (!note) return;
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
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  screen: {
    padding: 16,
    gap: 12,
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  permissionCard: {
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#f6f8fa",
  },
  cameraPlaceholder: {
    height: 240,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  mediaCard: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#d0d7de",
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  cameraSection: {
    height: 240,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  cameraInactiveState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 16,
  },
  cameraActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  compactActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  libraryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d0d7de",
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
  },
  libraryButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  imageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
  },
  removeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fee2e2",
  },
  removeChipText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    color: "#475467",
    textAlign: "center",
  },
});
