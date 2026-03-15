import { create } from "zustand";

import { getNoteImagePublicUrl, removeNoteImage } from "@/lib/note-images";
import { supabase } from "@/lib/supabase";

type NoteUpdates = Partial<
  Pick<Note, "title" | "description" | "imageUri" | "image_path">
>;

export type Note = {
  uuid?: number;
  id: string;
  title: string;
  description: string;
  image_path?: string | null;
  imageUri?: string;
  created_at?: string;
  last_changed?: string;
  ownerId?: string;
};

type NotesState = {
  notes: Note[];
  hasMoreNotes: boolean;
  isLoadingMoreNotes: boolean;
  fetchNotes: () => Promise<void>;
  loadMoreNotes: () => Promise<void>;
  createNote: (note: Note) => Promise<Note>;
  getNoteById: (id: string) => Note | undefined;
  updateNote: (id: string, updates: NoteUpdates) => void;
  saveNote: (id: string, updates: NoteUpdates) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
};

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  hasMoreNotes: true,
  isLoadingMoreNotes: false,
  fetchNotes: async () => {
    const pageSize = 5;
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .range(0, pageSize - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch notes:", error.message);
      return;
    }

    set({
      notes: (data ?? []).map((note) => ({
        ...note,
        imageUri: getNoteImagePublicUrl(note.image_path, note.last_changed),
      })),
      hasMoreNotes: (data?.length ?? 0) === pageSize,
    });
  },

  loadMoreNotes: async () => {
    const { notes, isLoadingMoreNotes, hasMoreNotes } = get();
    if (isLoadingMoreNotes || !hasMoreNotes) {
      return;
    }

    set({ isLoadingMoreNotes: true });
    const pageSize = 5;
    const start = notes.length;
    const end = start + pageSize - 1;

    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .range(start, end)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load more notes:", error.message);
      set({ isLoadingMoreNotes: false });
      return;
    }

    const mappedNotes = (data ?? []).map((note) => ({
      ...note,
      imageUri: getNoteImagePublicUrl(note.image_path, note.last_changed),
    }));

    set((state) => ({
      notes: [...state.notes, ...mappedNotes],
      hasMoreNotes: mappedNotes.length === pageSize,
      isLoadingMoreNotes: false,
    }));
  },

  createNote: async (note: Note) => {
    const noteWithTimestamp = {
      ...note,
      last_changed: new Date().toISOString(),
    };

    set((state) => ({ notes: [noteWithTimestamp, ...state.notes] }));

    const { data, error } = await supabase
      .from("notes")
      .insert({
        id: noteWithTimestamp.id,
        title: noteWithTimestamp.title,
        description: noteWithTimestamp.description,
        image_path: noteWithTimestamp.image_path,
        last_changed: noteWithTimestamp.last_changed,
        ownerId: (await supabase.auth.getUser()).data.user?.id,
      })
      .select();
    if (error) {
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== note.id),
      }));
      console.error("Failed to insert note:", error.message);
      return null;
    }
    return data[0];
  },
  getNoteById: (id) => get().notes.find((note) => note.id === id),
  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note,
      ),
    }));
  },
  saveNote: async (id, updates) => {
    const updatesWithTimestamp = {
      ...updates,
      last_changed: new Date().toISOString(),
    };

    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updatesWithTimestamp } : note,
      ),
    }));

    const { imageUri: _imageUri, ...remoteUpdates } = updatesWithTimestamp;
    const { error } = await supabase
      .from("notes")
      .update(remoteUpdates)
      .eq("id", id);

    if (error) {
      console.error("Failed to update note:", error.message);
      throw error;
    }
  },
  deleteNote: async (id) => {
    const noteToDelete = get().notes.find((note) => note.id === id);

    set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }));

    if (noteToDelete?.image_path) {
      try {
        await removeNoteImage(noteToDelete.image_path);
      } catch (error) {
        console.error("Failed to delete note image:", error);
      }
    }

    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      console.error("Failed to delete note:", error.message);
    }
  },
}));
