import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-rose-50 border border-rose-100 rounded-xl text-rose-500 w-full h-full min-h-[200px]">
          <AlertCircle size={32} className="mb-2" />
          <h2 className="font-bold text-sm">Erro de Exibição</h2>
          <p className="text-xs text-rose-400 mt-1 max-w-[250px] text-center">
            {this.props.fallbackMessage || 'Não foi possível carregar este componente.'}
          </p>
          <button 
            title="Tentar Novamente"
            className="mt-4 px-3 py-1 bg-white border border-rose-200 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-100 transition-colors"
            onClick={() => this.setState({ hasError: false, error: undefined })}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
