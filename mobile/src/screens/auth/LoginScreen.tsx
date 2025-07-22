import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '../../store';
import { login, clearError } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { theme, spacing } from '../../theme';

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

interface LoginForm {
  email: string;
  password: string;
}

export function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    dispatch(clearError());
    try {
      await dispatch(login(data)).unwrap();
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Ionicons 
              name="business" 
              size={64} 
              color={theme.colors.primary} 
            />
            <Title style={styles.title}>LicitaFácil Pro</Title>
            <Paragraph style={styles.subtitle}>
              Sua plataforma para licitações públicas
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Entrar</Title>
              <Paragraph style={styles.cardSubtitle}>
                Faça login para acessar sua conta
              </Paragraph>

              <View style={styles.form}>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: 'Email é obrigatório',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Email inválido',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Email"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      error={!!errors.email}
                      left={<TextInput.Icon icon="email" />}
                      style={styles.input}
                    />
                  )}
                />
                {errors.email && (
                  <HelperText type="error" visible={!!errors.email}>
                    {errors.email.message}
                  </HelperText>
                )}

                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 6,
                      message: 'Senha deve ter pelo menos 6 caracteres',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Senha"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      secureTextEntry={!showPassword}
                      error={!!errors.password}
                      left={<TextInput.Icon icon="lock" />}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? 'eye-off' : 'eye'}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                      style={styles.input}
                    />
                  )}
                />
                {errors.password && (
                  <HelperText type="error" visible={!!errors.password}>
                    {errors.password.message}
                  </HelperText>
                )}

                {error && (
                  <HelperText type="error" visible={!!error}>
                    {error}
                  </HelperText>
                )}

                <Button
                  mode="text"
                  onPress={handleForgotPassword}
                  style={styles.forgotPassword}
                  labelStyle={styles.forgotPasswordText}
                >
                  Esqueci minha senha
                </Button>

                <Button
                  mode="contained"
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  style={styles.submitButton}
                  contentStyle={styles.submitButtonContent}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    'Entrar'
                  )}
                </Button>

                <Divider style={styles.divider} />

                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>
                    Não tem uma conta?{' '}
                  </Text>
                  <Button
                    mode="text"
                    onPress={handleRegister}
                    compact
                    labelStyle={styles.registerLink}
                  >
                    Criar conta
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Paragraph style={styles.footerText}>
              © 2024 LicitaFácil Pro. Todos os direitos reservados.
            </Paragraph>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  submitButtonContent: {
    height: 48,
  },
  divider: {
    marginVertical: spacing.md,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: theme.colors.onSurfaceVariant,
  },
  registerLink: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
});