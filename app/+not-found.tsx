import { Link, Stack } from 'expo-router';
import { YStack, Button, H4, Paragraph } from '@blinkdotnew/mobile-ui';
import { AlertTriangle } from '@tamagui/lucide-icons';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <YStack flex={1} backgroundColor="$color1" alignItems="center" justifyContent="center" padding="$6" gap="$4">
        <AlertTriangle size={48} color="$color9" />
        <H4 color="$color12" fontWeight="700">Screen not found</H4>
        <Paragraph color="$color10" textAlign="center">
          This screen does not exist.
        </Paragraph>
        <Link href="/" asChild>
          <Button theme="active" borderRadius="$4">
            Go to home screen
          </Button>
        </Link>
      </YStack>
    </>
  );
}
