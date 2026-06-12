import React, {useCallback, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {showDialog} from '../context/DialogProvider';
import {CloseIcon, GradientButton} from './ui';
import {colors, radii, spacing} from '../theme';
import {moderateScale, scale, verticalScale} from '../utils/responsive';
import {saveQrImageFromDataUrl} from '../utils/saveQrImage';

type Props = {
  visible: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
};

export const QrMenuModal: React.FC<Props> = ({
  visible,
  url,
  title = 'QR menu',
  onClose,
}) => {
  const qrRef = useRef<{toDataURL: (callback: (data: string) => void) => void} | null>(
    null,
  );
  const [downloading, setDownloading] = useState(false);

  const onDownloadPress = useCallback(() => {
    if (!qrRef.current || !url) {
      showDialog('Unavailable', 'QR code is not ready yet.');
      return;
    }

    setDownloading(true);
    qrRef.current.toDataURL(async dataUrl => {
      try {
        await saveQrImageFromDataUrl(dataUrl);
        showDialog('Downloaded', 'QR code saved to your gallery.');
      } catch (error) {
        if (error instanceof Error && error.message === 'permission_denied') {
          showDialog(
            'Permission required',
            'Allow storage access to save the QR code image.',
          );
        } else {
          showDialog(
            'Unable to download',
            'Something went wrong. Please try again.',
          );
        }
      } finally {
        setDownloading(false);
      }
    });
  }, [url]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.85}>
              <CloseIcon size={moderateScale(22)} color={colors.muted} />
            </TouchableOpacity>
          </View>

          {url ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode
                  value={url}
                  size={scale(220)}
                  backgroundColor={colors.white}
                  color={colors.navy}
                  getRef={ref => {
                    qrRef.current = ref;
                  }}
                />
              </View>
              <Text style={styles.url} selectable numberOfLines={3}>
                {url}
              </Text>
              <GradientButton
                title="Download"
                onPress={onDownloadPress}
                loading={downloading}
                disabled={downloading}
                showArrow={false}
                style={styles.downloadBtn}
              />
            </>
          ) : (
            <Text style={styles.emptyText}>QR menu link is not configured.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: colors.navy,
  },
  qrWrap: {
    alignSelf: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  url: {
    textAlign: 'center',
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.muted,
    lineHeight: moderateScale(18),
    marginBottom: spacing.lg,
  },
  downloadBtn: {
    marginTop: verticalScale(4),
  },
  emptyText: {
    textAlign: 'center',
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.muted,
    paddingVertical: spacing.xl,
  },
});
