import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

/**
 * PRO-01: Provedor de Tema Whitelabel
 * Gerencia a busca do tema dinâmico e injeção de CSS Variables no :root.
 */

interface ThemeConfig {
  primary_color: string;
  background_color: string;
  text_color: string;
  logo_url: string;
  favicon_url: string;
  app_name: string;
  font_family: string;
}

interface ThemeContextType {
  theme: ThemeConfig | null;
  isLoading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTheme = async () => {
      try {
        setIsLoading(true);
        // Busca o tema baseado no domínio atual (host)
        const response = await axios.get(`${(import.meta as any).env.VITE_API_URL}/api/theme`);
        const themeData = response.data;

        setTheme(themeData);
        applyTheme(themeData);
      } catch (err: any) {
        console.error('[ThemeProvider] Falha ao carregar tema whitelabel:', err);
        setError('Falha ao carregar configurações de identidade visual.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTheme();
  }, []);

  const applyTheme = (t: ThemeConfig) => {
    const root = document.documentElement;
    
    // Injeção de CSS Variables
    root.style.setProperty('--color-primary', t.primary_color);
    root.style.setProperty('--color-background', t.background_color);
    root.style.setProperty('--color-text', t.text_color);
    root.style.setProperty('--font-family', t.font_family);

    // Atualização de Metadados
    document.title = t.app_name || 'Fluow Ai';
    
    if (t.favicon_url) {
      const link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (link) {
        link.href = t.favicon_url;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = t.favicon_url;
        document.head.appendChild(newLink);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, isLoading, error }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
