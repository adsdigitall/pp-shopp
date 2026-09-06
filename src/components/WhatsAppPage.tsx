import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Wifi, X, CheckCircle2, AlertCircle, RotateCcw, Smartphone, QrCode, Users, RefreshCw, Trash2, CheckSquare, Square, Search, Download, Upload } from 'lucide-react';

interface WhatsAppPageProps {
  onShowToast: (title: string, description?: string, type?: 'success' | 'info' | 'error') => void;
}

interface WhatsAppGroup {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
  selected: boolean;
}

export const WhatsAppPage: React.FC<WhatsAppPageProps> = ({ onShowToast }) => {
  const onShowToastRef = useRef(onShowToast);
  onShowToastRef.current = onShowToast;

  const showToast = useCallback((title: string, description?: string, type?: 'success' | 'info' | 'error') => {
    onShowToastRef.current?.(title, description, type);
  }, []);

  const [session, setSession] = useState<{
    id: string;
    status: 'disconnected' | 'connecting' | 'qr_code' | 'working' | 'failed';
    qrCode?: string;
    phone?: string;
    connectedAt?: string;
  } | null>(null);
  interface WhatsAppGroup {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
  selected: boolean;
}

const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('default');
  const [newConnectionName, setNewConnectionName] = useState('');
  const [showNewConnection, setShowNewConnection] = useState(false);

  const normalizeStatus = (value: string) => value === 'connected' || value === 'working' ? 'working' : value === 'qr_code' ? 'qr_code' : value === 'connecting' ? 'connecting' : value === 'error' || value === 'failed' ? 'failed' : 'disconnected';

  async function fetchSessions() {
    const response = await fetch('/api/whatsapp/sessions');
    const data = await response.json();
    setSessions(data.sessions || []);
    const first = data.sessions?.[0];
    if (first && selectedSessionId === 'default') setSelectedSessionId(first.wahaSessionId || first.id);
  }

  function fetchSession() {
    return fetch(`/api/whatsapp/status?session=${encodeURIComponent(selectedSessionId)}`)
      .then(res => res.json())
      .then(data => {
        const normalized = { ...data, id: data.session || selectedSessionId, status: normalizeStatus(data.status), qrCode: data.qrCode || undefined };
        setSession(normalized);
        return normalized;
      })
      .catch(err => {
        console.error('Erro ao buscar status:', err);
        return null;
      });
  }

  function fetchGroups() {
    setGroupsLoading(true);
    return fetch(`/api/whatsapp/groups?session=${encodeURIComponent(selectedSessionId)}`)
      .then(res => res.json())
      .then((data: { groups?: unknown[] }) => {
        const normalizedGroups = (data.groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          memberCount: g.memberCount || 0,
          isAdmin: g.isAdmin || false,
          selected: false,
          sessionId: g.sessionId || selectedSessionId,
        }));
        const uniqueGroups = Array.from(new Map(normalizedGroups.filter(g => g.id).map(g => [g.id, g])).values());
        setGroups(uniqueGroups);
        setSelectAll(false);
      })
      .catch(err => {
        showToast('Erro ao buscar grupos', 'Tente novamente', 'error');
      })
      .finally(() => {
        setGroupsLoading(false);
      });
  }

  function handleConnect() {
    setLoading(true);
    fetch('/api/whatsapp/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: selectedSessionId }) })
      .then(res => res.json())
      .then(data => {
        if (data.qrCode) {
          setSession(prev => prev ? { ...prev, status: 'qr_code', qrCode: data.qrCode } : { 
            id: data.session || 'default', 
            status: 'qr_code', 
            qrCode: data.qrCode 
          });
          startStatusPolling();
          showToast('QR Code gerado', 'Escaneie com seu WhatsApp', 'success');
        } else if (data.status === 'working' || data.status === 'connected') {
          setSession(prev => prev ? { ...prev, status: 'working', qrCode: undefined, phone: data.phone } : {
            id: data.session || 'default',
            status: 'working',
            phone: data.phone
          });
          showToast('WhatsApp conectado!', undefined, 'success');
          fetchGroups();
          stopStatusPolling();
        } else {
          setSession(prev => prev ? { ...prev, status: data.status } : { id: 'default', status: data.status });
        }
      })
      .catch(err => {
        showToast('Erro ao conectar', 'Tente novamente', 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  async function handleCreateConnection() {
    const name = newConnectionName.trim();
    if (!name) { showToast('Informe um nome', 'Exemplo: Radar Principal', 'error'); return; }
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || 'Não foi possível criar a sessão.');
      setSessions(prev => [...prev.filter(item => item.id !== data.session.id), data.session]);
      setSelectedSessionId(data.session.wahaSessionId);
      setSession({ id: data.session.wahaSessionId, status: data.qrCode ? 'qr_code' : 'connecting', qrCode: data.qrCode });
      setShowNewConnection(false);
      setNewConnectionName('');
      if (data.qrCode) startStatusPolling();
      showToast('Conexão criada', data.qrCode ? 'Escaneie o QR Code para continuar.' : 'A sessão está iniciando.', 'success');
    } catch (error) {
      showToast('Erro ao criar conexão', error instanceof Error ? error.message : 'Tente novamente.', 'error');
    } finally { setLoading(false); }
  }

  function handleDisconnect() {
    fetch('/api/whatsapp/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: selectedSessionId }) })
      .then(() => {
        setSession(prev => prev ? { ...prev, status: 'disconnected', qrCode: undefined, phone: undefined } : null);
        setGroups([]);
        showToast('WhatsApp desconectado', undefined, 'info');
        stopStatusPolling();
      })
      .catch(err => {
        showToast('Erro ao desconectar', 'Tente novamente', 'error');
      });
  }

  function handleRefreshQR() {
    fetch('/api/whatsapp/qr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: selectedSessionId }) })
      .then(res => res.json())
      .then(data => {
        if (data.qrCode) {
          setSession(prev => prev ? { ...prev, qrCode: `data:image/png;base64,${data.qrCode}` } : null);
          showToast('QR Code atualizado', undefined, 'success');
        }
      })
      .catch(err => {
        showToast('Erro ao atualizar QR', 'Tente novamente', 'error');
      });
  }

  function handleSyncGroups() {
    setGroupsLoading(true);
    fetch(`/api/groups/sync?session=${encodeURIComponent(selectedSessionId)}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.groups) {
          const uniqueGroups = Array.from(new Map(data.groups.filter((g: any) => g.id).map((g: any) => [g.id, g])).values());
          setGroups(uniqueGroups.map((g: any) => ({ ...g, selected: false })));
          showToast(`${data.groups.length} grupos sincronizados`, undefined, 'success');
        }
      })
      .catch(err => {
        showToast('Erro ao sincronizar', 'Tente novamente', 'error');
      })
      .finally(() => {
        setGroupsLoading(false);
      });
  }

  function startStatusPolling() {
    stopStatusPolling();
    const interval = setInterval(async () => {
      const data = await fetchSession();
      if (data?.status === 'working' && session?.status !== 'working') {
        showToast('WhatsApp conectado!', undefined, 'success');
        fetchGroups();
        stopStatusPolling();
      } else if (data?.status === 'failed') {
        showToast('Falha na conexão', 'Tente reconectar', 'error');
        stopStatusPolling();
      }
    }, 3000);
    setStatusCheckInterval(interval);
  }

  function stopStatusPolling() {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  }

  function toggleSelectAll() {
    setSelectAll(!selectAll);
    setGroups(prev => prev.map(g => ({ ...g, selected: !selectAll })));
  }

  function toggleGroup(id: string) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, selected: !g.selected } : g));
  }

  React.useEffect(() => {
    fetchSessions().catch(() => undefined);
    fetchSession();
    return () => stopStatusPolling();
  }, [selectedSessionId]);

  React.useEffect(() => {
    if (session?.status === 'working') {
      fetchGroups();
    }
  }, [session?.status]);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = groups.filter(g => g.selected).length;

  const getStatusConfig = (): { label: string; color: string; icon: React.ReactNode } => {
    switch (session?.status) {
      case 'working':
        return { label: 'Conectado', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-4 h-4" /> };
      case 'qr_code':
        return { label: 'Aguardando QR Code', color: 'bg-orange-100 text-orange-700', icon: <QrCode className="w-4 h-4" /> };
      case 'connecting':
        return { label: 'Conectando...', color: 'bg-blue-100 text-blue-700', icon: <RotateCcw className="w-4 h-4 animate-spin" /> };
      case 'failed':
        return { label: 'Erro na conexão', color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4" /> };
      default:
        return { label: 'Desconectado', color: 'bg-slate-100 text-slate-700', icon: <Wifi className="w-4 h-4" /> };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">WhatsApp</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie a conexão e grupos para disparos</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusConfig.color}`}>
            <span className="flex items-center gap-1">{statusConfig.icon} {statusConfig.label}</span>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Contas conectadas</p>
            <p className="mt-1 text-sm text-[var(--text-primary)]">Cada sessão WAHA mantém seus próprios grupos e fila.</p>
          </div>
          <button type="button" onClick={() => setShowNewConnection(value => !value)} className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--primary-hover)]">+ Adicionar WhatsApp</button>
        </div>
        {sessions.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{sessions.map(item => <button type="button" key={item.id} onClick={() => setSelectedSessionId(item.wahaSessionId)} className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${selectedSessionId === item.wahaSessionId ? 'border-[var(--primary)] bg-[var(--brand-light)]' : 'border-[var(--border)] bg-[var(--surface-secondary)]'}`}><span><span className="block text-sm font-bold text-[var(--text-primary)]">{item.name}</span><span className="block text-xs text-[var(--text-secondary)]">{item.phone || item.wahaSessionId}</span></span><span className="text-xs font-bold text-[var(--text-secondary)]">{item.status === 'WORKING' ? 'Conectado' : 'Não conectado'}</span></button>)}</div>}
        {showNewConnection && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={newConnectionName} onChange={event => setNewConnectionName(event.target.value)} placeholder="Nome da conexão (ex.: Radar Principal)" className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]" /><button type="button" onClick={handleCreateConnection} disabled={loading} className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">Criar conexão</button></div>}
      </div>

      {/* Connection Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {session?.status === 'qr_code' && session.qrCode && (
          <div className="text-center space-y-4">
            <div className="grid h-64 w-64 place-items-center rounded-xl bg-slate-50 mx-auto border border-slate-200">
              <img 
                src={`data:image/png;base64,${session.qrCode}`} 
                alt="QR Code WhatsApp" 
                className="w-56 h-56"
              />
            </div>
            <div className="space-y-2">
              <p className="font-bold text-slate-900">Escaneie o QR Code</p>
              <p className="text-sm text-slate-500">Abra o WhatsApp no celular → Dispositivos conectados → Conectar aparelho</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleRefreshQR}
                  disabled={loading}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" /> Atualizar QR
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {session?.status === 'working' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-100">
                <CheckCircle2 className="w-6 h-6 text-green-700" />
              </div>
              <div>
                <p className="font-bold text-slate-900">WhatsApp Conectado</p>
                <p className="text-sm text-slate-500">
                  {session.phone ? `📱 ${session.phone}` : 'Pronto para disparos'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncGroups}
                disabled={groupsLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Sincronizar Grupos
              </button>
              <button
                onClick={handleDisconnect}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" /> Desconectar
              </button>
            </div>
          </div>
        )}

        {session?.status === 'connecting' && (
          <div className="text-center space-y-4 py-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-blue-100 mx-auto">
              <RotateCcw className="w-10 h-10 text-blue-700 animate-spin" />
            </div>
            <p className="font-bold text-slate-900">Conectando...</p>
            <p className="text-sm text-slate-500">Aguarde enquanto iniciamos a sessão</p>
          </div>
        )}

        {session?.status === 'failed' && (
          <div className="text-center space-y-4 py-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-red-100 mx-auto">
              <AlertCircle className="w-10 h-10 text-red-700" />
            </div>
            <p className="font-bold text-slate-900">Falha na conexão</p>
            <p className="text-sm text-slate-500">Tente reconectar</p>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-black text-white hover:bg-brand-primary-hover mx-auto"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {(!session || session?.status === 'disconnected') && (
          <div className="text-center space-y-4 py-4">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 mx-auto">
              <Smartphone className="w-10 h-10 text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-slate-900">WhatsApp não conectado</p>
              <p className="mt-1 text-sm text-slate-500">Conecte para gerenciar grupos e fazer disparos</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={loading}
              className="rounded-xl bg-brand-primary px-6 py-3 text-sm font-black text-white hover:bg-brand-primary-hover mx-auto"
            >
              <Smartphone className="w-4 h-4" /> Conectar WhatsApp
            </button>
            <p className="text-[10px] text-slate-500">Vamos abrir o WhatsApp Web pra você escanear o QR Code</p>
          </div>
        )}
      </div>

      {/* Groups Section */}
      {session?.status === 'working' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100">
                <Users className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900">Grupos do WhatsApp</h2>
                <p className="text-xs text-slate-500">{groups.length} grupos • {selectedCount} selecionados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Buscar grupo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-brand-primary"
              />
              <button
                onClick={handleSyncGroups}
                disabled={groupsLoading}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Atualizar
              </button>
            </div>
          </div>

          {filteredGroups.length > 0 && (
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll && filteredGroups.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-brand-primary"
                />
                <span className="text-sm font-bold text-slate-700">Selecionar todos ({filteredGroups.length})</span>
              </label>
              <div className="divide-y divide-slate-100">
                {filteredGroups.map(group => (
                  <label key={group.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={group.selected}
                        onChange={() => toggleGroup(group.id)}
                        className="w-4 h-4 accent-brand-primary"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{group.name}</p>
                        <p className="text-[10px] text-slate-500 flex items-center gap-2">
                          <span>{group.memberCount} membros</span>
                          {group.isAdmin && <span className="rounded-full bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5">Admin</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${group.isAdmin ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {group.memberCount}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {filteredGroups.length === 0 && groups.length > 0 && (
            <div className="px-6 py-8 text-center text-slate-500">
              <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p>Nenhum grupo encontrado com "{searchQuery}"</p>
            </div>
          )}

          {groups.length === 0 && !groupsLoading && session?.status === 'working' && (
            <div className="px-6 py-12 text-center">
              <Users className="w-16 h-16 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-900">Nenhum grupo encontrado</p>
              <p className="mt-1 text-sm text-slate-500">Clique em "Sincronizar Grupos" para buscar seus grupos do WhatsApp</p>
              <button
                onClick={handleSyncGroups}
                disabled={groupsLoading}
                className="mt-4 rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-black text-white hover:bg-brand-primary-hover mx-auto"
              >
                <RefreshCw className="w-4 h-4" /> Sincronizar Grupos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppPage;
