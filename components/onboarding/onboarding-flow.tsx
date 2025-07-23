import React from 'react';

interface User {
  id: string;
  name: string | null;
  email: string;
  company: any;
  certificates: any[];
}

interface OnboardingFlowProps {
  user: User;
}

export function OnboardingFlow(props: OnboardingFlowProps) {
  return React.createElement('div', { 
    style: { padding: '20px', textAlign: 'center' }
  }, 
    React.createElement('h1', { style: { fontSize: '24px' } }, 'Configuração da Conta'),
    React.createElement('p', null, `Bem-vindo ${props.user.name || props.user.email}`),
    React.createElement('button', { 
      style: { padding: '10px 20px', marginTop: '20px' }
    }, 'Continuar')
  );
}