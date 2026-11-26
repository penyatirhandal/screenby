import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  type TextStyle,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import type { CropState, Wallpaper } from '../types';
import {
  computeCoverLayout,
  DEFAULT_CROP,
  MAX_ZOOM,
  MIN_ZOOM,
  panCrop,
  sanitizeCrop,
  stepZoom,
  type CropLayout,
} from '../utils/smartCrop';
import { wallpaperUri } from '../services/WallpaperService';
import { colors } from '../theme/colors';
import { useTypography } from '../theme/TypographyContext';
import { Icon } from './Icon';

interface WallpaperSheetProps {
  visible: boolean;
  wallpaper: Wallpaper | null;
  onClose: () => void;
  onPick: () => Promise<Wallpaper | null>;
  onSave: (crop: CropState) => Promise<void>;
  onRemove: () => Promise<void>;
}

interface Size {
  width: number;
  height: number;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Terjadi kesalahan. Silakan coba lagi.';
}

export function WallpaperSheet({
  visible,
  wallpaper,
  onClose,
  onPick,
  onSave,
  onRemove,
}: WallpaperSheetProps): React.JSX.Element {
  const [draft, setDraft] = useState<CropState>(DEFAULT_CROP);
  const [slot, setSlot] = useState<Size>({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fonts, scaled } = useTypography();
  const textStyle = (
    style: TextStyle,
    size: number,
    bold = false,
  ): TextStyle[] => [
    style,
    { fontFamily: bold ? fonts.bodyBold : fonts.body, fontSize: scaled(size) },
  ];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const screenAspect = screenWidth / Math.max(screenHeight, 1);
  const panelHeight = Math.min(screenHeight - 24, 430);

  const draftRef = useRef(draft);
  const wallpaperRef = useRef(wallpaper);
  const previewRef = useRef<Size>({ width: 0, height: 0 });
  const panStartRef = useRef<CropState>(draft);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    wallpaperRef.current = wallpaper;
  }, [wallpaper]);

  useEffect(() => {
    if (visible) {
      setDraft(wallpaper ? sanitizeCrop(wallpaper.crop) : { ...DEFAULT_CROP });
      setError(null);
    }
  }, [visible, wallpaper]);

  const preview = useMemo<Size>(() => {
    if (slot.width <= 0 || slot.height <= 0) {
      return { width: 0, height: 0 };
    }
    const aspect = Math.max(screenAspect, 0.4);
    let width = slot.width;
    let height = width / aspect;
    if (height > slot.height) {
      height = slot.height;
      width = height * aspect;
    }
    return { width: Math.floor(width), height: Math.floor(height) };
  }, [slot, screenAspect]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  const previewLayout = useMemo<CropLayout | null>(() => {
    if (!wallpaper || preview.width <= 0 || preview.height <= 0) {
      return null;
    }
    return computeCoverLayout(
      wallpaper.width,
      wallpaper.height,
      preview.width,
      preview.height,
      draft,
    );
  }, [wallpaper, preview, draft]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          panStartRef.current = draftRef.current;
        },
        onPanResponderMove: (_, gesture) => {
          const currentWallpaper = wallpaperRef.current;
          const currentPreview = previewRef.current;
          if (
            !currentWallpaper ||
            currentPreview.width <= 0 ||
            currentPreview.height <= 0
          ) {
            return;
          }
          const base = panStartRef.current;
          const layout = computeCoverLayout(
            currentWallpaper.width,
            currentWallpaper.height,
            currentPreview.width,
            currentPreview.height,
            base,
          );
          setDraft(
            panCrop(
              base,
              gesture.dx,
              gesture.dy,
              layout,
              currentPreview.width,
              currentPreview.height,
            ),
          );
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  const busy = saving || picking || removing;
  const canZoomOut = draft.zoom > MIN_ZOOM + 0.001;
  const canZoomIn = draft.zoom < MAX_ZOOM - 0.001;
  const canSave = wallpaper != null && !busy;

  const handlePick = async () => {
    setError(null);
    setPicking(true);
    try {
      await onPick();
    } catch (pickError) {
      setError(errorMessage(pickError));
    } finally {
      setPicking(false);
    }
  };

  const handleSave = async () => {
    if (!wallpaper) {
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Hapus wallpaper?',
      'Latar bawaan Nexus akan digunakan kembali. Gambar di penyimpanan aplikasi juga dihapus.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setError(null);
            setRemoving(true);
            try {
              await onRemove();
              onClose();
            } catch (removeError) {
              setError(errorMessage(removeError));
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  const updateZoom = (delta: number) => {
    setDraft(current => stepZoom(current, delta));
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
        />

        <View style={[styles.panel, { height: panelHeight }]}>
          <View style={styles.header}>
            <View style={styles.titleGroup}>
              <View style={styles.titleIcon}>
                <Icon name="wallpaper" size={19} color={colors.primary} />
              </View>
              <View style={styles.titleTextGroup}>
                <Text style={textStyle(styles.title, 17, true)}>Wallpaper</Text>
                <Text style={textStyle(styles.subtitle, 11.5)} numberOfLines={1}>
                  Pilih gambar dan atur titik fokus crop landscape
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Tutup pengaturan wallpaper"
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="close" size={19} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.body}>
            <View
              style={styles.previewSlot}
              onLayout={event => {
                const { width, height } = event.nativeEvent.layout;
                setSlot(current =>
                  Math.abs(current.width - width) < 1 &&
                  Math.abs(current.height - height) < 1
                    ? current
                    : { width, height },
                );
              }}
            >
              {preview.width > 0 && preview.height > 0 ? (
                <View
                  style={[
                    styles.previewBox,
                    { width: preview.width, height: preview.height },
                  ]}
                  {...panResponder.panHandlers}
                  accessible
                  accessibilityLabel="Pratinjau crop wallpaper"
                  accessibilityHint="Geser untuk memindahkan titik fokus gambar"
                >
                  {wallpaper && previewLayout ? (
                    <Image
                      source={{ uri: wallpaperUri(wallpaper.path) }}
                      style={[
                        styles.previewImage,
                        {
                          left: previewLayout.left,
                          top: previewLayout.top,
                          width: previewLayout.width,
                          height: previewLayout.height,
                        },
                      ]}
                      resizeMode="cover"
                      fadeDuration={0}
                    />
                  ) : (
                    <LinearGradient
                      colors={['#20293A', '#14161D']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  {!wallpaper ? (
                    <View style={styles.placeholder}>
                      <Icon name="image" size={30} color={colors.textMuted} />
                      <Text style={textStyle(styles.placeholderText, 12)}>
                        Belum ada wallpaper
                      </Text>
                    </View>
                  ) : null}

                  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <View
                      style={[
                        styles.guide,
                        styles.guideVertical,
                        styles.guideThirdLeft,
                      ]}
                    />
                    <View
                      style={[
                        styles.guide,
                        styles.guideVertical,
                        styles.guideTwoThirdsLeft,
                      ]}
                    />
                    <View
                      style={[
                        styles.guide,
                        styles.guideHorizontal,
                        styles.guideThirdTop,
                      ]}
                    />
                    <View
                      style={[
                        styles.guide,
                        styles.guideHorizontal,
                        styles.guideTwoThirdsTop,
                      ]}
                    />
                  </View>

                  {wallpaper ? (
                    <View style={styles.previewBadge} pointerEvents="none">
                      <Icon
                        name="swipeUp"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text style={textStyle(styles.previewBadgeText, 10)}>
                        Geser untuk mengatur
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={styles.controls}>
              <Pressable
                onPress={handlePick}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Pilih wallpaper dari galeri"
                style={({ pressed }) => [
                  styles.pickButton,
                  pressed && styles.pressed,
                  busy && styles.disabled,
                ]}
              >
                {picking ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="gallery" size={17} color={colors.primary} />
                )}
                <Text style={textStyle(styles.pickText, 12.5, true)} numberOfLines={1}>
                  {picking
                    ? 'Membuka galeri…'
                    : wallpaper
                    ? 'Ganti gambar'
                    : 'Pilih dari Galeri'}
                </Text>
              </Pressable>

              <Text style={textStyle(styles.hint, 11)}>
                {wallpaper
                  ? 'Geser gambar pada pratinjau untuk memilih bagian yang ditampilkan.'
                  : 'Gunakan foto landscape agar hasil crop lebih optimal.'}
              </Text>

              <Text style={textStyle(styles.zoomLabel, 9, true)}>UKURAN CROP</Text>

              <View style={styles.zoomRow}>
                <Pressable
                  onPress={() => updateZoom(-0.1)}
                  disabled={!wallpaper || !canZoomOut || busy}
                  accessibilityRole="button"
                  accessibilityLabel="Perkecil crop"
                  style={({ pressed }) => [
                    styles.roundButton,
                    (!wallpaper || !canZoomOut || busy) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="zoomOut" size={18} color={colors.textSecondary} />
                </Pressable>

                <View style={styles.zoomValue}>
                  <Text style={textStyle(styles.zoomValueText, 12, true)}>
                    {Math.round(draft.zoom * 100)}%
                  </Text>
                </View>

                <Pressable
                  onPress={() => updateZoom(0.1)}
                  disabled={!wallpaper || !canZoomIn || busy}
                  accessibilityRole="button"
                  accessibilityLabel="Perbesar crop"
                  style={({ pressed }) => [
                    styles.roundButton,
                    (!wallpaper || !canZoomIn || busy) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="zoomIn" size={18} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                  onPress={() => setDraft({ ...DEFAULT_CROP })}
                  disabled={!wallpaper || busy}
                  accessibilityRole="button"
                  accessibilityLabel="Atur ulang posisi crop"
                  style={({ pressed }) => [
                    styles.roundButton,
                    (!wallpaper || busy) && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="reset" size={17} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          </View>

          {error ? (
            <Text style={textStyle(styles.error, 11.5)} numberOfLines={2}>
              {error}
            </Text>
          ) : null}

          <View style={styles.footer}>
            {wallpaper ? (
              <Pressable
                onPress={handleRemove}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Hapus wallpaper"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.removeButton,
                  busy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="trash" size={16} color={colors.danger} />
                <Text style={textStyle(styles.removeText, 12)}>Hapus</Text>
              </Pressable>
            ) : (
              <View />
            )}

            <View style={styles.footerRight}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Batal"
                style={({ pressed }) => [
                  styles.secondaryButton,
                  busy && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={textStyle(styles.secondaryText, 12.5)}>Batal</Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                disabled={!canSave}
                accessibilityRole="button"
                accessibilityLabel="Simpan wallpaper"
                style={({ pressed }) => [
                  styles.primaryButton,
                  !canSave && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Icon name="check" size={16} color={colors.background} />
                )}
                <Text style={textStyle(styles.primaryText, 12.5, true)}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(6, 7, 10, 0.78)',
  },
  panel: {
    width: '94%',
    maxWidth: 760,
    borderRadius: 26,
    padding: 20,
    backgroundColor: '#1B1C21',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  titleTextGroup: {
    flexShrink: 1,
  },
  title: {
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
    marginLeft: 10,
  },
  body: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'stretch',
    gap: 16,
    flex: 1,
    minHeight: 0,
  },
  previewSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  previewBox: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#101115',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  previewImage: {
    position: 'absolute',
  },
  placeholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    color: colors.textMuted,
  },
  guide: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  guideVertical: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  guideHorizontal: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  guideThirdLeft: {
    left: '33.33%',
  },
  guideTwoThirdsLeft: {
    left: '66.66%',
  },
  guideThirdTop: {
    top: '33.33%',
  },
  guideTwoThirdsTop: {
    top: '66.66%',
  },
  previewBadge: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(12, 13, 17, 0.7)',
  },
  previewBadgeText: {
    color: colors.textSecondary,
  },
  controls: {
    width: 214,
    justifyContent: 'center',
    gap: 10,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primaryBorder,
  },
  pickText: {
    color: colors.primary,
  },
  hint: {
    lineHeight: 15,
    color: colors.textMuted,
  },
  zoomLabel: {
    letterSpacing: 1.4,
    color: colors.textMuted,
    marginTop: 2,
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  zoomValue: {
    minWidth: 50,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  zoomValueText: {
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  error: {
    color: colors.danger,
    marginTop: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  removeText: {
    color: colors.danger,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glassBorder,
  },
  secondaryText: {
    color: colors.textSecondary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.background,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.72,
  },
});
