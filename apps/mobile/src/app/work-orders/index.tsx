import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { normalizeList, tcGet } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cacheWorkOrders, getCachedWorkOrders } from '@/lib/db';
import { useSyncStatus } from '@/lib/sync';
import { colors } from '@/lib/theme';

type WorkOrder = {
  id: string;
  code: string | null;
  title: string;
  status: string;
  priority: string;
  customer?: { name: string } | null;
  site?: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: 'Abierta',
  ASSIGNED: 'Asignada',
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  DONE: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  OPEN: colors.textMuted,
  ASSIGNED: colors.accentLight,
  PENDING: colors.warning,
  IN_PROGRESS: colors.accent,
  DONE: colors.success,
  CANCELLED: colors.danger,
};

export default function WorkOrdersScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const { pendingCount, isOnline, sync } = useSyncStatus(session);

  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);

    try {
      const res = await tcGet(
        session,
        `/work-orders?assignedToId=${encodeURIComponent(session.userId)}&pageSize=50`,
      );

      if (res.code < 200 || res.code >= 300) {
        throw new Error(`HTTP ${res.code}`);
      }

      const { items: list } = normalizeList<WorkOrder>(res.json);
      setItems(list);
      setFromCache(false);
      await cacheWorkOrders(list);
    } catch {
      // Sin red: mostramos lo último que se guardó en SQLite.
      const cached = await getCachedWorkOrders<WorkOrder>();
      if (cached.length > 0) {
        setItems(cached);
        setFromCache(true);
      } else {
        setError('No se pudo cargar y no hay datos guardados sin conexión.');
      }
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void sync();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.statusBar}>
        <Text style={[styles.statusText, { color: isOnline ? colors.success : colors.warning }]}>
          {isOnline ? '● En línea' : '○ Sin conexión'}
        </Text>
        {pendingCount > 0 ? (
          <Pressable onPress={() => void sync()}>
            <Text style={styles.pendingText}>
              {pendingCount} cambio{pendingCount === 1 ? '' : 's'} pendiente
              {pendingCount === 1 ? '' : 's'} — toca para reintentar
            </Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => void logout().then(() => router.replace('/login'))}>
          <Text style={styles.logout}>Salir</Text>
        </Pressable>
      </View>

      {fromCache ? (
        <Text style={styles.cacheNotice}>
          Mostrando datos guardados (sin conexión). Se actualizará solo al reconectar.
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accentLight} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No tienes órdenes de trabajo asignadas.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/work-orders/[id]', params: { id: item.id } })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardCode}>{item.code ?? '—'}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${STATUS_COLOR[item.status] ?? colors.textMuted}22` },
                ]}
              >
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] ?? colors.textMuted }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {item.customer?.name ? (
              <Text style={styles.cardMeta}>{item.customer.name}{item.site?.name ? ` · ${item.site.name}` : ''}</Text>
            ) : null}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pendingText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  logout: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cacheNotice: {
    fontSize: 12,
    color: colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    padding: 16,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCode: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
