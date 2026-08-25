import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import {
  YStack, XStack, ScrollView, Card, Button, H4, SizableText,
  Paragraph, Separator, Input, Switch, toast,
  BlinkDialog,
} from '@blinkdotnew/mobile-ui';
import {
  FolderOpen, Clock, Settings, Trash2, Palette, Download,
  Shield, HelpCircle, Star, ChevronRight,
} from '@tamagui/lucide-icons';
import { Image } from 'expo-image';
import { useStore } from '@/lib/store';
import t from '@/constants/translations';

const ACCENT = '#0EA5E9';

export default function ProjectsScreen() {
  const {
    projects, recentExports, customPresets, brandKits,
    deleteProject, addCustomPreset, deleteCustomPreset, addBrandKit,
    clearTemporaryFiles, analyticsOptOut, setAnalyticsOptOut,
    isPro,
  } = useStore();

  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [showNewBrand, setShowNewBrand] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetW, setPresetW] = useState('1080');
  const [presetH, setPresetH] = useState('1350');
  const [brandName, setBrandName] = useState('');
  const [brandPrimary, setBrandPrimary] = useState('#0EA5E9');
  const [brandSecondary, setBrandSecondary] = useState('#0284C7');

  const handleClearTemp = useCallback(() => {
    clearTemporaryFiles();
    setShowClearDialog(false);
    toast('Cleared', { message: 'Temporary files removed.', variant: 'success' });
  }, [clearTemporaryFiles]);

  const handleAddPreset = useCallback(() => {
    if (!presetName.trim()) return;
    addCustomPreset({
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      width: parseInt(presetW, 10) || 1080,
      height: parseInt(presetH, 10) || 1350,
      format: 'jpeg',
      quality: 85,
      createdAt: new Date().toISOString(),
    });
    setPresetName('');
    setShowNewPreset(false);
    toast('Saved', { message: 'Custom preset saved.', variant: 'success' });
  }, [presetName, presetW, presetH, addCustomPreset]);

  const handleAddBrand = useCallback(() => {
    if (!brandName.trim()) return;
    addBrandKit({
      id: `brand_${Date.now()}`,
      name: brandName.trim(),
      primaryColor: brandPrimary,
      secondaryColor: brandSecondary,
    });
    setBrandName('');
    setShowNewBrand(false);
    toast('Saved', { message: 'Brand kit saved.', variant: 'success' });
  }, [brandName, brandPrimary, brandSecondary, addBrandKit]);

  return (
    <YStack flex={1} backgroundColor="$color1">
      <ScrollView flex={1} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <XStack paddingHorizontal="$5" paddingTop="$4" paddingBottom="$2" justifyContent="space-between" alignItems="center">
          <H4 color="$color12" fontWeight="700">{t.projects.title}</H4>
          <Button chromeless size="$3" onPress={() => router.push('/privacy')} icon={<Shield size={18} color="$color10" />} />
        </XStack>

        <Separator marginHorizontal="$5" marginVertical="$3" />

        {/* Recent exports */}
        <YStack paddingHorizontal="$5" gap="$3">
          <H4 color="$color12" fontWeight="700">{t.projects.exports}</H4>
          {recentExports.length === 0 ? (
            <Card padding="$4" backgroundColor="$color2" borderRadius="$4" alignItems="center" gap="$2">
              <Clock size={24} color="$color8" />
              <Paragraph color="$color9" size="$2">No exports yet. Process an image to see it here.</Paragraph>
            </Card>
          ) : (
            recentExports.slice(0, 5).map((exp) => (
              <Card key={exp.id} bordered backgroundColor="$color2" borderColor="$color4" padding="$3" borderRadius="$4">
                <XStack gap="$3" alignItems="center">
                  <YStack width={40} height={40} borderRadius="$2" backgroundColor="$color3" overflow="hidden" alignItems="center" justifyContent="center">
                    {exp.sourceUri ? (
                      <Image source={{ uri: exp.sourceUri }} style={{ width: 40, height: 40 }} contentFit="cover" />
                    ) : (
                      <Download size={18} color="$color10" />
                    )}
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <SizableText size="$2" fontWeight="600" color="$color12" numberOfLines={1}>
                      {exp.outputSettings?.filename ?? 'Export'}
                    </SizableText>
                    <SizableText size="$1" color="$color9">
                      {exp.outputSettings?.width} x {exp.outputSettings?.height} · {exp.outputSettings?.format?.toUpperCase()}
                    </SizableText>
                  </YStack>
                  <SizableText size="$1" color="$color9">
                    {new Date(exp.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </SizableText>
                </XStack>
              </Card>
            ))
          )}
        </YStack>

        {/* Drafts */}
        {projects.length > 0 && (
          <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
            <H4 color="$color12" fontWeight="700">{t.projects.drafts}</H4>
            {projects.slice(0, 5).map((project) => (
              <Card key={project.id} bordered backgroundColor="$color2" borderColor="$color4" padding="$3" borderRadius="$4">
                <XStack gap="$3" alignItems="center">
                  <YStack width={40} height={40} borderRadius="$2" backgroundColor="$color3" overflow="hidden" alignItems="center" justifyContent="center">
                    {project.sourceUri ? (
                      <Image source={{ uri: project.sourceUri }} style={{ width: 40, height: 40 }} contentFit="cover" />
                    ) : (
                      <FolderOpen size={18} color="$color10" />
                    )}
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <SizableText size="$2" fontWeight="600" color="$color12">
                      {project.selectedPresets[0]?.platform ?? 'Draft'}
                    </SizableText>
                    <SizableText size="$1" color="$color9">
                      {project.exportResults.length} export{project.exportResults.length !== 1 ? 's' : ''}
                    </SizableText>
                  </YStack>
                  <Button chromeless size="$2" onPress={() => deleteProject(project.id)}>
                    <Trash2 size={16} color="$red9" />
                  </Button>
                </XStack>
              </Card>
            ))}
          </YStack>
        )}

        {/* Custom presets */}
        <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H4 color="$color12" fontWeight="700">{t.projects.customPresets}</H4>
            {isPro && (
              <Button size="$2" chromeless onPress={() => setShowNewPreset(true)} theme="active">
                <SizableText color={ACCENT} fontWeight="600">Add</SizableText>
              </Button>
            )}
          </XStack>
          {customPresets.length === 0 ? (
            <Card padding="$4" backgroundColor="$color2" borderRadius="$4" alignItems="center" gap="$2">
              <Palette size={24} color="$color8" />
              <Paragraph color="$color9" size="$2">Save your frequently used dimensions as presets.</Paragraph>
            </Card>
          ) : (
            customPresets.map((p) => (
              <Card key={p.id} bordered backgroundColor="$color2" borderColor="$color4" padding="$3" borderRadius="$4">
                <XStack gap="$3" alignItems="center" justifyContent="space-between">
                  <YStack gap="$1">
                    <SizableText size="$2" fontWeight="600" color="$color12">{p.name}</SizableText>
                    <SizableText size="$1" color="$color9">{p.width} x {p.height}</SizableText>
                  </YStack>
                  <Button chromeless size="$2" onPress={() => deleteCustomPreset(p.id)}>
                    <Trash2 size={14} color="$red9" />
                  </Button>
                </XStack>
              </Card>
            ))
          )}
        </YStack>

        {/* Brand kits */}
        <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
          <XStack justifyContent="space-between" alignItems="center">
            <H4 color="$color12" fontWeight="700">{t.projects.brandKits}</H4>
            {isPro && (
              <Button size="$2" chromeless onPress={() => setShowNewBrand(true)} theme="active">
                <SizableText color={ACCENT} fontWeight="600">Add</SizableText>
              </Button>
            )}
          </XStack>
          {brandKits.length === 0 ? (
            <Card padding="$4" backgroundColor="$color2" borderRadius="$4" alignItems="center" gap="$2">
              <Palette size={24} color="$color8" />
              <Paragraph color="$color9" size="$2">Save brand colors for quick background selection.</Paragraph>
            </Card>
          ) : (
            brandKits.map((bk) => (
              <Card key={bk.id} bordered backgroundColor="$color2" borderColor="$color4" padding="$3" borderRadius="$4">
                <XStack gap="$3" alignItems="center" justifyContent="space-between">
                  <YStack gap="$1">
                    <SizableText size="$2" fontWeight="600" color="$color12">{bk.name}</SizableText>
                    <XStack gap="$2">
                      <YStack width={20} height={20} borderRadius="$10" backgroundColor={bk.primaryColor} borderWidth={1} borderColor="$color5" />
                      <YStack width={20} height={20} borderRadius="$10" backgroundColor={bk.secondaryColor} borderWidth={1} borderColor="$color5" />
                    </XStack>
                  </YStack>
                </XStack>
              </Card>
            ))
          )}
        </YStack>

        {/* Settings section */}
        <YStack paddingHorizontal="$5" paddingTop="$5" gap="$3">
          <H4 color="$color12" fontWeight="700">{t.projects.settings}</H4>

          <Card bordered backgroundColor="$color2" borderColor="$color4" borderRadius="$4" overflow="hidden">
            <SettingsRow icon={Shield} label={t.settings.privacyPolicy} onPress={() => router.push('/privacy')} />
            <Separator marginHorizontal="$4" />
            <SettingsRow icon={HelpCircle} label={t.settings.support} onPress={() => toast('Support', { message: 'Email support@photoresizer.ca', variant: 'success' })} />
            <Separator marginHorizontal="$4" />
            <XStack padding="$4" justifyContent="space-between" alignItems="center">
              <SizableText size="$3" color="$color12">{t.settings.analyticsOptOut}</SizableText>
              <Switch checked={analyticsOptOut} onCheckedChange={setAnalyticsOptOut} size="$2" />
            </XStack>
          </Card>

          <Card bordered backgroundColor="$color2" borderColor="$color4" borderRadius="$4" overflow="hidden">
            <SettingsRow icon={Star} label={t.settings.restorePurchases} onPress={() => toast('Restore', { message: 'Checking purchases...', variant: 'success' })} />
            <Separator marginHorizontal="$4" />
            <SettingsRow icon={Settings} label={t.settings.manageSubscription} onPress={() => toast('Manage', { message: 'Subscription management coming soon.', variant: 'success' })} />
          </Card>

          <Card bordered backgroundColor="$color2" borderColor="$color4" borderRadius="$4" overflow="hidden">
            <SettingsRow icon={Trash2} label={t.projects.clearTemp} onPress={() => setShowClearDialog(true)} destructive />
          </Card>

          <YStack paddingVertical="$4" alignItems="center">
            <SizableText size="$1" color="$color9">PhotoResizer v1.0.0</SizableText>
          </YStack>
        </YStack>
      </ScrollView>

      {/* Clear temp dialog */}
      <BlinkDialog
        open={showClearDialog}
        title="Clear temporary files"
        description="This will remove all local drafts, export history, and temporary files. This cannot be undone."
        onConfirm={handleClearTemp}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* New preset dialog */}
      <BlinkDialog
        open={showNewPreset}
        title="New custom preset"
        description="Save frequently used dimensions."
        onConfirm={handleAddPreset}
        onCancel={() => setShowNewPreset(false)}
      >
        <YStack gap="$3" paddingTop="$2">
          <Input value={presetName} onChangeText={setPresetName} placeholder="Preset name (e.g. Blog Header)" />
          <XStack gap="$3">
            <YStack flex={1}>
              <Input value={presetW} onChangeText={setPresetW} placeholder="Width" keyboardType="numeric" />
            </YStack>
            <YStack flex={1}>
              <Input value={presetH} onChangeText={setPresetH} placeholder="Height" keyboardType="numeric" />
            </YStack>
          </XStack>
        </YStack>
      </BlinkDialog>

      {/* New brand kit dialog */}
      <BlinkDialog
        open={showNewBrand}
        title="New brand kit"
        description="Save your brand colors."
        onConfirm={handleAddBrand}
        onCancel={() => setShowNewBrand(false)}
      >
        <YStack gap="$3" paddingTop="$2">
          <Input value={brandName} onChangeText={setBrandName} placeholder="Brand name" />
          <XStack gap="$3">
            <YStack flex={1}>
              <SizableText size="$1" color="$color9">Primary</SizableText>
              <Input value={brandPrimary} onChangeText={setBrandPrimary} placeholder="#0EA5E9" />
            </YStack>
            <YStack flex={1}>
              <SizableText size="$1" color="$color9">Secondary</SizableText>
              <Input value={brandSecondary} onChangeText={setBrandSecondary} placeholder="#0284C7" />
            </YStack>
          </XStack>
        </YStack>
      </BlinkDialog>
    </YStack>
  );
}

function SettingsRow({ icon: Icon, label, onPress, destructive }: {
  icon: any;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <XStack
      padding="$4"
      justifyContent="space-between"
      alignItems="center"
      onPress={onPress}
      pressStyle={{ opacity: 0.6 }}
    >
      <XStack gap="$3" alignItems="center">
        <Icon size={18} color={destructive ? '$red9' : '$color11'} />
        <SizableText size="$3" color={destructive ? '$red10' : '$color12'}>{label}</SizableText>
      </XStack>
      <ChevronRight size={16} color="$color8" />
    </XStack>
  );
}
