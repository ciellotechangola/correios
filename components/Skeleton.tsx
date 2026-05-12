/**
 * Componentes de Loading/Skeleton - Correios de Luanda
 * Data: 2026-04-30
 * 
 *用法:
 * import { SkeletonCard, SkeletonGrid, LoadingSpinner } from '../components/Skeleton';
 */

import React from 'react';

// ============================================
// ANIMAÇÃO CSS INLINE
// ============================================

const shimmerStyle = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton {
    background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
`;

// Injectar estilos
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = shimmerStyle;
    document.head.appendChild(style);
  }
}

// ============================================
// SKELETON: Card de Produto
// ============================================

export const SkeletonCard: React.FC = () => (
  <div className="bg-[#1e293b] rounded-2xl overflow-hidden">
    {/* Image skeleton */}
    <div className="h-32 bg-slate-800 skeleton" />
    {/* Content */}
    <div className="p-3 space-y-2">
      <div className="h-4 bg-slate-700 rounded skeleton w-3/4" />
      <div className="h-3 bg-slate-700 rounded skeleton w-1/2" />
      <div className="h-6 bg-slate-700 rounded skeleton w-1/3 mt-3" />
    </div>
  </div>
);

// ============================================
// SKELETON: Card de Loja
// ============================================

export const SkeletonStoreCard: React.FC = () => (
  <div className="bg-[#1e293b] p-3 rounded-xl border border-slate-700 flex items-center gap-3">
    <div className="w-10 h-10 bg-slate-700 rounded-full skeleton" />
    <div className="flex-1 space-y-1">
      <div className="h-4 bg-slate-700 rounded skeleton w-2/3" />
      <div className="h-3 bg-slate-700 rounded skeleton w-1/2" />
    </div>
  </div>
);

// ============================================
// SKELETON: Grid de Produtos
// ============================================

interface SkeletonGridProps {
  count?: number;
  columns?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count = 6, 
  columns = 2 
}) => (
  <div className={`grid grid-cols-${columns} gap-4`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// ============================================
// SKELETON: Lista de Lojas
// ============================================

interface SkeletonStoreListProps {
  count?: number;
}

export const SkeletonStoreList: React.FC<SkeletonStoreListProps> = ({ count = 4 }) => (
  <div className="flex gap-3 overflow-x-auto no-scrollbar">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="min-w-[200px]">
        <SkeletonStoreCard />
      </div>
    ))}
  </div>
);

// ============================================
// SKELETON: Barra de Busca
// ============================================

export const SkeletonSearchBar: React.FC = () => (
  <div className="h-12 bg-[#1e293b] rounded-full skeleton" />
);

// ============================================
// SKELETON: Perfil de Usuário
// ============================================

export const SkeletonUserProfile: React.FC = () => (
  <div className="flex items-center gap-4 p-4">
    <div className="w-16 h-16 bg-slate-700 rounded-full skeleton" />
    <div className="flex-1 space-y-2">
      <div className="h-5 bg-slate-700 rounded skeleton w-1/2" />
      <div className="h-3 bg-slate-700 rounded skeleton w-1/3" />
    </div>
  </div>
);

// ============================================
// SKELETON: Card de Pedido
// ============================================

export const SkeletonOrderCard: React.FC = () => (
  <div className="bg-[#1e293b] rounded-xl p-4 space-y-3">
    <div className="flex justify-between">
      <div className="h-4 bg-slate-700 rounded skeleton w-1/3" />
      <div className="h-4 bg-slate-700 rounded skeleton w-1/4" />
    </div>
    <div className="h-3 bg-slate-700 rounded skeleton w-2/3" />
    <div className="flex gap-2">
      <div className="w-12 h-12 bg-slate-700 rounded-lg skeleton" />
      <div className="w-12 h-12 bg-slate-700 rounded-lg skeleton" />
    </div>
    <div className="h-5 bg-slate-700 rounded skeleton w-1/4" />
  </div>
);

// ============================================
// LOADING SPINNER
// ============================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  color = 'border-blue-500',
  text
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full animate-spin`} />
      {text && (
        <p className="text-slate-400 text-sm">{text}</p>
      )}
    </div>
  );
};

// ============================================
// LOADING PAGE COMPLETA
// ============================================

export const LoadingPage: React.FC<{ title?: string }> = ({ title }) => (
  <div className="bg-[#0f172a] min-h-screen flex flex-col items-center justify-center p-4">
    <LoadingSpinner size="lg" text={title || 'Carregando...'} />
  </div>
);

// ============================================
// SKELETON PAGE (Layout completo)
// ============================================

export const SkeletonPage: React.FC = () => (
  <div className="bg-[#0f172a] min-h-screen pb-20 p-4 space-y-6">
    {/* Search bar */}
    <div className="h-12 bg-[#1e293b] rounded-full skeleton" />
    
    {/* Title row */}
    <div className="flex justify-between items-center">
      <div className="h-6 bg-slate-700 rounded skeleton w-1/3" />
      <div className="h-10 w-10 bg-slate-700 rounded-lg skeleton" />
    </div>
    
    {/* Brand circles */}
    <div className="flex gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-16 h-16 bg-slate-700 rounded-full skeleton" />
      ))}
    </div>
    
    {/* Section title */}
    <div className="h-5 bg-slate-700 rounded skeleton w-1/4" />
    
    {/* Horizontal scroll */}
    <div className="flex gap-4 overflow-x-auto no-scrollbar">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="min-w-[160px]">
          <SkeletonCard />
        </div>
      ))}
    </div>
    
    {/* Grid section */}
    <div className="h-5 bg-slate-700 rounded skeleton w-1/3 mt-4" />
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

// ============================================
// EXPORTAÇÕES
// ============================================

export const Skeleton = {
  Card: SkeletonCard,
  Grid: SkeletonGrid,
  StoreCard: SkeletonStoreCard,
  StoreList: SkeletonStoreList,
  SearchBar: SkeletonSearchBar,
  UserProfile: SkeletonUserProfile,
  OrderCard: SkeletonOrderCard,
  Page: SkeletonPage,
};

export default Skeleton;