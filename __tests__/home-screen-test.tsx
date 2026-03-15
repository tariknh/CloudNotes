import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockBack = jest.fn();
const mockCreateNote = jest.fn();

jest.mock("uuid", () => ({
  v4: () => "test-note-id",
}));

jest.mock("expo-router", () => ({
  router: {
    back: mockBack,
  },
  useLocalSearchParams: () => ({ id: "new" }),
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
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({
    granted: true,
  }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

jest.mock("@/lib/note-images", () => ({
  getNoteImagePublicUrl: () => undefined,
  removeNoteImage: jest.fn(),
  uploadNoteImage: jest.fn(),
  validateImage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/context/notes-store", () => {
  const state = {
    notes: [],
    updateNote: jest.fn(),
    createNote: mockCreateNote,
    saveNote: jest.fn(),
    deleteNote: jest.fn(),
    fetchNotes: jest.fn(),
    getNoteById: jest.fn(),
  };
  return { useNotesStore: (selector: any) => selector(state) };
});

describe("Note creation flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateNote.mockResolvedValue({ id: "created-id" });
  });

  test("lager en notat og går tilbake når riktig input blir lagret", async () => {
    const NoteDetailed = require("@/app/(protected)/note/[id]").default;
    const { getByPlaceholderText, getByText } = render(<NoteDetailed />);

    fireEvent.changeText(getByPlaceholderText("Tittel"), "Gyldig tittel");
    fireEvent.changeText(
      getByPlaceholderText("Beskrivelse"),
      "Dette er en gyldig beskrivelse.",
    );

    fireEvent.press(getByText("Save"));

    await waitFor(() => {
      expect(mockCreateNote).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
