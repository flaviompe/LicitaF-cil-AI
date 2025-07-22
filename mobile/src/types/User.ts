export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  phoneNumber?: string;
  company?: Company;
  subscription?: Subscription;
  preferences?: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  phone: string;
  email: string;
  website?: string;
  sector: string;
  size: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE';
  createdAt: string;
}

export interface Subscription {
  id: string;
  plan: Plan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'MONTHLY' | 'YEARLY';
  features: string[];
  limits: {
    analyses: number;
    searches: number;
    alerts: number;
  };
}

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  alerts: {
    newOpportunities: boolean;
    deadlines: boolean;
    results: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US';
}