export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum TicketStatus {
  OPEN = 'Aberto',
  IN_PROGRESS = 'Em Andamento',
  WAITING = 'Aguardando',
  CLOSED = 'Fechado',
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  unitId?: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface Unit {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  responsible?: string;
  status: 'Ativa' | 'Inativa';
}

export interface Sector {
  id: string;
  name: string;
  unitId: string;
  responsible?: string;
  status: 'Ativo' | 'Inativo';
}

export interface RemoteAccess {
  id: string;
  name: string;
  type: 'ANYDESK' | 'RDP' | 'TEAMVIEWER' | 'VNC';
  accessId: string;
  password?: string;
  unitId?: string;
  status: 'Online' | 'Offline';
}

export interface Asset {
  id: string;
  name: string; // Used for "Nome" e.g. PC-001
  patrimonyId: string;
  category: string; // 'Computador' | 'Notebook' | 'Impressora'
  status: 'Ativo' | 'Em Uso' | 'Em Estoque' | 'Manutenção' | 'Descartado';
  unitId: string;
  description: string; // Model description e.g. Dell OptiPlex 3080
  
  // Extended fields
  brand?: string;
  model?: string; // Specific model field
  serialNumber?: string;
  sectorId?: string;
  acquisitionDate?: string;
  value?: number;
  warrantyDate?: string;
  invoiceNumber?: string;
  supplier?: string;
  responsible?: string;
  observations?: string;
}

export interface CommonProblem {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: string;
  assigneeId?: string;
  unitId: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  attachmentName?: string;
  
  sector?: string;
  equipmentId?: string;
  technicianName?: string;
  observations?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardStats {
  open: number;
  inProgress: number;
  closed: number;
  criticalOpen: number;
}
