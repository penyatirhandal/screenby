import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEFAULT_EXTENSIONS,
  parseExtensions,
  type EmulatorOption,
} from '../constants/emulators';
import {findEmulatorOption} from '../hooks/useGamePlatforms';
import {NexusNative} from '../services/NexusNative';
import {colors} from '../theme/colors';
import {withAlpha} from '../theme/colorUtils';
import {useLauncherPalette} from '../theme/ThemeContext';
import {useTypography} from '../theme/TypographyContext';
import type {GamePlatform, PlatformInput} from '../types';
import {Icon} from './Icon';
import {Focusable} from '../gamepad/GamepadProvider';

interface PlatformSheetProps {
  visible: boolean;
  platform: GamePlatform | null;
  emulatorOptions: EmulatorOption[];
  onClose: () => void;
  onSubmit: (input: PlatformInput) => Promise<void>;
}

interface FormState {
  name: string;
  emulatorId: string;
  extensions: string;
  folderUri: string;
  folderName: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  emulatorId: '',
  extensions: DEFAULT_EXTENSIONS.join(', '),
  folderUri: '',
  folderName: '',
};

export function PlatformSheet({
  visible,
  platform,
  emulatorOptions,
  onClose,
  onSubmit,
}: PlatformSheetProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [showEmulators, setShowEmulators] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (platform) {
      const option = findEmulatorOption(emulatorOptions, platform);
      setForm({
        name: platform.name,
        emulatorId: option?.id ?? '',
        extensions: platform.extensions.join(', '),
        folderUri: platform.folderUri,
        folderName: platform.folderName,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setQuery('');
    setShowEmulators(false);
  }, [visible, platform, emulatorOptions]);

  const setField = (key: keyof FormState, value: string) => {
    setForm(previous => ({...previous, [key]: value}));
  };

  const selected =
    emulatorOptions.find(option => option.id === form.emulatorId) ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = normalizedQuery
    ? emulatorOptions.filter(option =>
        `${option.label} ${option.packageName}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : emulatorOptions;

  const pickFolder = async () => {
    setPicking(true);
    try {
      const folder = await NexusNative.pickGameFolder();
      setForm(previous => ({
        ...previous,
        folderUri: folder.uri,
        folderName: folder.name,
      }));
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as {code?: unknown}).code)
          : '';
      if (code !== 'E_FOLDER_CANCELLED') {
        Alert.alert(
          'Gagal memilih folder',
          error instanceof Error ? error.message : 'Silakan coba lagi.',
        );
      }
    } finally {
      setPicking(false);
    }
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      Alert.alert('Nama platform kosong', 'Isi nama platform terlebih dahulu.');
      return;
    }
    if (!selected) {
      Alert.alert(
        'Emulator belum dipilih',
        'Pilih APK emulator yang sudah terpasang di perangkat.',
      );
      return;
    }
    if (!form.folderUri) {
      Alert.alert('Folder belum dipilih', 'Pilih folder tempat menyimpan game.');
      return;
    }
    const extensions = parseExtensions(form.extensions);
    if (extensions.length === 0) {
      Alert.alert(
        'Ekstensi kosong',
        'Isi ekstensi game yang akan dipindai, misalnya iso, chd, zip.',
      );
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name,
        emulatorId: selected.id,
        emulatorLabel: selected.label,
        emulatorPackage: selected.packageName,
        extensions,
        folderUri: form.folderUri,
        folderName: form.folderName,
      });
      onClose();
    } catch (error) {
      Alert.alert(
        'Gagal menyimpan',
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={styles.backdrop} behavior="height">
        <Pressable style={styles.dismiss} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.glassStrong,
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <View style={styles.header}>
            <Text
              style={[
                styles.heading,
                {
                  color: palette.textPrimary,
                  fontFamily: fonts.displayBold,
                  fontSize: scaled(20),
                },
              ]}
            >
              {platform ? 'EDIT PLATFORM' : 'PLATFORM BARU'}
            </Text>
            <Focusable
              id="platformSheet:close"
              enabled={visible}
              layer={10}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup editor platform"
              hitSlop={8}
            >
              <Icon name="close" size={scaled(20)} color={palette.textSecondary} />
            </Focusable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Field
              label="Nama platform"
              value={form.name}
              placeholder="Misalnya PSP"
              onChangeText={value => setField('name', value)}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.bodySemiBold,
                  fontSize: scaled(11),
                },
              ]}
            >
              EMULATOR
            </Text>
            <Text
              style={[
                styles.helper,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(10),
                },
              ]}
            >
              Hanya APK yang sudah terpasang yang dapat dipilih.
            </Text>
            <Focusable
              id="platformSheet:emulator"
              enabled={visible}
              layer={10}
              onPress={() => setShowEmulators(value => !value)}
              accessibilityRole="button"
              accessibilityLabel="Pilih emulator yang terpasang"
              style={({pressed}) => [
                styles.selector,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.glassBorder,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: selected ? palette.textPrimary : palette.textMuted,
                    fontFamily: fonts.body,
                    fontSize: scaled(14),
                  },
                ]}
              >
                {selected?.label ?? 'Pilih emulator terpasang'}
              </Text>
              <Icon name="chevronRight" size={scaled(16)} color={palette.primary} />
            </Focusable>

            {showEmulators ? (
              <View style={styles.optionList}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Cari nama atau package APK"
                  placeholderTextColor={palette.textMuted}
                  autoCorrect={false}
                  accessibilityLabel="Cari emulator terpasang"
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.glassBorder,
                      color: palette.textPrimary,
                      fontFamily: fonts.body,
                      fontSize: scaled(12),
                    },
                  ]}
                />
                {visibleOptions.length === 0 ? (
                  <Text
                    style={[
                      styles.helper,
                      {
                        color: palette.textMuted,
                        fontFamily: fonts.body,
                        fontSize: scaled(11),
                      },
                    ]}
                  >
                    Tidak ada aplikasi terpasang yang cocok.
                  </Text>
                ) : null}
                {visibleOptions.map(option => (
                  <Focusable
                    key={option.id}
                    id={`platformSheet:emulator:${option.id}`}
                    enabled={visible}
                    layer={10}
                    onPress={() => {
                      setField('emulatorId', option.id);
                      setField('extensions', option.extensions.join(', '));
                      setShowEmulators(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{checked: option.id === form.emulatorId}}
                    accessibilityLabel={`${option.label}, ${option.packageName}`}
                    style={({pressed}) => [
                      styles.option,
                      {
                        backgroundColor:
                          option.id === form.emulatorId
                            ? withAlpha(palette.primary, 0.18)
                            : palette.surface,
                      },
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <View style={styles.optionCopy}>
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color:
                              option.id === form.emulatorId
                                ? palette.primary
                                : palette.textSecondary,
                            fontFamily: fonts.body,
                            fontSize: scaled(13),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.optionPackage,
                          {
                            color: palette.textMuted,
                            fontFamily: fonts.body,
                            fontSize: scaled(10),
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {option.packageName}
                      </Text>
                    </View>
                    {option.id === form.emulatorId ? (
                      <Icon name="check" size={scaled(14)} color={palette.primary} />
                    ) : null}
                  </Focusable>
                ))}
              </View>
            ) : null}

            <Field
              label="Ekstensi game"
              value={form.extensions}
              placeholder="iso, cso, chd, zip"
              onChangeText={value => setField('extensions', value)}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.bodySemiBold,
                  fontSize: scaled(11),
                },
              ]}
            >
              FOLDER GAME
            </Text>
            <Focusable
              id="platformSheet:folder"
              enabled={visible}
              layer={10}
              onPress={() => pickFolder()}
              accessibilityRole="button"
              accessibilityLabel="Pilih folder tempat game disimpan"
              disabled={picking}
              style={({pressed}) => [
                styles.selector,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.glassBorder,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  {
                    color: form.folderName ? palette.textPrimary : palette.textMuted,
                    fontFamily: fonts.body,
                    fontSize: scaled(14),
                  },
                ]}
                numberOfLines={1}
              >
                {form.folderName || 'Pilih folder'}
              </Text>
              {picking ? (
                <ActivityIndicator color={palette.primary} />
              ) : (
                <Icon name="forward" size={scaled(16)} color={palette.primary} />
              )}
            </Focusable>
          </ScrollView>

          <View style={styles.actions}>
            <Focusable
              id="platformSheet:cancel"
              enabled={visible}
              layer={10}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Batal"
              style={({pressed}) => [
                styles.secondaryButton,
                {borderColor: palette.glassBorder},
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: palette.textSecondary,
                    fontFamily: fonts.body,
                    fontSize: scaled(13),
                  },
                ]}
              >
                Batal
              </Text>
            </Focusable>
            <Focusable
              id="platformSheet:save"
              enabled={visible}
              layer={10}
              onPress={() => handleSubmit()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={
                platform ? 'Simpan perubahan platform' : 'Tambah platform'
              }
              style={({pressed}) => [
                styles.saveButton,
                {backgroundColor: palette.primary},
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: palette.background,
                    fontFamily: fonts.bodyBold,
                    fontSize: scaled(13),
                  },
                ]}
              >
                {saving
                  ? 'MENYIMPAN...'
                  : platform
                    ? 'SIMPAN'
                    : 'ADD PLATFORM'}
              </Text>
            </Focusable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  return (
    <View style={styles.field}>
      <Text
        style={[
          styles.fieldLabel,
          {
            color: palette.textMuted,
            fontFamily: fonts.bodySemiBold,
            fontSize: scaled(11),
          },
        ]}
      >
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        autoCorrect={false}
        style={[
          styles.fieldInput,
          {
            backgroundColor: palette.surface,
            borderColor: palette.glassBorder,
            color: palette.textPrimary,
            fontFamily: fonts.body,
            fontSize: scaled(14),
          },
        ]}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.scrimBottom,
  },
  dismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '90%',
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    letterSpacing: 1.4,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    letterSpacing: 0.8,
  },
  helper: {
    marginTop: 4,
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selector: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectorText: {
    flexShrink: 1,
  },
  optionList: {
    gap: 4,
  },
  searchInput: {
    minHeight: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  option: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCopy: {
    flexShrink: 1,
    gap: 1,
  },
  optionText: {
    flexShrink: 1,
  },
  optionPackage: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionText: {
    textAlign: 'center',
  },
  buttonPressed: {
    opacity: 0.65,
  },
});
