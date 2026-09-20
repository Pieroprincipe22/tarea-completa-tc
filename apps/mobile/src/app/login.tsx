import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { extractMessage, isRecord } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { DEFAULT_API_BASE } from '@/lib/session';
import { colors } from '@/lib/theme';

type LoginCompany = { companyId: string; name: string; role: string };

function asStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<LoginCompany[] | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    accessToken: string;
    userId: string;
    email: string;
    name: string;
  } | null>(null);

  async function handleSubmit() {
    setError(null);

    if (!email.trim() || !password) {
      setError('Introduce email y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${DEFAULT_API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const json: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        setError(extractMessage(json, `Error HTTP ${res.status}`));
        return;
      }

      if (!isRecord(json)) {
        setError('Respuesta inesperada del servidor.');
        return;
      }

      const accessToken = asStr(json.accessToken);
      const userId = asStr(json.userId);
      const userEmail = asStr(json.email) || email.trim().toLowerCase();
      const userName = asStr(json.name) || userEmail;

      if (!accessToken || !userId) {
        setError('Respuesta de login inválida.');
        return;
      }

      const rawCompanies = Array.isArray(json.companies) ? json.companies : [];
      const parsedCompanies: LoginCompany[] = rawCompanies
        .map((item) => {
          if (!isRecord(item)) return null;
          const companyId = asStr(item.companyId);
          const name = asStr(item.name);
          const role = asStr(item.role).toUpperCase();
          if (!companyId || !name || !role) return null;
          return { companyId, name, role };
        })
        .filter((c): c is LoginCompany => c !== null);

      if (parsedCompanies.length === 0) {
        setError('Este usuario no tiene empresas activas asignadas.');
        return;
      }

      if (parsedCompanies.length === 1) {
        await finishLogin(accessToken, userId, userEmail, userName, parsedCompanies[0]);
        return;
      }

      setPendingAuth({ accessToken, userId, email: userEmail, name: userName });
      setCompanies(parsedCompanies);
    } catch (err) {
      setError(
        err instanceof Error
          ? `No se pudo conectar con ${DEFAULT_API_BASE}: ${err.message}`
          : 'Error desconocido.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function finishLogin(
    accessToken: string,
    userId: string,
    userEmail: string,
    userName: string,
    company: LoginCompany,
  ) {
    await login({
      apiBase: DEFAULT_API_BASE,
      accessToken,
      userId,
      companyId: company.companyId,
      companyName: company.name,
      email: userEmail,
      name: userName,
      role: company.role,
    });
    router.replace('/work-orders');
  }

  if (companies && pendingAuth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Elige tu empresa</Text>
        {companies.map((c) => (
          <Pressable
            key={c.companyId}
            style={styles.companyRow}
            onPress={() =>
              void finishLogin(
                pendingAuth.accessToken,
                pendingAuth.userId,
                pendingAuth.email,
                pendingAuth.name,
                c,
              )
            }
          >
            <Text style={styles.companyName}>{c.name}</Text>
            <Text style={styles.companyRole}>{c.role}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.logoMark}>
          <Text style={styles.logoT}>T</Text>
          <Text style={styles.logoC}>C</Text>
        </View>
        <View>
          <Text style={styles.brandLine}>TECHNICAL</Text>
          <Text style={[styles.brandLine, styles.brandLineAccent]}>COMMAND</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Iniciar sesión</Text>
        <Text style={styles.subtitle}>Acceso para técnicos de campo</Text>

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tecnico@empresa.com"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor={colors.textFaint}
          secureTextEntry
          style={styles.input}
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoT: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: colors.accent,
    left: 0,
  },
  logoC: {
    position: 'absolute',
    fontSize: 34,
    fontWeight: '900',
    color: colors.accentLight,
    left: 16,
  },
  brandLine: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 1,
  },
  brandLineAccent: {
    color: colors.accentLight,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 12,
  },
  button: {
    marginTop: 20,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  companyRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  companyName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  companyRole: {
    color: colors.textMuted,
    fontSize: 12,
  },
});
