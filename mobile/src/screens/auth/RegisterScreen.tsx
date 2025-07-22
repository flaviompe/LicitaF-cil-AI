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
  Checkbox,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppDispatch, useAppSelector } from '../../store';
import { register, clearError } from '../../store/slices/authSlice';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { theme, spacing } from '../../theme';

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  cnpj: string;
  agreeToTerms: boolean;
}

export function RegisterScreen() {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterForm>();

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    if (!data.agreeToTerms) {
      Alert.alert('Erro', 'Você deve aceitar os termos de uso');
      return;
    }

    dispatch(clearError());
    try {
      await dispatch(register({
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
        cnpj: data.cnpj,
      })).unwrap();
      
      navigation.navigate('VerifyEmail', { email: data.email });
    } catch (err) {
      // Error is handled by the slice
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
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
              Crie sua conta e comece a aproveitar as oportunidades
            </Paragraph>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.cardTitle}>Criar Conta</Title>
              <Paragraph style={styles.cardSubtitle}>
                Preencha os dados para criar sua conta
              </Paragraph>

              <View style={styles.form}>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: 'Nome é obrigatório',
                    minLength: {
                      value: 2,
                      message: 'Nome deve ter pelo menos 2 caracteres',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Nome completo"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={!!errors.name}
                      left={<TextInput.Icon icon="account" />}
                      style={styles.input}
                    />
                  )}
                />
                {errors.name && (
                  <HelperText type="error" visible={!!errors.name}>
                    {errors.name.message}
                  </HelperText>
                )}

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
                  name="companyName"
                  control={control}
                  rules={{
                    required: 'Nome da empresa é obrigatório',
                    minLength: {
                      value: 2,
                      message: 'Nome da empresa deve ter pelo menos 2 caracteres',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Nome da empresa"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={!!errors.companyName}
                      left={<TextInput.Icon icon="office-building" />}
                      style={styles.input}
                    />
                  )}
                />
                {errors.companyName && (
                  <HelperText type="error" visible={!!errors.companyName}>
                    {errors.companyName.message}
                  </HelperText>
                )}

                <Controller
                  name="cnpj"
                  control={control}
                  rules={{
                    required: 'CNPJ é obrigatório',
                    pattern: {
                      value: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
                      message: 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)',
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="CNPJ"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      keyboardType="numeric"
                      error={!!errors.cnpj}
                      left={<TextInput.Icon icon="card-account-details" />}
                      style={styles.input}
                      placeholder="00.000.000/0000-00"
                    />
                  )}
                />
                {errors.cnpj && (
                  <HelperText type="error" visible={!!errors.cnpj}>
                    {errors.cnpj.message}
                  </HelperText>
                )}

                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 8,
                      message: 'Senha deve ter pelo menos 8 caracteres',
                    },
                    pattern: {
                      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                      message: 'Senha deve conter pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial',
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

                <Controller
                  name="confirmPassword"
                  control={control}
                  rules={{
                    required: 'Confirmação de senha é obrigatória',
                    validate: (value) => 
                      value === password || 'As senhas não coincidem',
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="Confirmar senha"
                      mode="outlined"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      secureTextEntry={!showConfirmPassword}
                      error={!!errors.confirmPassword}
                      left={<TextInput.Icon icon="lock-check" />}
                      right={
                        <TextInput.Icon
                          icon={showConfirmPassword ? 'eye-off' : 'eye'}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                      }
                      style={styles.input}
                    />
                  )}
                />
                {errors.confirmPassword && (
                  <HelperText type="error" visible={!!errors.confirmPassword}>
                    {errors.confirmPassword.message}
                  </HelperText>
                )}

                <Controller
                  name="agreeToTerms"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <View style={styles.checkboxContainer}>
                      <Checkbox
                        status={value ? 'checked' : 'unchecked'}
                        onPress={() => onChange(!value)}
                        color={theme.colors.primary}
                      />
                      <Text style={styles.checkboxText}>
                        Eu concordo com os{' '}
                        <Text style={styles.linkText}>termos de uso</Text>
                        {' '}e{' '}
                        <Text style={styles.linkText}>política de privacidade</Text>
                      </Text>
                    </View>
                  )}
                />

                {error && (
                  <HelperText type="error" visible={!!error}>
                    {error}
                  </HelperText>
                )}

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
                    'Criar conta'
                  )}
                </Button>

                <Divider style={styles.divider} />

                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>
                    Já tem uma conta?{' '}
                  </Text>
                  <Button
                    mode="text"
                    onPress={handleLogin}
                    compact
                    labelStyle={styles.loginLink}
                  >
                    Fazer login
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkboxText: {
    flex: 1,
    marginLeft: spacing.xs,
    color: theme.colors.onSurfaceVariant,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: theme.colors.onSurfaceVariant,
  },
  loginLink: {
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