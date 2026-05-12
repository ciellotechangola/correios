import React from 'react';
import { useApp } from '../contexts/AppContext';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../services/utils';

export const Cart: React.FC = () => {
  const { cart, removeFromCart, cartTotal, setView, goBack } = useApp();

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center relative">
        <div className="absolute top-6 left-4">
          <button onClick={goBack} className="p-2 bg-slate-800 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </button>
        </div>
        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag size={32} className="text-slate-500" />
        </div>
        <h2 className="text-white text-xl font-bold mb-2">O cesto está vazio</h2>
        <p className="text-slate-400 mb-6">Explore o mercado e encontre as melhores peças para o seu carro.</p>
        <button 
            onClick={() => setView('explore')}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
        >
            Procurar Peças
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-48 pt-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goBack} className="p-2 bg-slate-800 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-white">O Meu Cesto</h1>
      </div>
      
      <div className="space-y-4">
        {cart.map(item => (
            <div key={item.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex gap-3 items-center">
                <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center">
                    <img src={item.imageUrl} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1">
                    <h3 className="text-white text-sm font-semibold line-clamp-1">{item.name}</h3>
                    <p className="text-slate-400 text-xs mb-1">{item.brand}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-blue-400 font-bold text-sm">{formatCurrency(item.price)}</span>
                        <div className="flex items-center gap-3">
                            <span className="text-white text-xs">Qtd: {item.quantity}</span>
                            <button 
                                onClick={() => removeFromCart(item.id)}
                                className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-8 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
        <div className="flex justify-between mb-2">
            <span className="text-slate-400 text-sm">Subtotal</span>
            <span className="text-white text-sm">{formatCurrency(cartTotal)}</span>
        </div>
        <div className="flex justify-between mb-2">
            <span className="text-slate-400 text-sm">Taxa de Serviço</span>
            <span className="text-white text-sm">{formatCurrency(2500)}</span>
        </div>
        <div className="border-t border-slate-700 my-3 pt-3 flex justify-between">
            <span className="text-white font-bold">Total</span>
            <span className="text-blue-400 font-bold text-lg">{formatCurrency(cartTotal + 2500)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <div className="fixed bottom-20 left-4 right-4 z-20">
        <button 
            onClick={() => setView('checkout')}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40 active:scale-95 transition-all"
        >
            Finalizar Pedido <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
};