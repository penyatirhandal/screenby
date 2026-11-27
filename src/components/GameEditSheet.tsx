import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Focusable } from '../gamepad/GamepadProvider';
import { wallpaperUri } from '../services/WallpaperService';
import { NexusNative } from '../services/NexusNative';
import { colors } from '../theme/colors';
import { useLauncherPalette } from '../theme/ThemeContext';
import { useTypography } from '../theme/TypographyContext';
import type { PinnedGame } from '../types';
import { Icon } from './Icon';

export type GameEditPatch = Pick<
  PinnedGame,
  | 'customLabel'
  | 'customIconPath'
  | 'releaseYear'
  | 'genre'
  | 'developer'
  | 'publisher'
>;

interface GameEditSheetProps {
  visible: boolean;
  game: PinnedGame | null;
  onClose: () => void;
  onSave: (patch: GameEditPatch) => Promise<void>;
  /** Omit for games that cannot be removed from the launcher. */
  onDelete?: () => Promise<void>;
}

interface FormState {
  customLabel: string;
  releaseYear: string;
  genre: string;
  developer: string;
  publisher: string;
  customIconPath?: string;
}

const EMPTY_FORM: FormState = {
  customLabel: '',
  releaseYear: '',
  genre: '',
  developer: '',
  publisher: '',
};

function iconSource(game: PinnedGame | null, customIconPath?: string) {
  if (customIconPath) {
    return { uri: wallpaperUri(customIconPath) };
  }
  if (game?.icon) {
    return { uri: game.icon };
  }
  return null;
}

export function GameEditSheet({
  visible,
  game,
  onClose,
  onSave,
  onDelete,
}: GameEditSheetProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (game) {
      setForm({
        customLabel: game.customLabel ?? '',
        releaseYear: game.releaseYear ?? '',
        genre: game.genre ?? '',
        developer: game.developer ?? '',
        publisher: game.publisher ?? '',
        customIconPath: game.customIconPath,
      });
    }
  }, [game]);

  const setField = (key: keyof FormState, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const pickIcon = async () => {
    setPicking(true);
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        quality: 1,
      });
      if (result.didCancel || result.errorCode) {
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        throw new Error('Tidak ada gambar yang dipilih.');
      }
      const imported = await NexusNative.importGameIcon(uri);
      setForm(previous => ({ ...previous, customIconPath: imported.path }));
    } catch (error) {
      Alert.alert(
        'Gagal mengubah ikon',
        error instanceof Error ? error.message : 'Silakan coba lagi.',
      );
    } finally {
      setPicking(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        customLabel: form.customLabel.trim(),
        customIconPath: form.customIconPath,
        releaseYear: form.releaseYear.trim(),
        genre: form.genre.trim(),
        developer: form.developer.trim(),
        publisher: form.publisher.trim(),
      });
      onClose();
    } catch {
      Alert.alert('Gagal menyimpan', 'Perubahan tidak dapat disimpan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) {
      return;
    }
    Alert.alert(
      'Hapus dari Home?',
      'Game akan dikeluarkan dari Home. Aplikasi tetap terpasang di perangkat.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: () => {
            onDelete().then(onClose).catch(() => undefined);
          },
        },
      ],
    );
  };

  const source = iconSource(game, form.customIconPath);

  return (
    <Modal
      visible={visible && game !== null}
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
              EDIT GAME
            </Text>
            <Focusable
              id="gameEdit:close"
              enabled={visible && game !== null}
              layer={10}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup editor"
              hitSlop={8}
            >
              <Icon name="close" size={scaled(20)} color={palette.textSecondary} />
            </Focusable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.iconRow}>
              <Focusable
                id="gameEdit:icon"
                enabled={visible && game !== null}
                layer={10}
                style={[
                  styles.iconButton,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.primaryBorder,
                  },
                ]}
                onPress={() => pickIcon()}
                accessibilityRole="button"
                accessibilityLabel="Ganti ikon dari galeri"
                disabled={picking}
              >
                {source ? (
                  <Image
                    source={source}
                    style={styles.iconImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon name="image" size={scaled(30)} color={palette.textMuted} />
                )}
                {picking ? (
                  <View style={styles.iconLoading}>
                    <ActivityIndicator color={palette.primary} />
                  </View>
                ) : null}
              </Focusable>
              <View style={styles.iconHint}>
                <Text
                  style={[
                    styles.hint,
                    {
                      color: palette.textPrimary,
                      fontFamily: fonts.bodySemiBold,
                      fontSize: scaled(13),
                    },
                  ]}
                >
                  Ketuk ikon untuk memilih gambar dari galeri.
                </Text>
                {form.customIconPath ? (
                  <Focusable
                    id="gameEdit:restoreIcon"
                    enabled={visible && game !== null}
                    layer={10}
                    onPress={() =>
                      setForm(previous => ({ ...previous, customIconPath: undefined }))
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Kembalikan ikon asli"
                  >
                    <Text
                      style={[
                        styles.link,
                        {
                          color: palette.primary,
                          fontFamily: fonts.body,
                          fontSize: scaled(12),
                        },
                      ]}
                    >
                      Kembalikan ikon asli
                    </Text>
                  </Focusable>
                ) : null}
              </View>
            </View>

            <Field
              label="Nama"
              value={form.customLabel}
              placeholder={game?.label ?? 'Nama game'}
              onChangeText={value => setField('customLabel', value)}
            />
            <Field
              label="Tahun rilis"
              value={form.releaseYear}
              placeholder="2026"
              onChangeText={value => setField('releaseYear', value)}
            />
            <Field
              label="Genre"
              value={form.genre}
              placeholder="Action, RPG, ..."
              onChangeText={value => setField('genre', value)}
            />
            <Field
              label="Developer"
              value={form.developer}
              placeholder="Nama developer"
              onChangeText={value => setField('developer', value)}
            />
            <Field
              label="Publisher"
              value={form.publisher}
              placeholder="Nama publisher"
              onChangeText={value => setField('publisher', value)}
            />
          </ScrollView>

          <View style={styles.actions}>
            {onDelete ? (
              <Focusable
                id="gameEdit:delete"
                enabled={visible && game !== null}
                layer={10}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleDelete}
                accessibilityRole="button"
                accessibilityLabel="Hapus game dari Home"
              >
                <Text
                  style={[
                    styles.actionText,
                    {
                      color: palette.danger,
                      fontFamily: fonts.bodySemiBold,
                      fontSize: scaled(13),
                    },
                  ]}
                >
                  Delete
                </Text>
              </Focusable>
            ) : null}
            <View style={styles.actionSpacer} />
            <Focusable
              id="gameEdit:cancel"
              enabled={visible && game !== null}
              layer={10}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: palette.glassBorder },
                pressed && styles.buttonPressed,
              ]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Batal"
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
              id="gameEdit:save"
              enabled={visible && game !== null}
              layer={10}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: palette.primary },
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleSave()}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Simpan perubahan"
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
                Save
              </Text>
            </Focusable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
}: FieldProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const { fonts, scaled } = useTypography();

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
    padding: 20,
    maxHeight: '92%',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    letterSpacing: 1.6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 8,
  },
  iconButton: {
    width: 82,
    height: 82,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  iconLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconHint: {
    flex: 1,
    gap: 6,
  },
  hint: {
    lineHeight: 19,
  },
  link: {
    textDecorationLine: 'underline',
  },
  field: {
    gap: 5,
    marginBottom: 10,
  },
  fieldLabel: {
    letterSpacing: 1,
  },
  fieldInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 6,
  },
  actionSpacer: {
    flex: 1,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  secondaryButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  saveButton: {
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 9,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  actionText: {
    textAlign: 'center',
  },
});
