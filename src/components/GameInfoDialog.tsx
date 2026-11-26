import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {wallpaperUri} from '../services/WallpaperService';
import {colors} from '../theme/colors';
import {withAlpha} from '../theme/colorUtils';
import {useLauncherPalette} from '../theme/ThemeContext';
import {useTypography} from '../theme/TypographyContext';
import type {PinnedGame} from '../types';
import {Icon} from './Icon';

interface GameInfoDialogProps {
  visible: boolean;
  game: PinnedGame | null;
  onClose: () => void;
}

function formatDate(value?: number): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '—';
  }
  try {
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();
  return (
    <View
      style={[
        styles.row,
        {borderBottomColor: withAlpha(palette.textMuted, 0.16)},
      ]}
    >
      <Text
        style={[
          styles.rowLabel,
          {
            color: palette.textMuted,
            fontFamily: fonts.bodyBold,
            fontSize: scaled(11),
          },
        ]}
      >
        {label}
      </Text>
      <Text
        numberOfLines={2}
        style={[
          styles.rowValue,
          {
            color: palette.textPrimary,
            fontFamily: fonts.body,
            fontSize: scaled(13),
          },
        ]}
      >
        {value || '—'}
      </Text>
    </View>
  );
}

export function GameInfoDialog({
  visible,
  game,
  onClose,
}: GameInfoDialogProps): React.JSX.Element {
  const palette = useLauncherPalette();
  const {fonts, scaled} = useTypography();

  if (!visible || !game) {
    return <></>;
  }

  const iconSource = game.customIconPath
    ? {uri: wallpaperUri(game.customIconPath)}
    : game.icon
      ? {uri: game.icon}
      : null;
  const title = game.customLabel || game.label || game.packageName;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            {
              backgroundColor: colors.glassStrong,
              borderColor: palette.primaryBorder,
            },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`Info ${title}`}
        >
          <View style={styles.header}>
            {iconSource ? (
              <Image source={iconSource} style={styles.icon} resizeMode="contain" />
            ) : (
              <View
                style={[
                  styles.icon,
                  styles.iconFallback,
                  {backgroundColor: withAlpha(palette.primary, 0.18)},
                ]}
              >
                <Icon name="esports" size={scaled(22)} color={palette.primary} />
              </View>
            )}
            <View style={styles.heading}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color: palette.textPrimary,
                    fontFamily: fonts.displayBold,
                    fontSize: scaled(18),
                  },
                ]}
              >
                {title}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: palette.primary,
                    fontFamily: fonts.bodyBold,
                    fontSize: scaled(10),
                  },
                ]}
              >
                INFO GAME
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup info game"
              hitSlop={8}
            >
              <Icon name="close" size={scaled(20)} color={palette.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.rows} showsVerticalScrollIndicator>
            <InfoRow label="Rilis" value={game.releaseYear || '—'} />
            <InfoRow label="Genre" value={game.genre || '—'} />
            <InfoRow label="Developer" value={game.developer || '—'} />
            <InfoRow label="Publisher" value={game.publisher || '—'} />
            <InfoRow
              label="Terakhir dimainkan"
              value={formatDate(game.lastPlayedAt)}
            />
            <InfoRow label="Ditambahkan" value={formatDate(game.pinnedAt)} />
            <Text
              numberOfLines={1}
              style={[
                styles.packageName,
                {
                  color: palette.textMuted,
                  fontFamily: fonts.body,
                  fontSize: scaled(10),
                },
              ]}
            >
              {game.packageName}
            </Text>
          </ScrollView>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Tutup"
            style={({pressed}) => [
              styles.closeButton,
              {backgroundColor: palette.primary},
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.closeText,
                {
                  color: colors.background,
                  fontFamily: fonts.bodyBold,
                  fontSize: scaled(12),
                },
              ]}
            >
              TUTUP
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrimBottom,
    padding: 24,
  },
  panel: {
    width: 520,
    maxWidth: '100%',
    maxHeight: '82%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    flex: 1,
    gap: 2,
  },
  title: {
    letterSpacing: -0.3,
  },
  subtitle: {
    letterSpacing: 1.4,
  },
  rows: {
    flexShrink: 1,
    minHeight: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    width: 140,
    letterSpacing: 0.4,
  },
  rowValue: {
    flex: 1,
    textAlign: 'right',
  },
  packageName: {
    marginTop: 10,
    textAlign: 'center',
  },
  closeButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeText: {
    letterSpacing: 1.2,
  },
  pressed: {
    opacity: 0.7,
  },
});
