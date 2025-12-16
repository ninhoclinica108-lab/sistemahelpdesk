import React, { useState, useEffect, useMemo } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { 
  Ticket, User, Unit, Asset, Role, TicketStatus, TicketPriority, CommonProblem, ChatMessage, Sector, RemoteAccess
} from './types';
import { 
  LayoutDashboard, Ticket as TicketIcon, Users, FileBarChart, MonitorSmartphone, 
  Building2, MessageSquare, Sun, Moon, LogOut, Package, ShieldCheck, AlertCircle, 
  Menu, X, Trash2, Search, Edit2, Plus, Copy, Eye, EyeOff, Printer, Download, Layers, Monitor, Server, FileText, Settings, Loader2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatDateBR, generateCSV, playNotificationSound } from './utils';

// --- MOCK DATA FOR STATIC LISTS ---
const INITIAL_UNITS: Unit[] = [
  { id: '1', name: 'CLINICA NINARE', address: 'Rua das Flores, 123', phone: '(11) 9999-8888', responsible: 'Dr. Silva', status: 'Ativa' },
  { id: '2', name: 'CLINICA NINHO', address: 'Av. Paulista, 1000', phone: '(11) 3333-4444', responsible: 'Dra. Ana', status: 'Ativa' },
];

const INITIAL_SECTORS: Sector[] = [
  { id: 's1', name: 'MARKETING', unitId: '2', status: 'Ativo' },
  { id: 's2', name: 'ASSISTENCIA CLINICA', unitId: '2', status: 'Ativo' },
  { id: 's3', name: 'RECEPÇÃO', unitId: '2', status: 'Ativo' },
  { id: 's4', name: 'TERAPEUTA', unitId: '2', status: 'Ativo' },
  { id: 's5', name: 'RH', unitId: '1', status: 'Ativo' },
  { id: 's6', name: 'TI', unitId: '1', status: 'Ativo' },
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'a1', name: 'PC-001', patrimonyId: 'PAT-0001', category: 'Computador', status: 'Ativo', unitId: '1', description: 'Dell OptiPlex 3080', brand: 'Dell', model: 'OptiPlex 3080', serialNumber: 'CN12345', sectorId: 's5', acquisitionDate: '2023-01-15', value: 3500 },
  { id: 'a2', name: 'NB-001', patrimonyId: 'PAT-0002', category: 'Notebook', status: 'Ativo', unitId: '1', description: 'Lenovo ThinkPad E14', brand: 'Lenovo', model: 'ThinkPad E14', serialNumber: 'LN54321', sectorId: 's5', acquisitionDate: '2023-03-20', value: 4200 },
  { id: 'a3', name: 'IMP-001', patrimonyId: 'PAT-0003', category: 'Impressora', status: 'Ativo', unitId: '2', description: 'HP LaserJet Pro M404', brand: 'HP', model: 'LaserJet Pro M404', serialNumber: 'HP98765', sectorId: 's3', acquisitionDate: '2022-06-10', value: 1800 },
];

const INITIAL_PROBLEMS: CommonProblem[] = [
  { id: 'p1', title: 'Impressora sem papel/toner', description: 'A impressora está reportando falta de suprimentos.', priority: TicketPriority.LOW, category: 'Hardware' },
  { id: 'p2', title: 'Sem acesso à Internet', description: 'Computador conectado via cabo mas sem navegação.', priority: TicketPriority.HIGH, category: 'Rede' },
  { id: 'p3', title: 'Computador Lento', description: 'Sistema operacional demorando para responder.', priority: TicketPriority.MEDIUM, category: 'Hardware' },
];

const INITIAL_REMOTE: RemoteAccess[] = [
    { id: 'r1', name: 'PC Recepção', type: 'ANYDESK', accessId: '123 456 789', password: 'abc123', unitId: '1', status: 'Online' },
    { id: 'r2', name: 'Servidor Principal', type: 'RDP', accessId: '192.168.1.100', password: 'StrongPassword!', unitId: '1', status: 'Online' },
];


// --- APP COMPONENT ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');

  // Data State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]); // Will load profiles
  const [units, setUnits] = useState<Unit[]>(INITIAL_UNITS);
  const [sectors, setSectors] = useState<Sector[]>(INITIAL_SECTORS);
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [remoteAccesses, setRemoteAccesses] = useState<RemoteAccess[]>(INITIAL_REMOTE);
  const [problems, setProblems] = useState<CommonProblem[]>(INITIAL_PROBLEMS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Auto-detect system preference
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Check active session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setTickets([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch data when user is logged in
  useEffect(() => {
    if (currentUser) {
        fetchTickets();
        fetchUsers(); // For Admin
    }
  }, [currentUser]);

  const fetchUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        if (data) {
            setCurrentUser({
                id: data.id,
                name: data.name || 'Usuário',
                email: data.email,
                role: data.role as Role,
                unitId: data.unit_id
            });
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
    }
  };

  const fetchTickets = async () => {
      try {
          // If admin, fetch all. If user, fetch own.
          // RLS policies in Supabase handle security, but we can filter here too for performance or UI.
          let query = supabase.from('tickets').select('*').order('created_at', { ascending: false });
          
          if (currentUser?.role !== Role.ADMIN) {
             query = query.eq('requester_id', currentUser?.id);
          }

          const { data, error } = await query;
          if (error) throw error;
          
          if (data) {
              const formattedTickets: Ticket[] = data.map((t: any) => ({
                  id: t.id,
                  title: t.title,
                  description: t.description,
                  status: t.status,
                  priority: t.priority,
                  requesterId: t.requester_id,
                  unitId: t.unit_id,
                  category: t.category,
                  createdAt: t.created_at,
                  updatedAt: t.updated_at,
                  attachmentName: t.attachment_name
              }));
              setTickets(formattedTickets);
          }
      } catch (error) {
          console.error("Error fetching tickets", error);
      }
  };

  const fetchUsers = async () => {
      if (currentUser?.role !== Role.ADMIN) return;
      const { data } = await supabase.from('profiles').select('*');
      if (data) {
          const formattedUsers: User[] = data.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              unitId: u.unit_id
          }));
          setUsers(formattedUsers);
      }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name: fullName,
                    }
                }
            });
            if (error) throw error;
            alert("Cadastro realizado! Você já pode fazer login.");
            setIsSignUp(false);
        } else {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        }
    } catch (error: any) {
        setAuthError(error.message || "Erro na autenticação");
    } finally {
        setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const addTicket = async (ticket: Ticket) => {
    try {
        const { data, error } = await supabase.from('tickets').insert([{
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            requester_id: currentUser?.id,
            unit_id: ticket.unitId,
            category: ticket.category,
            sector: ticket.sector,
            attachment_name: ticket.attachmentName
        }]).select();

        if (error) throw error;

        if (data) {
            const newTicket = { ...ticket, id: data[0].id, createdAt: data[0].created_at, updatedAt: data[0].updated_at };
            setTickets(prev => [newTicket, ...prev]);
            
            if (currentUser?.role === Role.ADMIN) playNotificationSound();
            else setTimeout(() => playNotificationSound(), 500); 
        }
    } catch (error) {
        console.error("Error creating ticket:", error);
        alert("Erro ao criar chamado.");
    }
  };

  const updateTicket = async (updatedTicket: Ticket) => {
    try {
        const { error } = await supabase
            .from('tickets')
            .update({ status: updatedTicket.status, updated_at: new Date() })
            .eq('id', updatedTicket.id);

        if (error) throw error;
        setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
    } catch (error) {
        console.error("Error updating ticket", error);
    }
  };

  const deleteTicket = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta OS?")) {
      try {
          const { error } = await supabase.from('tickets').delete().eq('id', id);
          if (error) throw error;
          setTickets(prev => prev.filter(t => t.id !== id));
      } catch (error) {
          console.error("Error deleting ticket", error);
      }
    }
  };

  const addMessage = (msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
    if (!window.location.hash.includes('chat')) {
        setUnreadChatCount(prev => prev + 1);
        playNotificationSound();
    }
  };

  if (!currentUser) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-gray-900 overflow-hidden font-sans">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?q=80&w=2669&auto=format&fit=crop")' }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-tr from-gray-900/95 via-gray-900/80 to-primary-900/50"></div>

        {/* Login/Register Card */}
        <div className="relative z-10 w-full max-w-md p-6 mx-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-fade-in-up">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3 mb-6 ring-4 ring-primary-600/30">
              <ShieldCheck size={36} className="text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">HelpDesk Pro</h1>
            <p className="text-gray-300 mb-6 text-sm">{isSignUp ? "Crie sua conta para acessar" : "Entre para gerenciar seus chamados"}</p>
            
            <form onSubmit={handleAuth} className="w-full space-y-4">
              {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1 ml-1">NOME COMPLETO</label>
                    <input 
                        type="text" 
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        required={isSignUp}
                    />
                  </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 ml-1">EMAIL</label>
                <input 
                    type="email" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 ml-1">SENHA</label>
                <input 
                    type="password" 
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                />
              </div>

              {authError && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center gap-2"><AlertCircle size={16}/> {authError}</div>}

              <button 
                type="submit"
                disabled={authLoading}
                className="w-full bg-white text-gray-900 py-3.5 rounded-xl font-bold text-lg hover:bg-gray-50 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {authLoading ? <Loader2 className="animate-spin"/> : (isSignUp ? "Criar Conta" : "Entrar no Sistema")}
              </button>
            </form>

            <div className="mt-6 flex items-center gap-2 text-sm text-gray-300">
                <span>{isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}</span>
                <button onClick={() => {setIsSignUp(!isSignUp); setAuthError('');}} className="text-white font-bold hover:underline">
                    {isSignUp ? "Fazer Login" : "Cadastre-se"}
                </button>
            </div>
            
            <p className="mt-8 text-xs text-gray-500 font-medium">Versão 2.5.0 • HelpDesk System</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
        <Sidebar role={currentUser.role} onLogout={handleLogout} unreadChat={unreadChatCount} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={currentUser} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 scroll-smooth">
            <Routes>
              {currentUser.role === Role.ADMIN ? (
                <>
                  <Route path="/" element={<AdminDashboard tickets={tickets} users={users} />} />
                  <Route path="/tickets" element={<TicketManager tickets={tickets} units={units} users={users} assets={assets} sectors={sectors} updateTicket={updateTicket} addTicket={addTicket} deleteTicket={deleteTicket} currentUser={currentUser} />} />
                  <Route path="/users" element={<UserManager users={users} setUsers={setUsers} units={units} />} />
                  <Route path="/reports" element={<ReportManager tickets={tickets} units={units} />} />
                  <Route path="/remote" element={<RemoteAccessManager remoteAccesses={remoteAccesses} setRemoteAccesses={setRemoteAccesses} units={units} />} />
                  <Route path="/assets" element={<AssetManager assets={assets} setAssets={setAssets} units={units} sectors={sectors} />} />
                  <Route path="/units" element={<UnitManager units={units} setUnits={setUnits} sectors={sectors} setSectors={setSectors} />} />
                  <Route path="/chat" element={<ChatSystem currentUser={currentUser} messages={chatMessages} addMessage={addMessage} users={users} markRead={() => setUnreadChatCount(0)} />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/create-ticket" />} />
                  <Route path="/create-ticket" element={<CreateTicket currentUser={currentUser} units={units} sectors={sectors} problems={problems} addTicket={addTicket} assets={assets} />} />
                  <Route path="/my-tickets" element={<MyTickets tickets={tickets.filter(t => t.requesterId === currentUser.id)} />} />
                  <Route path="/chat" element={<ChatSystem currentUser={currentUser} messages={chatMessages} addMessage={addMessage} users={users} markRead={() => setUnreadChatCount(0)} />} />
                </>
              )}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
}

// --- SHARED UI COMPONENTS ---

const Modal = ({ title, onClose, children }: { title: string, onClose: () => void, children?: React.ReactNode }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors group">
          <X size={24} className="text-gray-500 group-hover:text-red-500 transition-colors" />
        </button>
      </div>
      <div className="p-8">{children}</div>
    </div>
  </div>
);

const SearchBar = ({ placeholder, onSearch }: { placeholder: string, onSearch: (v: string) => void }) => (
  <div className="relative w-full md:w-96 group">
    <Search className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={20} />
    <input 
      type="text" 
      placeholder={placeholder} 
      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all duration-200"
      onChange={(e) => onSearch(e.target.value)}
    />
  </div>
);

// --- ADMIN MANAGERS ---

const UserManager = ({ users, setUsers, units }: any) => {
  const [search, setSearch] = useState('');
  // Only filtering local state for display, assuming users are passed in prop
  const filteredUsers = users.filter((u: User) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gerenciar Usuários</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Controle de acesso e permissões (Baseado no Supabase Auth)</p>
        </div>
        {/* Supabase user creation is usually done via Invite or Sign up, so simple button might redirect or show instructions */}
      </div>
      <div className="card p-4">
        <SearchBar placeholder="Buscar por nome ou email..." onSearch={setSearch} />
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Função</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unidade</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredUsers.map((u: User) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="p-4 font-medium flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                    {u.name?.charAt(0) || 'U'}
                  </div>
                  <span className="text-gray-900 dark:text-gray-100">{u.name}</span>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                <td className="p-4"><span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600">{u.role}</span></td>
                <td className="p-4 text-gray-600 dark:text-gray-300">{units.find((un:Unit) => un.id === u.unitId)?.name || '-'}</td>
                <td className="p-4 flex gap-2">
                  <button className="btn-icon text-blue-500 hover:text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"><Edit2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UnitManager = ({ units, setUnits, sectors, setSectors }: any) => {
  const [activeTab, setActiveTab] = useState<'UNITS' | 'SECTORS'>('UNITS');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filteredUnits = units.filter((u: Unit) => u.name.toLowerCase().includes(search.toLowerCase()));
  const filteredSectors = sectors.filter((s: Sector) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{activeTab === 'UNITS' ? 'Unidades' : 'Setores'}</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie a estrutura organizacional</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
           <Plus size={20} /> {activeTab === 'UNITS' ? 'Nova Unidade' : 'Novo Setor'}
        </button>
      </div>

      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('UNITS')} className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'UNITS' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
           Unidades
           {activeTab === 'UNITS' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab('SECTORS')} className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'SECTORS' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
           Setores
           {activeTab === 'SECTORS' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full"></span>}
        </button>
      </div>

      <div className="card p-4">
        <SearchBar placeholder={`Buscar ${activeTab === 'UNITS' ? 'unidade' : 'setor'}...`} onSearch={setSearch} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{activeTab === 'UNITS' ? 'Unidade' : 'Setor'}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">{activeTab === 'UNITS' ? 'Endereço' : 'Unidade Vinculada'}</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Responsável</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {activeTab === 'UNITS' ? filteredUnits.map((u: Unit) => (
              <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="p-4 flex items-center gap-3 font-medium text-gray-900 dark:text-white">
                   <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-lg text-cyan-600 dark:text-cyan-400"><Building2 size={20}/></div>
                   {u.name}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{u.address}</td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{u.responsible || '-'}</td>
                <td className="p-4"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">{u.status}</span></td>
                <td className="p-4 flex gap-2">
                  <button className="btn-icon"><Edit2 size={18}/></button>
                  <button className="btn-icon text-red-500 hover:text-red-600"><Trash2 size={18}/></button>
                </td>
              </tr>
            )) : filteredSectors.map((s: Sector) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="p-4 flex items-center gap-3 font-medium text-gray-900 dark:text-white">
                   <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><Layers size={20}/></div>
                   {s.name}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 flex items-center gap-2">
                   <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">{units.find((u:Unit) => u.id === s.unitId)?.name}</span>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{s.responsible || '-'}</td>
                <td className="p-4"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">{s.status}</span></td>
                <td className="p-4 flex gap-2">
                  <button className="btn-icon"><Edit2 size={18}/></button>
                  <button className="btn-icon text-red-500 hover:text-red-600"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={activeTab === 'UNITS' ? 'Nova Unidade' : 'Novo Setor'} onClose={() => setShowModal(false)}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setShowModal(false); }}>
            <div>
               <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Nome</label>
               <input className="input-field" placeholder={activeTab === 'UNITS' ? "Ex: CLINICA CENTRAL" : "Ex: RH"} required />
            </div>
            {activeTab === 'UNITS' ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Endereço</label><input className="input-field" /></div>
                    <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Telefone</label><input className="input-field" /></div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Unidade Vinculada</label>
                <select className="input-field">
                  {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
            <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Responsável</label><input className="input-field" /></div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">Salvar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

const RemoteAccessManager = ({ remoteAccesses, setRemoteAccesses, units }: any) => {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = remoteAccesses.filter((r: RemoteAccess) => r.name.toLowerCase().includes(search.toLowerCase()) || r.accessId.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Acessos Remotos</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie credenciais e conexões</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={20} /> Novo Acesso
        </button>
      </div>

      <div className="card p-4">
        <SearchBar placeholder="Buscar por nome, ID ou unidade..." onSearch={setSearch} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Nome</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">ID de Acesso</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Senha</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Unidade</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map((r: RemoteAccess) => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="p-4">
                  <span className={`flex items-center gap-2 text-sm font-bold ${r.status === 'Online' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    <span className={`relative flex h-3 w-3`}>
                      {r.status === 'Online' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                      <span className={`relative inline-flex rounded-full h-3 w-3 ${r.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    </span>
                    {r.status}
                  </span>
                </td>
                <td className="p-4 font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                  <Monitor size={16} className="text-gray-400" /> {r.name}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${r.type === 'ANYDESK' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900' : r.type === 'RDP' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900' : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900'}`}>
                    {r.type}
                  </span>
                </td>
                <td className="p-4 flex items-center gap-2 group cursor-pointer">
                   <span className="font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">{r.accessId}</span>
                   <button className="text-gray-400 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={14}/></button>
                </td>
                <td className="p-4">
                   <div className="flex items-center gap-2 group">
                      <span className="font-mono text-gray-400 text-sm">••••••</span>
                      <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><EyeOff size={14}/></button>
                      <button className="text-gray-400 hover:text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"><Copy size={14}/></button>
                   </div>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{units.find((u:Unit) => u.id === r.unitId)?.name || '-'}</td>
                <td className="p-4 flex gap-2">
                  <button className="btn-primary py-1 px-3 text-xs flex items-center gap-1 shadow-none">
                    <Download size={14} /> Acessar
                  </button>
                  <button className="btn-icon"><Edit2 size={18} /></button>
                  <button className="btn-icon text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title="Novo Acesso Remoto" onClose={() => setShowModal(false)}>
           <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Nome</label><input className="input-field" placeholder="Ex: PC Recepção" /></div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Tipo</label>
                    <select className="input-field"><option>ANYDESK</option><option>RDP</option><option>TEAMVIEWER</option></select>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">ID / IP</label><input className="input-field" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Senha</label><input className="input-field" type="password" /></div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Unidade</label>
                <select className="input-field">
                  {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">Salvar</button>
              </div>
           </form>
        </Modal>
      )}
    </div>
  );
};

const AssetManager = ({ assets, setAssets, units, sectors }: any) => {
  const [activeTab, setActiveTab] = useState<'EQUIPMENT' | 'PATRIMONY'>('EQUIPMENT');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = assets.filter((a: Asset) => a.name.toLowerCase().includes(search.toLowerCase()) || a.patrimonyId.includes(search));

  const PatrimonyStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
       {[
         { l: 'Total de Itens', v: assets.length, c: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
         { l: 'Ativos', v: assets.filter((a:Asset) => a.status === 'Ativo').length, c: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20' },
         { l: 'Manutenção', v: assets.filter((a:Asset) => a.status === 'Manutenção').length, c: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20' },
         { l: 'Em Estoque', v: assets.filter((a:Asset) => a.status === 'Em Estoque').length, c: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800' },
       ].map((s, i) => (
         <div key={i} className={`card p-5 border-l-4 ${s.c.replace('text', 'border')} transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex justify-between items-start">
              <div>
                 <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{s.l}</p>
                 <h3 className={`text-3xl font-bold mt-1 ${s.c}`}>{s.v}</h3>
              </div>
              <div className={`p-2 rounded-lg ${s.bg} ${s.c}`}>
                 <Package size={24} />
              </div>
            </div>
         </div>
       ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{activeTab === 'EQUIPMENT' ? 'Equipamentos' : 'Controle Patrimonial'}</h1>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Inventário e gestão de ativos</p>
        </div>
        <div className="flex gap-2">
           <button className="btn-secondary flex items-center gap-2"><FileText size={18} /> CSV</button>
           <button className="btn-secondary flex items-center gap-2"><Printer size={18} /> PDF</button>
           <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
             <Plus size={20} /> {activeTab === 'EQUIPMENT' ? 'Novo Equipamento' : 'Novo Item'}
           </button>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('EQUIPMENT')} className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'EQUIPMENT' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
           Equipamentos
           {activeTab === 'EQUIPMENT' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full"></span>}
        </button>
        <button onClick={() => setActiveTab('PATRIMONY')} className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'PATRIMONY' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
           Patrimônio
           {activeTab === 'PATRIMONY' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full"></span>}
        </button>
      </div>

      {activeTab === 'PATRIMONY' && <PatrimonyStats />}

      <div className="card p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1"><SearchBar placeholder="Buscar por nome, patrimônio ou marca..." onSearch={setSearch} /></div>
        <select className="input-field w-full md:w-48"><option>Todos Tipos</option></select>
        <select className="input-field w-full md:w-48"><option>Todos Status</option></select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
             <tr>
               {activeTab === 'EQUIPMENT' ? (
                 <>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Equipamento</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Patrimônio</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Unidade</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                 </>
               ) : (
                 <>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Patrimônio</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Descrição</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Tipo</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Marca/Modelo</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Localização</th>
                   <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                 </>
               )}
               <th className="p-4 text-xs font-bold text-gray-500 uppercase">Ações</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
             {filtered.map((a: Asset) => (
               <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                 {activeTab === 'EQUIPMENT' ? (
                   <>
                     <td className="p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">
                           {a.category === 'Impressora' ? <Printer size={20}/> : a.category === 'Notebook' ? <MonitorSmartphone size={20}/> : <Monitor size={20}/>}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{a.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
                        </div>
                     </td>
                     <td className="p-4 text-gray-600 dark:text-gray-400">{a.category}</td>
                     <td className="p-4 font-mono font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded inline-block">{a.patrimonyId}</td>
                     <td className="p-4 text-gray-500 dark:text-gray-400">{units.find((u:Unit) => u.id === a.unitId)?.name || '-'}</td>
                     <td className="p-4"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">{a.status}</span></td>
                   </>
                 ) : (
                   <>
                     <td className="p-4 font-mono font-bold text-gray-700 dark:text-gray-300">{a.patrimonyId}</td>
                     <td className="p-4 font-medium text-gray-900 dark:text-white">{a.description}</td>
                     <td className="p-4 text-gray-500 dark:text-gray-400">{a.category}</td>
                     <td className="p-4 text-gray-500 dark:text-gray-400">{a.brand} / {a.model}</td>
                     <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">
                        <div className="font-medium text-gray-700 dark:text-gray-300">{units.find((u:Unit) => u.id === a.unitId)?.name}</div>
                        <div className="text-xs opacity-70">{sectors.find((s:Sector) => s.id === a.sectorId)?.name}</div>
                     </td>
                     <td className="p-4"><span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-bold border border-green-200 dark:border-green-800">{a.status}</span></td>
                   </>
                 )}
                 <td className="p-4 flex gap-2">
                    <button className="btn-icon"><Edit2 size={18}/></button>
                    <button className="btn-icon text-red-500 hover:text-red-600"><Trash2 size={18}/></button>
                 </td>
               </tr>
             ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal title={activeTab === 'EQUIPMENT' ? 'Novo Equipamento' : 'Novo Item Patrimonial'} onClose={() => setShowModal(false)}>
           <form className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
             {activeTab === 'PATRIMONY' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Nº Patrimônio *</label><input className="input-field" placeholder="Ex: PAT-001234" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Tipo *</label><input className="input-field" /></div>
                </div>
             )}
             
             {activeTab === 'EQUIPMENT' && (
                 <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Nome *</label><input className="input-field" placeholder="Ex: PC-001" /></div>
             )}

             {activeTab === 'EQUIPMENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Tipo *</label><select className="input-field"><option>Computador</option><option>Notebook</option></select></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Status</label><select className="input-field"><option>Ativo</option></select></div>
                </div>
             )}

             {activeTab === 'PATRIMONY' && (
                 <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Descrição *</label><input className="input-field" placeholder="Ex: Notebook Dell Latitude" /></div>
             )}
             
             <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Marca</label><input className="input-field" placeholder="Ex: Dell" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Modelo</label><input className="input-field" placeholder="Ex: OptiPlex" /></div>
             </div>

             {activeTab === 'PATRIMONY' && (
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Data Aquisição</label><input type="date" className="input-field" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Valor (R$)</label><input className="input-field" placeholder="0,00" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Garantia até</label><input type="date" className="input-field" /></div>
                </div>
             )}

             {activeTab === 'EQUIPMENT' && (
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Patrimônio</label><input className="input-field" /></div>
                  <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Número de Série</label><input className="input-field" /></div>
                </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Unidade</label>
                    <select className="input-field">
                       <option value="">Selecione</option>
                       {units.map((u:Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Setor</label>
                    <select className="input-field">
                       <option value="">Selecione</option>
                       {sectors.map((s:Sector) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
             </div>

             <div><label className="block text-sm font-bold mb-1.5 text-gray-700 dark:text-gray-300">Observações</label><textarea className="input-field" rows={3}></textarea></div>

             <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Criar</button>
             </div>
           </form>
        </Modal>
      )}
    </div>
  );
};

const ReportManager = ({ tickets, units }: any) => {
  const [period, setPeriod] = useState('MONTH');
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios Gerenciais</h1>
        <div className="flex gap-2">
            <button onClick={() => generateCSV(tickets, 'relatorio')} className="btn-secondary flex items-center gap-2"><FileText size={18}/> Exportar CSV</button>
            <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2"><Printer size={18}/> Imprimir</button>
        </div>
      </div>
      
      <div className="card p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Período</label>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
               {['DIA', 'SEMANA', 'MÊS'].map(p => (
                 <button 
                   key={p} 
                   onClick={() => setPeriod(p)} 
                   className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? 'bg-white dark:bg-gray-600 shadow text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                 >
                   {p}
                 </button>
               ))}
            </div>
         </div>
         <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Unidade / Filial</label>
            <select className="input-field mb-0" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
               <option value="ALL">Todas as Unidades</option>
               {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
         </div>
         <div className="flex items-end">
            <button className="w-full btn-primary h-[42px]">Filtrar Relatórios</button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="card p-6 flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
            <PieChart width={300} height={300}>
              <Pie data={[{name: 'A', value: 400}, {name: 'B', value: 300}]} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" />
              <RechartsTooltip />
            </PieChart>
            <p className="mt-4 font-medium">Atendimentos por Status</p>
         </div>
         <div className="card p-6 flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
            <BarChart width={400} height={250} data={[{name: 'TI', uv: 400}, {name: 'RH', uv: 300}]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Bar dataKey="uv" fill="#82ca9d" />
            </BarChart>
             <p className="mt-4 font-medium">Atendimentos por Categoria</p>
         </div>
      </div>
    </div>
  );
};

// --- USER PORTAL ---

const CreateTicket = ({ currentUser, units, sectors, problems, addTicket, assets }: any) => {
  const [unitId, setUnitId] = useState(currentUser.unitId || '');
  const [sectorId, setSectorId] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [fileName, setFileName] = useState<string>('');

  const availableSectors = sectors.filter((s: Sector) => s.unitId === unitId);
  const availableAssets = assets.filter((a: Asset) => a.unitId === unitId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!unitId) return alert("Selecione a Unidade");
    
    addTicket({
      // ID generated by Supabase
      title: formData.title,
      description: formData.description,
      priority: TicketPriority.MEDIUM,
      status: TicketStatus.OPEN,
      unitId,
      sector: sectors.find((s:Sector) => s.id === sectorId)?.name,
      requesterId: currentUser.id,
      category: 'Geral',
      attachmentName: fileName,
      ...formData
    });
    alert("Chamado sendo criado...");
    setFormData({});
    setFileName('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Novo Chamado</h1>
      <div className="card p-8 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
           <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Unidade</label>
                <select className="input-field" value={unitId} onChange={e => setUnitId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {units.map((u: Unit) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Problema Comum (Preenchimento Rápido)</label>
                <select className="input-field" onChange={(e) => {
                   const p = problems.find((pr:any) => pr.id === e.target.value);
                   if(p) setFormData({...formData, title: p.title, description: p.description});
                }}>
                  <option value="">Selecione um problema...</option>
                  {problems.map((p: CommonProblem) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-6">
             <div>
               <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Setor</label>
               <select className="input-field" value={sectorId} onChange={e => setSectorId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {availableSectors.map((s: Sector) => <option key={s.id} value={s.id}>{s.name}</option>)}
               </select>
             </div>
             <div>
                <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Equipamento (Opcional)</label>
                <select className="input-field" onChange={e => setFormData({...formData, equipmentId: e.target.value})}>
                   <option value="">Selecione...</option>
                   {availableAssets.map((a:Asset) => <option key={a.id} value={a.id}>{a.name} - {a.description}</option>)}
                </select>
             </div>
           </div>

           <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Título</label>
              <input 
                className="input-field font-medium text-lg" 
                value={formData.title || ''} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                required 
                placeholder="Resumo do problema"
              />
           </div>
           
           <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Descrição Detalhada</label>
              <textarea 
                className="input-field h-32 resize-none" 
                value={formData.description || ''} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
                required 
                placeholder="Descreva o que está acontecendo..."
              />
           </div>

           <div>
              <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">Anexar Arquivo (Foto/Doc)</label>
              <div className="flex items-center gap-3">
                 <label className="cursor-pointer btn-secondary">
                    Escolher arquivo
                    <input type="file" className="hidden" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
                 </label>
                 <span className="text-sm text-gray-500">{fileName || 'Nenhum arquivo escolhido'}</span>
              </div>
           </div>
           
           <button className="w-full btn-primary py-3.5 text-lg font-bold shadow-lg mt-4">
             Gerar OS
           </button>
        </form>
      </div>
    </div>
  );
};

// --- RESTORED TICKET MANAGER ---
const TicketManager = ({ tickets, updateTicket, addTicket, deleteTicket, currentUser }: any) => {
  const [showCreate, setShowCreate] = useState(false);

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    const ticket = tickets.find((t: Ticket) => t.id === id);
    if (ticket) {
        updateTicket({ ...ticket, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gerenciar OS</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={20} /> Nova OS
        </button>
      </div>
      
      <div className="card overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">ID</th>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">Solicitante</th>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">Título</th>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">Prioridade</th>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">Status</th>
                    <th className="p-4 text-xs font-bold uppercase text-gray-500">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
               {tickets.map((t:Ticket) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                     <td className="p-4 font-mono text-primary-600 dark:text-primary-400 text-sm">#{t.id.substr(0,4)}</td>
                     <td className="p-4 text-gray-600 dark:text-gray-300 text-sm">{t.requesterId}</td>
                     <td className="p-4 text-gray-900 dark:text-white font-medium">{t.title}</td>
                     <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            t.priority === TicketPriority.CRITICAL ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            t.priority === TicketPriority.HIGH ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>{t.priority}</span>
                     </td>
                     <td className="p-4">
                        <select 
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TicketStatus)}
                            className={`text-xs px-2 py-1 rounded font-bold border-none outline-none cursor-pointer appearance-none ${
                                t.status === TicketStatus.OPEN ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                                t.status === TicketStatus.IN_PROGRESS ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                t.status === TicketStatus.CLOSED ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                                'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {Object.values(TicketStatus).map(s => <option key={s} value={s} className="bg-white text-gray-900">{s}</option>)}
                        </select>
                     </td>
                     <td className="p-4 flex gap-2">
                         <button className="btn-icon"><Edit2 size={16}/></button>
                         <button onClick={() => deleteTicket(t.id)} className="btn-icon text-red-500 hover:text-red-600"><Trash2 size={16}/></button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
      
      {showCreate && (
          <Modal title="Nova OS Avulsa" onClose={() => setShowCreate(false)}>
              <div className="text-center p-4">
                  <p className="mb-4 text-gray-600 dark:text-gray-300">Criação rápida de chamado administrativo.</p>
                  <button onClick={() => {
                      addTicket({
                          title: 'Nova OS Avulsa',
                          description: 'Criada pelo admin',
                          status: TicketStatus.OPEN,
                          priority: TicketPriority.MEDIUM,
                          requesterId: currentUser.id,
                          unitId: currentUser.unitId || '1',
                          category: 'Geral'
                      });
                      setShowCreate(false);
                  }} className="btn-primary w-full">Confirmar Criação</button>
              </div>
          </Modal>
      )}
    </div>
  );
}

const AdminDashboard = ({tickets}: any) => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
       {[{l:'Total OS',v:tickets.length,c:'bg-blue-500'}, {l:'Abertas',v:tickets.filter((t:any)=>t.status===TicketStatus.OPEN).length,c:'bg-red-500'}, {l:'Em Andamento',v:tickets.filter((t:any)=>t.status===TicketStatus.IN_PROGRESS).length,c:'bg-yellow-500'}, {l:'Fechadas',v:tickets.filter((t:any)=>t.status===TicketStatus.CLOSED).length,c:'bg-green-500'}].map((s,i)=>(
         <div key={i} className={`${s.c} text-white p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200`}>
            <p className="text-sm font-bold opacity-80 uppercase">{s.l}</p>
            <p className="text-4xl font-bold mt-2">{s.v}</p>
         </div>
       ))}
    </div>
  </div>
);

const ChatSystem = ({messages, addMessage, markRead, currentUser}: any) => {
    const [text, setText] = useState('');
    return (
        <div className="card h-[calc(100vh-140px)] flex flex-col overflow-hidden">
            <div className="p-4 bg-primary-600 text-white font-bold flex justify-between items-center shadow-md">
                <span>Chat - Suporte Online</span>
                <span className="flex items-center gap-2 text-xs bg-green-500/20 px-2 py-1 rounded-full"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> Online</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-900/50">
               {messages.map((m:any) => (
                   <div key={m.id} className={`flex ${m.senderId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-3 rounded-2xl ${m.senderId === currentUser.id ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none shadow-sm'}`}>
                           <p>{m.text}</p>
                       </div>
                   </div>
               ))}
            </div>
            <form className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex gap-2" onSubmit={(e) => { e.preventDefault(); if(text) { addMessage({id: Date.now().toString(), text, senderId: currentUser.id, timestamp: new Date().toISOString()}); setText('')}}}>
                <input className="input-field mb-0 rounded-full px-4" placeholder="Digite sua mensagem..." value={text} onChange={e => setText(e.target.value)} />
                <button className="btn-primary rounded-full w-12 h-12 flex items-center justify-center p-0"><MessageSquare size={20}/></button>
            </form>
        </div>
    )
};
const MyTickets = ({tickets}: any) => <div className="space-y-4"><h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meus Chamados</h1><div className="card p-4">{tickets.length === 0 ? <p className="text-gray-500">Nenhum chamado.</p> : tickets.map((t:any) => <div key={t.id} className="p-3 border-b dark:border-gray-700 last:border-0">{t.title} <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded ml-2">{t.status}</span></div>)}</div></div>;

const Sidebar = ({ role, onLogout, unreadChat }: any) => {
  const [isOpen, setIsOpen] = useState(false); 
  const location = useLocation();

  const LinkItem = ({ to, icon: Icon, label, badge }: any) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
        <Icon size={20} className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
        <span className="font-medium flex-1">{label}</span>
        {badge > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm animate-pulse">{badge}</span>}
      </Link>
    );
  };

  return (
    <>
      <div className={`md:flex flex-col w-72 bg-gray-900 border-r border-gray-800 transition-all duration-300 ${isOpen ? 'absolute z-50 h-full' : 'hidden'} md:static md:h-full`}>
        <div className="p-8 flex items-center gap-3">
          <div className="bg-primary-600 p-2 rounded-lg"><ShieldCheck className="text-white" size={24} /></div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">HelpDesk</h1>
            <p className="text-xs text-gray-500 font-medium">PRO SYSTEM</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="md:hidden ml-auto text-gray-400"><X /></button>
        </div>
        
        <nav className="flex-1 overflow-y-auto px-4 space-y-2 py-4 custom-scrollbar">
          <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Menu Principal</p>
          {role === Role.ADMIN ? (
            <>
              <LinkItem to="/" icon={LayoutDashboard} label="Dashboard" />
              <LinkItem to="/tickets" icon={TicketIcon} label="Chamados" />
              <LinkItem to="/users" icon={Users} label="Usuários" />
              <LinkItem to="/reports" icon={FileBarChart} label="Relatórios" />
              <div className="my-4 border-t border-gray-800 mx-4"></div>
              <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gestão</p>
              <LinkItem to="/remote" icon={MonitorSmartphone} label="Acesso Remoto" />
              <LinkItem to="/assets" icon={Package} label="Equipamentos" />
              <LinkItem to="/units" icon={Building2} label="Unidades & Setores" />
            </>
          ) : (
            <>
              <LinkItem to="/create-ticket" icon={TicketIcon} label="Abrir Chamado" />
              <LinkItem to="/my-tickets" icon={FileBarChart} label="Meus Chamados" />
            </>
          )}
          <div className="mt-4">
             <LinkItem to="/chat" icon={MessageSquare} label="Chat Suporte" badge={unreadChat} />
          </div>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button onClick={onLogout} className="flex items-center space-x-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full px-4 py-3 rounded-xl transition-all duration-200">
            <LogOut size={20} />
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </div>
      
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg text-gray-600 dark:text-gray-300">
          <Menu size={24} />
        </button>
      )}
    </>
  );
};

const Header = ({ user, darkMode, toggleDarkMode }: any) => {
  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm z-10 py-4 px-8 flex justify-between items-center sticky top-0 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center md:ml-0 ml-12">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
          Olá, <span className="text-primary-600 dark:text-primary-400">{user.name?.split(' ')[0]}</span>
        </h2>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={toggleDarkMode} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
          {darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-gray-500" />}
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
           <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'ADMIN' ? 'Administrador' : 'Usuário'}</p>
           </div>
           <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md transform hover:scale-105 transition-transform cursor-pointer">
             {user.name?.charAt(0) || 'U'}
           </div>
        </div>
      </div>
    </header>
  );
};