import React from "react";
import { render } from "@testing-library/react-native";

jest.mock("expo-splash-screen", () => ({
  setOptions: jest.fn(),
  preventAutoHideAsync: jest.fn(),
  hide: jest.fn(),
}));

jest.mock("@/providers/supabase-provider", () => ({
  SupabaseProvider: ({ children }: any) => <>{children}</>,
}));

const mockUseSupabase = jest.fn();
jest.mock("@/hooks/useSupabase", () => ({
  useSupabase: () => mockUseSupabase(),
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  const MockStack = ({ children }: any) => <View>{children}</View>;
  const MockScreen = ({ name }: any) => <Text>{`screen:${name}`}</Text>;
  const MockProtected = ({ guard, children }: any) =>
    guard ? <>{children}</> : null;

  MockStack.displayName = "MockStack";
  MockScreen.displayName = "MockScreen";
  MockProtected.displayName = "MockProtected";

  const Stack: any = MockStack;
  Stack.Screen = MockScreen;
  Stack.Protected = MockProtected;

  return { Stack };
});

describe("Auth guard", () => {
  test("viser ikke skjerm for autentiserte brukere / protected, når brukeren ikke er logget inn", () => {
    mockUseSupabase.mockReturnValue({ isLoaded: true, session: null });

    const RootLayout = require("@/app/_layout").default;
    const { queryByText, getByText } = render(<RootLayout />);

    expect(queryByText("screen:(protected)")).toBeNull();
    expect(getByText("screen:(public)")).toBeTruthy();
  });
});
