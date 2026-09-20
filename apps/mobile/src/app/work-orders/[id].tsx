import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas';

import { tcGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { enqueueAction } from '@/lib/db';
import { useSyncStatus, type WorkOrderStatusAction } from '@/lib/sync';
import { colors } from '@/lib/theme';

type WorkOrderDetail = {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  customer?: { name: string } | null;
  site?: { name: string; address: string | null } | null;
  asset?: { name: string; code: string | null } | null;
};

const NEXT_ACTIONS: Record<string, { action: WorkOrderStatusAction; label: string }[]> = {
  OPEN: [{ action: 'start', label: 'Iniciar trabajo' }],
  ASSIGNED: [{ action: 'start', label: 'Iniciar trabajo' }],
  PENDING: [{ action: 'start', label: 'Iniciar trabajo' }],
  IN_PROGRESS: [
    { action: 'done', label: 'Marcar como terminada' },
    { action: 'cancel', label: 'Cancelar' },
  ],
  DONE: [{ action: 'reopen', label: 'Reabrir' }],
  CANCELLED: [{ action: 'reopen', label: 'Reabrir' }],
};

// Redimensiona a ~1600px de ancho y comprime a calidad 0.7 antes de subir:
// evita gastar varios MB de datos móviles por foto en campo.
async function compressPhoto(uri: string): Promise<{ uri: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri };
}

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { sync } = useSyncStatus(session);

  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const signatureRef = useRef<SignatureViewRef>(null);

  const load = useCallback(async () => {
    if (!session || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tcGet<WorkOrderDetail>(session, `/work-orders/${id}`);
      if (res.code < 200 || res.code >= 300) throw new Error(`HTTP ${res.code}`);
      setDetail(res.json);
    } catch {
      setError('No se pudo cargar la orden (sin conexión o no existe).');
    } finally {
      setLoading(false);
    }
  }, [session, id]);

  useEffect(() => {
    // Carga de datos al montar/cambiar de orden — el setState real ocurre
    // después del await dentro de load(), no de forma síncrona en el efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function handleStatusAction(action: WorkOrderStatusAction, nextStatus: string) {
    if (!id) return;
    setBusy(true);
    try {
      // Optimista: la UI cambia YA, la llamada real va a la cola offline y
      // se sincroniza sola (o de inmediato, si hay red).
      setDetail((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      await enqueueAction('WORK_ORDER_STATUS', { workOrderId: id, action });
      await sync();
    } finally {
      setBusy(false);
    }
  }

  async function handleTakePhoto() {
    if (!id) return;

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Activa el permiso de cámara para adjuntar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (result.canceled || !result.assets?.[0]) return;

    setBusy(true);
    try {
      const compressed = await compressPhoto(result.assets[0].uri);
      const fileName = `wo-${id}-${Date.now()}.jpg`;

      // Copiamos a un directorio propio para que el archivo sobreviva
      // aunque el sistema limpie el caché de la cámara antes de sincronizar.
      const destFile = new File(Paths.document, fileName);
      await new File(compressed.uri).copy(destFile, { overwrite: true });

      await enqueueAction('UPLOAD_ATTACHMENT', {
        workOrderId: id,
        localUri: destFile.uri,
        fileName,
        mimeType: 'image/jpeg',
      });
      await sync();
      Alert.alert('Foto guardada', 'Se subirá sola cuando haya conexión.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveSignature(signatureBase64Png: string) {
    if (!id) return;
    setSignatureOpen(false);
    setBusy(true);
    try {
      const base64 = signatureBase64Png.replace(/^data:image\/png;base64,/, '');
      const fileName = `wo-${id}-firma-${Date.now()}.png`;
      const destFile = new File(Paths.document, fileName);
      destFile.create({ overwrite: true });
      destFile.write(base64, { encoding: 'base64' });

      await enqueueAction('UPLOAD_ATTACHMENT', {
        workOrderId: id,
        localUri: destFile.uri,
        fileName,
        mimeType: 'image/png',
      });
      await sync();
      Alert.alert('Firma guardada', 'Se subirá sola cuando haya conexión.');
    } finally {
      setBusy(false);
    }
  }

  if (loading && !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accentLight} size="large" />
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!detail) return null;

  const nextActions = NEXT_ACTIONS[detail.status] ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.code}>{detail.code ?? '—'}</Text>
      <Text style={styles.title}>{detail.title}</Text>

      {detail.customer?.name ? (
        <Text style={styles.meta}>
          {detail.customer.name}
          {detail.site?.name ? ` · ${detail.site.name}` : ''}
        </Text>
      ) : null}

      {detail.asset?.name ? (
        <Text style={styles.meta}>Activo: {detail.asset.name}</Text>
      ) : null}

      {detail.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Descripción</Text>
          <Text style={styles.description}>{detail.description}</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Estado</Text>
        <View style={styles.actionsRow}>
          {nextActions.map((a) => (
            <Pressable
              key={a.action}
              disabled={busy}
              style={[styles.actionButton, busy && styles.actionButtonDisabled]}
              onPress={() =>
                void handleStatusAction(
                  a.action,
                  a.action === 'start'
                    ? 'IN_PROGRESS'
                    : a.action === 'done'
                      ? 'DONE'
                      : a.action === 'cancel'
                        ? 'CANCELLED'
                        : 'PENDING',
                )
              }
            >
              <Text style={styles.actionButtonText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Evidencia</Text>
        <View style={styles.actionsRow}>
          <Pressable
            disabled={busy}
            style={[styles.secondaryButton, busy && styles.actionButtonDisabled]}
            onPress={() => void handleTakePhoto()}
          >
            <Text style={styles.secondaryButtonText}>📷 Tomar foto</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            style={[styles.secondaryButton, busy && styles.actionButtonDisabled]}
            onPress={() => setSignatureOpen(true)}
          >
            <Text style={styles.secondaryButtonText}>✍️ Firma del cliente</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={signatureOpen} animationType="slide">
        <View style={styles.signatureModal}>
          <Text style={styles.signatureTitle}>Firma del cliente</Text>
          <View style={styles.signatureCanvas}>
            <SignatureScreen
              ref={signatureRef}
              onOK={(sig) => void handleSaveSignature(sig)}
              onEmpty={() => Alert.alert('Falta firmar', 'Dibuja la firma antes de guardar.')}
              descriptionText=""
              webStyle=".m-signature-pad--footer { display: none; margin: 0; }"
              backgroundColor="#ffffff"
            />
          </View>
          <View style={styles.signatureActions}>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => signatureRef.current?.clearSignature()}
            >
              <Text style={styles.secondaryButtonText}>Borrar</Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => signatureRef.current?.readSignature()}
            >
              <Text style={styles.actionButtonText}>Guardar firma</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setSignatureOpen(false)}>
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.secondaryButtonText}>← Volver a mis órdenes</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  error: {
    color: colors.danger,
    textAlign: 'center',
  },
  code: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  backButton: {
    marginTop: 36,
    alignSelf: 'flex-start',
  },
  signatureModal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  signatureTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  signatureCanvas: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  signatureActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
});
