import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Settings, Package, Heart, LogOut, ChevronRight, Car, Store as StoreIcon, Save, DoorOpen, Calendar, ShoppingBag, Store as StoreLucide, Edit2, CheckCircle, AlertCircle, Star, MessageCircle, PhoneCall } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { VehicleForm } from '../components/VehicleForm';
import { formatVehicleInfo } from '../services/vehicleCompatibility';

export const Profile: React.FC = () => {
  const { user, setView, logout, updateUserCar, orders, favoriteStores, stores: STORES, toggleFavoriteStore, toggleFavoriteProduct, favoriteProducts } = useApp();
  const [isEditingCar, setIsEditingCar] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [carForm, setCarForm] = useState({
      brand: user?.car?.brand || '',
      model: user?.car?.model || '',
      year: user?.car?.year || new Date().getFullYear()
  });
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingsReceived, setRatingsReceived] = useState<any[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedRatingUser, setSelectedRatingUser] = useState<any>(null);
  const [newRating, setNewRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  useEffect(() => {
    if (user) {
      setCarForm({
        brand: user.car?.brand || '',
        model: user.car?.model || '',
        year: user.car?.year || new Date().getFullYear()
      });
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Carregar pedidos do usuário
      const { data: ordersData } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false });
      
      if (ordersData) {
        setUserOrders(ordersData);
      }

      // Carregar favoritos
      const { data: favData } = await supabase
        .from('favoritos')
        .select('loja_id, produto_id')
        .eq('profile_id', user.id);
      
      if (favData) {
        setFavoriteItems(favData);
      }

      // Carregar avaliações recebidas (schema: avaliacoes)
      if (user.role === 'VENDEDOR') {
        try {
          // Schema correto: avaliacoes com profile_id, loja_id, nota, comentario
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('avaliacoes')
            .select('*')
            .eq('loja_id', user.storeId)  // loja do vendedor
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (!ratingsError && ratingsData) {
            setRatingsReceived(ratingsData);
          }
        } catch (e) {
          console.log('Avaliacoes não disponível');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRatingToUser = async () => {
    if (!user || !selectedRatingUser) return;

    try {
      // Schema correto: avaliacoes
      await supabase
        .from('avaliacoes')
        .insert({
          profile_id: user.id,          // quem avalia
          loja_id: selectedRatingUser.id, // loja avaliada
          nota: newRating,               // campo: nota (não estrelas)
          comentario: ratingComment || null,
        });

      alert('Avaliação enviada! ⭐');
      setShowRatingModal(false);
      setNewRating(5);
      setRatingComment('');
      loadUserData();
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
    }
  };

  const openRatingModal = (ratingUser: any) => {
    setSelectedRatingUser(ratingUser);
    setShowRatingModal(true);
  };

  if (!user) return null;

  const myStore = user.role === 'VENDEDOR' ? STORES.find(s => s.id === user.storeId) : null;

  const handleSaveCar = async (vehicle: any) => {
    await updateUserCar(vehicle);
    setIsEditingCar(false);
    loadUserData();
  };

  // Order stats - usando dados reais do Supabase
  const inProgressOrders = userOrders.filter(o => 
    o.status === 'PENDENTE' || o.status === 'PREPARANDO' || o.status === 'EM_ROTA'
  ).length;
  
  const completedOrders = userOrders.filter(o => 
    o.status === 'ENTREGUE' || o.status === 'PAGO'
  ).length;
  
  const canceledOrders = userOrders.filter(o => o.status === 'CANCELADO').length;
  const totalOrders = userOrders.length;

  // Favorites stats
  const favoriteStoresCount = favoriteItems.filter(f => f.loja_id).length;
  const favoriteProductsCount = favoriteItems.filter(f => f.produto_id).length;

  // Calculate average rating (schema: avaliacoes usa campo 'nota')
  const avgRating = ratingsReceived.length > 0 
    ? ratingsReceived.reduce((acc, r) => acc + (r.nota || 0), 0) / ratingsReceived.length 
    : 0;

  const menuItems = [
{
       icon: Package,
       label: 'Meus Pedidos',
       sub: `${inProgressOrders} em curso, ${completedOrders} concluídos`,
       badge: inProgressOrders > 0 ? inProgressOrders : undefined,
       action: () => {
         loadUserData();
         setView('orders');
       }
     },
     {
       icon: MessageCircle,
       label: 'Mensagens',
       sub: 'Chat com lojas e clientes',
       action: () => setView('chat-list')
     },
     {
       icon: Heart,
       label: 'Favoritos',
       sub: `${favoriteStoresCount} lojas, ${favoriteProductsCount} produtos`,
       action: () => setView('favorites')
     },
     {
       icon: Settings,
       label: 'Configurações',
       sub: 'Notificações, Privacidade, Preferências',
       action: () => setView('settings')
     },
  ];

  // Menu adicional para vendedor (avaliações)
  const vendorMenuItems = user.role === 'VENDEDOR' && ratingsReceived.length > 0 ? [
    {
      icon: Star,
      label: 'Avaliações',
      sub: `${ratingsReceived.length} avaliações • ⭐ ${avgRating.toFixed(1)}`,
      action: () => {},
      badge: ratingsReceived.length,
    },
  ] : [];

  // Contactos shortcut
  const contactMenuItem = {
    icon: PhoneCall,
    label: 'Contactos',
    sub: 'Lista de contactos',
    action: () => setView('chat-list'),
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24 font-['Inter'] relative">
      {/* Header */}
      <div className="flex justify-between items-center p-4 sticky top-0 bg-slate-900/80 backdrop-blur z-20">
        <h1 className="text-xl font-bold text-white">Meu Perfil</h1>
        <button onClick={() => setShowLogoutConfirm(true)} className="p-2 bg-slate-800 rounded-full border border-slate-700 text-red-400 hover:bg-red-500/20 transition-colors">
          <DoorOpen size={20} />
        </button>
      </div>

      <div className="px-4 pt-4">
        {/* Profile Info Card */}
        <div className="bg-slate-800/50 rounded-3xl p-6 border border-slate-700 mb-6 shadow-lg flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-blue-600/20 to-transparent"></div>

          <div className="w-24 h-24 rounded-full border-4 border-slate-800 overflow-hidden mb-4 shadow-xl relative z-10">
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          </div>

          <h2 className="text-2xl font-bold text-white relative z-10">{user.name}</h2>
          <p className="text-slate-400 text-sm mb-3 relative z-10">{user.email}</p>

          <div className="flex gap-2 mb-6 relative z-10">
              <span className="bg-blue-600/20 text-blue-400 text-xs px-4 py-1.5 rounded-full border border-blue-500/30 font-bold tracking-wide">
                  {user.role.replace('_', ' ')}
              </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 w-full pt-6 border-t border-slate-700/50 relative z-10">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <Calendar size={14} />
                <span className="text-[10px] uppercase font-bold tracking-wider">Membro</span>
              </div>
              <span className="text-white font-bold text-sm">Desde 2024</span>
            </div>
            <div className="flex flex-col items-center border-l border-r border-slate-700/50">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <ShoppingBag size={14} />
                <span className="text-[10px] uppercase font-bold tracking-wider">Pedidos</span>
              </div>
              <span className="text-white font-bold text-sm">{totalOrders}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 text-slate-400 mb-1">
                <StoreLucide size={14} />
                <span className="text-[10px] uppercase font-bold tracking-wider">Favoritos</span>
              </div>
              <span className="text-white font-bold text-sm">{favoriteStoresCount + favoriteProductsCount}</span>
            </div>
          </div>
        </div>

        {/* Client: Vehicle Settings */}
        {user.role === 'CLIENTE' && (
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <Car size={16} className="text-emerald-400" />
                        Meu Veículo
                    </h3>
                    <button
                      onClick={() => setIsEditingCar(!isEditingCar)}
                      className="text-blue-400 text-xs font-bold flex items-center gap-1"
                    >
                        <Edit2 size={12} />
                        {isEditingCar ? 'Cancelar' : user.car ? 'Editar' : 'Adicionar'}
                    </button>
                </div>

                {isEditingCar ? (
                    <VehicleForm
                      initialData={user.car || undefined}
                      onSave={handleSaveCar}
                      onCancel={() => setIsEditingCar(false)}
                    />
                ) : (
                    <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center shadow-lg">
                            <Car size={24} className="text-white" />
                        </div>
                        <div className="flex-1">
                            {user.car ? (
                                <>
                                  <p className="text-white font-bold text-sm">{formatVehicleInfo(user.car)}</p>
                                  {user.car.vin && (
                                    <p className="text-slate-500 text-xs font-mono">VIN: {user.car.vin}</p>
                                  )}
                                  {user.car.engineType && (
                                    <p className="text-slate-400 text-xs">{user.car.engineType} • {user.car.fuel || 'Gasolina'} • {user.car.transmission || 'Manual'}</p>
                                  )}
                                </>
                            ) : (
                                <>
                                  <p className="text-white font-bold text-sm">Nenhum veículo cadastrado</p>
                                  <p className="text-slate-500 text-xs">Cadastre seu veículo para encontrar peças compatíveis</p>
                                </>
                            )}
                        </div>
                        <ChevronRight size={18} className="text-slate-600" />
                    </div>
                )}
            </div>
        )}

        {/* Seller: Store Info */}
        {user.role === 'VENDEDOR' && myStore && (
            <div className="bg-slate-800/50 rounded-2xl p-4 border border-blue-500/30 mb-6 shadow-lg shadow-blue-900/10">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-white font-bold text-sm flex items-center gap-2">
                        <StoreIcon size={16} className="text-blue-400" />
                        Minha Loja
                    </h3>
                    <button 
                      onClick={() => setView('vendor-store')}
                      className="text-blue-400 text-xs font-bold flex items-center gap-1"
                    >
                        Editar <ChevronRight size={14} />
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <img src={myStore.logo} className="w-12 h-12 bg-white rounded-lg object-contain p-1" alt={myStore.name} />
                    <div className="flex-1">
                        <p className="text-white font-bold text-sm">{myStore.name}</p>
                        <p className="text-slate-400 text-xs truncate">{myStore.address}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 flex items-center gap-1">
                              <Package size={10} /> {myStore.salesCount || 0} Vendas
                            </span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                              ★ {myStore.rating?.toFixed(1) || '0.0'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item) => (
              <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between group active:scale-95 transition-transform relative"
              >
                  <div className="flex items-center gap-4">
                      <div className="bg-slate-700 p-2.5 rounded-lg text-white group-hover:bg-blue-600 transition-colors">
                          <item.icon size={20} />
                      </div>
                      <div className="text-left">
                          <p className="text-white font-medium text-sm">{item.label}</p>
                          <p className="text-slate-500 text-xs">{item.sub}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={18} className="text-slate-500" />
                  </div>
              </button>
          ))}

{/* Avaliações Recebidas (Vendedor) */}
        {user.role === 'VENDEDOR' && ratingsReceived.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <Star size={18} className="text-yellow-500" />
              Avaliações Recentes
              <span className="text-yellow-500 text-sm ml-2">⭐ {avgRating.toFixed(1)}</span>
            </h3>
            <div className="space-y-3">
              {ratingsReceived.map((rating: any) => (
                <div key={rating.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={rating.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${rating.avaliador_id}`}
                      className="w-10 h-10 rounded-full bg-slate-700"
                    />
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{rating.profiles?.nome || 'Cliente'}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= rating.estrelas ? 'text-yellow-500 fill-current' : 'text-slate-600'}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">
                      {new Date(rating.created_at).toLocaleDateString('pt-AO')}
                    </span>
                  </div>
                  {rating.comentario && (
                    <p className="text-slate-400 text-sm">{rating.comentario}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Star size={20} className="text-yellow-500" />
                Avaliar Utilizador
              </h3>
              <div className="mb-4">
                <p className="text-slate-400 text-sm mb-2">Selecione as estrelas:</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setNewRating(star)}>
                      <Star
                        size={32}
                        className={star <= newRating ? 'text-yellow-500 fill-current' : 'text-slate-600'}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Comentário (opcional)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm mb-4 h-24 resize-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="flex-1 bg-slate-700 text-white font-bold py-3 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  onClick={submitRatingToUser}
                  className="flex-1 bg-yellow-600 text-white font-bold py-3 rounded-xl"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        <button
               onClick={() => setShowLogoutConfirm(true)}
               className="w-full bg-slate-800/50 p-4 rounded-xl border border-slate-800 flex items-center gap-4 mt-6 text-red-400 hover:bg-red-500/10 transition-colors"
           >
                <div className="bg-slate-900 p-2.5 rounded-lg">
                   <DoorOpen size={20} />
                </div>
                <span className="font-medium text-sm">Sair da Conta</span>
           </button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">Correios de Luanda v1.0.0</p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <DoorOpen size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deseja encerrar a sessão?</h3>
              <p className="text-slate-400 text-sm">
                Você precisará fazer login novamente para acessar sua conta.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 bg-slate-700 text-white font-bold py-3.5 rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
              >
                Encerrar Sessão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
