import { render, waitFor } from "@testing-library/react-native";

import NoteDetailed from "@/app/(protected)/note/[id]";

const mockFetchNotes = jest.fn();
let mockStoreState: any;

jest.mock("uuid", () => ({
  v4: () => "test-note-id",
}));

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({ id: "note-1" }),
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: () => true,
}));

jest.mock("expo-camera", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CameraView: ({ children }: any) =>
      React.createElement(View, null, children),
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock("@/lib/note-images", () => ({
  getNoteImagePublicUrl: () => undefined,
  removeNoteImage: jest.fn(),
  uploadNoteImage: jest.fn(),
  validateImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/context/notes-store", () => ({
  useNotesStore: (selector: any) => selector(mockStoreState),
}));

describe("Integrasjonstest for loader", () => {
  beforeEach(() => {
    mockStoreState = {
      notes: [],
      updateNote: jest.fn(),
      createNote: jest.fn(),
      saveNote: jest.fn(),
      deleteNote: jest.fn(),
      fetchNotes: mockFetchNotes,
      getNoteById: jest.fn(),
    };

    mockFetchNotes.mockReset();
    mockFetchNotes.mockImplementation(async () => {
      await Promise.resolve();
      mockStoreState.notes = [
        {
          id: "note-1",
          title: "Loaded title",
          description: "Loaded description",
        },
      ];
    });
  });

  test("viser loader mens note hentes, og skjuler loader når note vises", async () => {
    const { getByTestId, queryByTestId } = render(<NoteDetailed />);

    expect(getByTestId("note-loader")).toBeTruthy();

    await waitFor(() => {
      expect(queryByTestId("note-loader")).toBeNull();
    });
  });
});
