import { View, Text, Button } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

export default function EditNote() {
  const { id } = useLocalSearchParams();

  return (
    <View>
      <Text>Rediger notis {id}</Text>

      <Button
        title="Lagre"
        onPress={() => router.back()}
      />
    </View>
  );
}
