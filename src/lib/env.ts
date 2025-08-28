export interface EnvConfig {
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
}

class EnvValidator {
  private getEnvVar(key: string): string {
    const value = import.meta.env[key];
    if (!value) {
      throw new Error(`Variável de ambiente ${key} é obrigatória`);
    }
    return value;
  }

  validate(): EnvConfig {
    try {
      return {
        firebase: {
          apiKey: this.getEnvVar('VITE_FIREBASE_API_KEY'),
          authDomain: this.getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
          projectId: this.getEnvVar('VITE_FIREBASE_PROJECT_ID'),
          storageBucket: this.getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
          messagingSenderId: this.getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
          appId: this.getEnvVar('VITE_FIREBASE_APP_ID'),
        },
        supabase: {
          url: this.getEnvVar('VITE_SUPABASE_URL'),
          anonKey: this.getEnvVar('VITE_SUPABASE_ANON_KEY'),
        }
      };
    } catch (error) {
      console.error('Erro na validação de variáveis de ambiente:', error);
      throw error;
    }
  }
}

export const env = new EnvValidator().validate();