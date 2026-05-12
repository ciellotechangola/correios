// pages/Checkout.tsx — Schema V4 compliant
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, CreditCard, Truck, MapPin, CheckCircle, Store, Loader2 } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { criarPedido, adicionarPedidoItem } from '../services/database';
import type { TipoEntrega } from '../types';

export const Checkout: React.FC = () => {
  const { goBack, cartTotal, clearCart, setView, cart, stores: STORES, user, selectedStore } = useApp();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'multicaixa' | 'cash'>('multicaixa');
  const [tipoEntrega, setTipoEntrega] = useState<TipoEntrega>('RETIRADA');
  const [enderecoEntrega, setEnderecoEntrega] = useState('');
  const [error, setError] = useState('');

  const store = selectedStore || STORES.find(s => s.id === cart[0]?.storeId) || STORES[0];

  const handlePay = async () => {
    if (!user || cart.length === 0 || !store) {
      setError('Dados incompletos');
      return;
    }

    if (tipoEntrega === 'ENTREGA' && !enderecoEntrega.trim()) {
      setError('Informe o endereço de entrega');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Criar pedido com validação de loja ativa
      const result = await criarPedido(
        user.id,
        store.id,
        cartTotal + (tipoEntrega === 'ENTREGA' ? 2500 : 0),
        tipoEntrega,
        tipoEntrega === 'ENTREGA' ? enderecoEntrega : undefined
      );

      if (result.success && result.pedido_id) {
        // Adicionar itens do pedido
        for (const item of cart) {
          await adicionarPedidoItem({
            pedido_id: result.pedido_id,
            produto_id: item.id,
            quantidade: item.quantity,
            preco: item.price,
          });
        }

        // Limpar carrinho
        clearCart();

        // Ir para sucesso
        setView('success');
      } else {
        throw new Error('Falha ao criar pedido');
      }
    } catch (err: any) {
      console.error('Erro ao criar pedido:', err);
      setError(err.message || 'Erro ao processar pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  const taxaEntrega = tipoEntrega === 'ENTREGA' ? 2500 : 0;
  const total = cartTotal + taxaEntrega;

  return (
    <div className="min-h-screen bg-slate-900 pb-40">
      <div className="flex items-center gap-4 p-4 border-b border-slate-800">
        <button onClick={goBack} className="text-white p-1">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-white">Confirmar Pedido</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Tipo de Entrega */}
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-3">Tipo de Entrega</h3>

          <div
            className={`p-4 rounded-xl border mb-3 flex items-center gap-3 cursor-pointer transition-all ${
              tipoEntrega === 'RETIRADA' ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700'
            }`}
            onClick={() => setTipoEntrega('RETIRADA')}
          >
            <div className="bg-emerald-600/20 p-2 rounded-full text-emerald-500">
              <Store size={20} />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Retirar na Loja</p>
              <p className="text-slate-400 text-[10px]">Você busca o pedido</p>
            </div>
            {tipoEntrega === 'RETIRADA' && <CheckCircle size={18} className="text-blue-500" />}
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
              tipoEntrega === 'ENTREGA' ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700'
            }`}
            onClick={() => setTipoEntrega('ENTREGA')}
          >
            <div className="bg-orange-600/20 p-2 rounded-full text-orange-500">
              <Truck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Entrega</p>
              <p className="text-slate-400 text-[10px]">Entregador leva até você (+2.500 Kz)</p>
            </div>
            {tipoEntrega === 'ENTREGA' && <CheckCircle size={18} className="text-blue-500" />}
          </div>
        </div>

        {/* Endereço (se entrega) */}
        {tipoEntrega === 'ENTREGA' && (
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-3">Endereço de Entrega</h3>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex gap-3 items-start">
                <div className="bg-blue-600/20 p-2 rounded-full text-blue-500 mt-1">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <textarea
                    value={enderecoEntrega}
                    onChange={(e) => setEnderecoEntrega(e.target.value)}
                    placeholder="Rua, bairro, número, ponto de referência..."
                    rows={3}
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Retirada na Loja */}
        {tipoEntrega === 'RETIRADA' && (
          <div>
            <h3 className="text-slate-400 text-xs font-bold uppercase mb-3">Loja</h3>
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-3 items-center">
              <div className="bg-emerald-600/20 p-2 rounded-full text-emerald-500">
                <Store size={20} />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">{store.name}</p>
                <p className="text-slate-400 text-xs">{store.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pagamento */}
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-3">Pagamento</h3>
          <div
            className={`p-4 rounded-xl border mb-3 flex items-center gap-3 cursor-pointer transition-all ${paymentMethod === 'multicaixa' ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => setPaymentMethod('multicaixa')}
          >
            <div className="w-10 h-6 bg-blue-500 rounded flex items-center justify-center text-[8px] font-bold text-white">MCX</div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Referência Multicaixa</p>
              <p className="text-slate-400 text-[10px]">Pague no ATM ou App</p>
            </div>
            {paymentMethod === 'multicaixa' && <CheckCircle size={18} className="text-blue-500" />}
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${paymentMethod === 'cash' ? 'bg-blue-900/30 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-800 border-slate-700'}`}
            onClick={() => setPaymentMethod('cash')}
          >
            <div className="w-10 h-6 bg-green-600 rounded flex items-center justify-center text-white"><CreditCard size={12}/></div>
            <div className="flex-1">
              <p className="text-white font-medium text-sm">Pagamento na Entrega</p>
              <p className="text-slate-400 text-[10px]">TPA ou Dinheiro</p>
            </div>
            {paymentMethod === 'cash' && <CheckCircle size={18} className="text-blue-500" />}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 z-30">
        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-slate-400 text-sm">Total a pagar</span>
          <span className="text-white text-xl font-bold">{formatCurrency(total)}</span>
        </div>
        <button
          disabled={isProcessing}
          onClick={handlePay}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            'Confirmar Pedido'
          )}
        </button>
      </div>
    </div>
  );
};
