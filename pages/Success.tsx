// pages/Success.tsx — Página de sucesso com tracking
import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { supabase } from '../services/supabaseClient';
import { CheckCircle, Home, MapPin, Navigation, Package, Truck } from 'lucide-react';

export const Success: React.FC = () => {
  const { setView, orders, user } = useApp();
  const [ultimoPedido, setUltimoPedido] = useState<any>(null);

  useEffect(() => {
    // Buscar o pedido mais recente do usuário
    const buscarPedidoRecente = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('pedidos')
        .select('*, lojas(nome, lat, lng, latitude, longitude)')
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data) {
        setUltimoPedido(data);
      }
    };

    buscarPedidoRecente();
  }, [user]);

  const handleAcompanhar = () => {
    if (ultimoPedido) {
      // Passar o ID do pedido para o OrderTrackingMap
      (window as any).__trackingPedidoId = ultimoPedido.id;
      setView('order-tracking-map');
    }
  };

  const handleVerNoMapa = () => {
    if (ultimoPedido) {
      // Passar o ID do pedido para o OrderTrackingMap
      (window as any).__trackingPedidoId = ultimoPedido.id;
      setView('order-tracking-map');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
      {/* Confirmação animada */}
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
        <CheckCircle size={48} className="text-green-500" />
      </div>
      
      <h1 className="text-2xl font-bold text-white mb-2">Pedido Confirmado!</h1>
      <p className="text-slate-400 mb-6 max-w-xs mx-auto">
        {ultimoPedido?.tipo_entrega === 'ENTREGA' 
          ? 'O entregador está a caminho! Acompanhe em tempo real.'
          : 'A loja já recebeu o seu pedido. Vá buscar quando estiver pronto.'}
      </p>

      {/* Card do Pedido */}
      {ultimoPedido && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 w-full max-w-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Código de Rastreio</p>
              <p className="text-white font-mono text-lg tracking-widest">
                {ultimoPedido.codigo_rastreamento || ultimoPedido.id?.slice(0, 12).toUpperCase() || 'CL-XXXXXX'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Valor</p>
              <p className="text-green-500 font-bold text-lg">
                {new Intl.NumberFormat('pt-AO', {
                  style: 'currency',
                  currency: 'AOA',
                }).format(ultimoPedido.valor_total)}
              </p>
            </div>
          </div>
          
          {/* Tipo de entrega */}
          <div className={`flex items-center gap-2 p-2 rounded-lg ${
            ultimoPedido.tipo_entrega === 'ENTREGA' 
              ? 'bg-orange-500/20 text-orange-400' 
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {ultimoPedido.tipo_entrega === 'ENTREGA' ? (
              <>
                <Truck size={16} />
                <span className="text-sm">Entrega com entregador</span>
              </>
            ) : (
              <>
                <Package size={16} />
                <span className="text-sm">Retirada na loja</span>
              </>
            )}
          </div>

          {/* Endereço de entrega (se houver) */}
          {ultimoPedido.endereco_entrega && (
            <div className="mt-3 p-2 bg-slate-700/50 rounded-lg flex items-start gap-2">
              <MapPin size={14} className="text-slate-400 mt-0.5" />
              <p className="text-xs text-slate-300 text-left">{ultimoPedido.endereco_entrega}</p>
            </div>
          )}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="w-full max-w-sm space-y-3">
        {/* Tracking em tempo real */}
        {ultimoPedido?.tipo_entrega === 'ENTREGA' && (
          <button 
            onClick={handleAcompanhar}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Navigation size={18} />
            Acompanhar em Tempo Real
          </button>
        )}

        {/* Ver no mapa */}
        <button 
          onClick={handleVerNoMapa}
          className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700"
        >
          <MapPin size={18} />
          Ver Detalhes no Mapa
        </button>

        {/* Voltar ao início */}
        <button 
          onClick={() => setView('home')}
          className="w-full py-3 text-slate-400 text-sm flex items-center justify-center gap-2 hover:text-white transition-colors"
        >
          <Home size={16} />
          Voltar ao Início
        </button>
      </div>

      {/* Status do pedido */}
      <div className="mt-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 text-emerald-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-sm">Pedido confirmado e em processamento</span>
        </div>
      </div>
    </div>
  );
};

export default Success;