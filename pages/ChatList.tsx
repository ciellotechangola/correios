import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  ArrowLeft, MessageSquare, ChevronRight, Store as StoreIcon, Search, 
  Phone, PhoneCall, Trash2, User, Users, Plus, X, CheckCircle, MoreVertical,
  MessageCircle, Send, Camera
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ChatConversation {
  id: string;
  loja_id: string;
  loja_nome: string;
  loja_logo: string;
  ultima_mensagem: string;
  hora: string;
  nao_lida: number;
  isOnline: boolean;
}

interface ContactItem {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  foto: string;
  role: string;
  telefone?: string;
}

export const ChatList: React.FC = () => {
  const { goBack, selectChatStore, stores: STORES, user, theme, setView } = useApp();
  const [chatStores, setChatStores] = useState<ChatConversation[]>([]);
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const isVendor = user?.role === 'VENDEDOR';
  const isCliente = user?.role === 'CLIENTE';

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Carregar conversas existentes
      await loadConversations();
      
      // Carregar contactos
      await loadContacts();
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!user) return;

    try {
      // Buscar mensagens únicas por loja
      const { data: messagesData, error } = await supabase
        .from('mensagens')
        .select(`
          *,
          lojas (id, nome, logo)
        `)
        .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar por loja
      const groupedChats: Record<string, ChatConversation> = {};
      
      if (messagesData) {
        messagesData.forEach(msg => {
          const lojaId = msg.loja_id;
          if (!groupedChats[lojaId]) {
            groupedChats[lojaId] = {
              id: msg.id,
              loja_id: msg.loja_id,
              loja_nome: msg.lojas?.nome || 'Loja',
              loja_logo: msg.lojas?.logo || 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png',
              ultima_mensagem: msg.conteudo,
              hora: new Date(msg.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' }),
              nao_lida: msg.destinatario_id === user.id && !msg.lida ? 1 : 0,
              isOnline: true,
            };
          }
        });
      }

      // Se não há mensagens, mostrar lojas disponíveis
      if (Object.keys(groupedChats).length === 0 && isCliente) {
        // Mostrar todas as lojas para cliente iniciar.chat
        const availableStores = STORES.slice(0, 5).map(store => ({
          id: store.id,
          loja_id: store.id,
          loja_nome: store.name,
          loja_logo: store.logo,
          ultima_mensagem: 'Iniciar conversa...',
          hora: '--:--',
          nao_lida: 0,
          isOnline: store.isOpen,
        }));
        setChatStores(availableStores);
      } else {
        setChatStores(Object.values(groupedChats));
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    }
  };

  const loadContacts = async () => {
    if (!user) return;

    try {
      if (isVendor) {
        // Vendedor: carregar clientes que compraram
        const { data: clientesData } = await supabase
          .from('pedidos')
          .select(`
            profiles (id, nome, email, avatar_url)
          `)
          .eq('loja_id', user.storeId)
          .order('created_at', { ascending: false });

        if (clientesData) {
          const uniqueClientes = new Map();
          clientesData.forEach(p => {
            if (p.profiles && !uniqueClientes.has(p.profiles.id)) {
              uniqueClientes.set(p.profiles.id, {
                id: p.profiles.id,
                user_id: p.profiles.id,
                nome: p.profiles.nome || 'Cliente',
                email: p.profiles.email,
                foto: p.profiles.avatar_url || `https://i.pravatar.cc/150?u=${p.profiles.id}`,
                role: 'CLIENTE',
              });
            }
          });
          setContacts(Array.from(uniqueClientes.values()));
        }
      } else if (isCliente) {
        // Cliente: carregar vendedores
        const { data: vendedoresData } = await supabase
          .from('lojas')
          .select(`
            owner_id,
            profiles (id, nome, email, avatar_url, telefone)
          `)
          .order('nome');

        if (vendedoresData) {
          setContacts(vendedoresData.map(v => ({
            id: v.profiles?.id || v.owner_id,
            user_id: v.owner_id,
            nome: v.profiles?.nome || 'Vendedor',
            email: v.profiles?.email || '',
            foto: v.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${v.owner_id}`,
            role: 'VENDEDOR',
            telefone: v.profiles?.telefone,
          })));
        }
      } else {
        // Admin ou Entregador
        const { data: allUsers } = await supabase
          .from('profiles')
          .select('*')
          .order('nome')
          .limit(20);

        if (allUsers) {
          setContacts(allUsers.filter(u => u.id !== user.id).map(u => ({
            id: u.id,
            user_id: u.id,
            nome: u.nome || u.email.split('@')[0],
            email: u.email,
            foto: u.avatar_url || `https://i.pravatar.cc/150?u=${u.id}`,
            role: u.role,
            telefone: u.telefone,
          })));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar contactos:', error);
    }
  };

  const deleteConversation = async (lojaId: string) => {
    if (!user) return;

    try {
      // Eliminar mensagens dessa conversa
      const { error } = await supabase
        .from('mensagens')
        .delete()
        .eq('loja_id', lojaId)
        .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`);

      if (error) throw error;

      // Atualizar UI
      setChatStores(prev => prev.filter(c => c.loja_id !== lojaId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Erro ao eliminar conversa:', error);
    }
  };

  const addToContacts = async (contact: ContactItem) => {
    if (!user) return;

    try {
      await supabase
        .from('contactos')
        .upsert({
          user_id: user.id,
          contacto_id: contact.user_id,
          nome_tipo: contact.role,
        }, {
          onConflict: 'user_id,contacto_id'
        });

      alert('Contato adicionado!');
      loadContacts();
    } catch (error) {
      console.error('Erro ao adicionar contacto:', error);
    }
  };

  const handleCall = (contact: ContactItem) => {
    if (contact.telefone) {
      window.location.href = `tel:${contact.telefone}`;
    } else {
      alert('Número não disponível');
    }
  };

  const startChat = (store: ChatConversation | ContactItem) => {
    const storeData = STORES.find(s => s.id === store.loja_id);
    if (storeData) {
      selectChatStore(storeData);
    } else {
      // Para contactos que não são lojas
      const novaLoja = {
        id: store.loja_id || store.user_id,
        name: store.loja_nome || store.nome,
        nif: '',
        niche: 'Universal' as const,
        rating: 0,
        reviewCount: 0,
        address: 'Luanda',
        distance: 'N/A',
        lat: -8.839988,
        lng: 13.289437,
        isOpen: true,
        coverImage: '',
        logo: store.loja_logo || store.foto,
      };
      selectChatStore(novaLoja);
    }
  };

  const filteredChats = chatStores.filter(c => 
    c.loja_nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} flex flex-col`}>
      {/* Header */}
      <div className={`${theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 backdrop-blur`}>
        <div className="flex items-center p-4 gap-3">
          <button onClick={goBack} className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} p-1 -ml-2`}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} flex-1`}>Mensagens</h1>
          <button 
            onClick={() => setView('chat')}
            className={`${theme === 'dark' ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'} p-2 rounded-full`}
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pb-3 gap-4">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
              activeTab === 'chats'
                ? 'bg-blue-600 text-white'
                : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <MessageCircle size={16} />
            Conversas
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
              activeTab === 'contacts'
                ? 'bg-blue-600 text-white'
                : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            <Users size={16} />
            Contactos
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          } border`}>
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className={`flex-1 bg-transparent text-sm ${theme === 'dark' ? 'text-white placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'} focus:outline-none`}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X size={16} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'chats' ? (
          <div className="space-y-3">
            {filteredChats.length === 0 ? (
              <div className="text-center py-12">
                <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <MessageSquare size={32} className="text-slate-500" />
                </div>
                <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-medium mb-1`}>Nenhuma conversa</h3>
                <p className="text-slate-400 text-sm">
                  {isCliente ? 'Entre em contacto com uma loja para começar.' : 'Aguarde mensagens dos seus clientes.'}
                </p>
              </div>
            ) : (
              filteredChats.map(chat => (
                <div key={chat.loja_id} className="relative">
                  {showDeleteConfirm === chat.loja_id && (
                    <div className="absolute right-0 top-0 bottom-0 flex items-center z-10">
                      <button
                        onClick={() => deleteConversation(chat.loja_id)}
                        className="bg-red-600 text-white px-4 h-full rounded-r-xl flex items-center gap-2"
                      >
                        <Trash2 size={18} />
                        Eliminar
                      </button>
                    </div>
                  )}
                  <button 
                    onLongPress={() => setShowDeleteConfirm(chat.loja_id)}
                    onClick={() => startChat(chat)}
                    className={`w-full p-4 rounded-xl border flex items-center gap-4 text-left transition-colors ${
                      theme === 'dark' 
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    } ${showDeleteConfirm === chat.loja_id ? 'border-r-0 rounded-r-none' : ''}`}
                  >
                    <div className="relative">
                      <img src={chat.loja_logo} alt={chat.loja_nome} className="w-12 h-12 rounded-full bg-white object-contain p-1" />
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold truncate`}>{chat.loja_nome}</h3>
                        <span className="text-slate-500 text-xs">{chat.hora}</span>
                      </div>
                      <p className="text-slate-400 text-sm truncate">{chat.ultima_mensagem}</p>
                    </div>
                    {chat.nao_lida > 0 && (
                      <div className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {chat.nao_lida}
                      </div>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <div className={`w-16 h-16 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Users size={32} className="text-slate-500" />
                </div>
                <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-medium mb-1`}>Sem contactos</h3>
                <p className="text-slate-400 text-sm">Os seus contactos aparecerão aqui.</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div 
                  key={contact.user_id}
                  className={`p-4 rounded-xl border flex items-center gap-4 ${
                    theme === 'dark' 
                      ? 'bg-slate-800 border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <img 
                    src={contact.foto} 
                    alt={contact.nome} 
                    className="w-12 h-12 rounded-full bg-slate-600 object-cover"
                  />
                  <div className="flex-1">
                    <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold`}>{contact.nome}</h3>
                    <p className="text-slate-400 text-xs">{contact.role} • {contact.email}</p>
                    {contact.telefone && (
                      <p className="text-blue-400 text-xs">{contact.telefone}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {contact.telefone && (
                      <button 
                        onClick={() => handleCall(contact)}
                        className={`${theme === 'dark' ? 'bg-slate-700 text-blue-400' : 'bg-slate-100 text-blue-600'} p-2 rounded-full`}
                      >
                        <PhoneCall size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => startChat(contact)}
                      className="bg-blue-600 text-white p-2 rounded-full"
                    >
                      <MessageCircle size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};