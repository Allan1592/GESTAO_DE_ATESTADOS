/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, 
  Search, 
  Database, 
  ArrowLeft, 
  Save, 
  CheckCircle2, 
  Pencil, 
  Trash2, 
  X, 
  AlertTriangle, 
  Filter, 
  Download, 
  Upload, 
  Trash,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  FileText,
  RefreshCw,
  ChevronRight,
  BarChart3,
  Calendar
} from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";

type Screen = "home" | "cadastrar" | "pesquisar" | "banco" | "relatorios";

interface Atestado {
  id: number;
  matricula: string;
  nome: string;
  solicitante: string;
  data_pedido: string;
  num_grade: string | null;
  tipo_atestado: string | null;
  data_envio: string | null;
  dias_trabalho: number;
  dias_estudo: number;
  status: string;
  created_at: string;
}

interface FormData {
  matricula: string;
  nome: string;
  solicitante: string;
  data_pedido: string;
  num_grade?: string;
  tipo_atestado?: string;
  data_envio?: string;
  dias_trabalho?: number | string;
  dias_estudo?: number | string;
}

const initialFormData: FormData = {
  matricula: "",
  nome: "",
  solicitante: "",
  data_pedido: new Date().toISOString().split("T")[0],
  num_grade: "",
  tipo_atestado: "",
  data_envio: "",
  dias_trabalho: "",
  dias_estudo: "",
};

const toBR = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const toISO = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  if (dateStr.includes("-")) return dateStr;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Search screen states
  const [atestados, setAtestados] = useState<Atestado[]>([]);
  const [filters, setFilters] = useState({
    matricula: "",
    nome: "",
    data_pedido: "",
    data_envio: "",
    num_grade: "",
    tipo_atestado: "",
  });
  const [editingAtestado, setEditingAtestado] = useState<Atestado | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Atestado; direction: 'asc' | 'desc' } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificação de ambiente NW.js
  const isNW = typeof window !== 'undefined' && (window as any).require;
  const fs = isNW ? (window as any).require('fs') : null;
  const path = isNW ? (window as any).require('path') : null;
  const DB_FILENAME = "banco_dados.json";

  // Função para carregar dados (Compatível com NW.js e Browser Preview)
  const carregarDados = useCallback(async (apiFilters = filters) => {
    setIsLoading(true);
    try {
      if (isNW) {
        // Lógica Direta NW.js (Node.js no Frontend)
        const dbPath = path.join(process.cwd(), DB_FILENAME);
        if (!fs.existsSync(dbPath)) {
          fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
          setAtestados([]);
          return;
        }
        const raw = fs.readFileSync(dbPath, "utf-8");
        let data = JSON.parse(raw);
        
        // Filtros locais para NW.js
        if (apiFilters.matricula) data = data.filter((r: any) => r.matricula.includes(apiFilters.matricula));
        if (apiFilters.nome) data = data.filter((r: any) => r.nome.toLowerCase().includes(apiFilters.nome.toLowerCase()));
        
        setAtestados(data);
      } else {
        // Fallback para o Preview do AI Studio (Simulando o FS via API)
        const queryParams = new URLSearchParams(apiFilters as any);
        const response = await fetch(`/api/records?${queryParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setAtestados(data);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isNW, fs, path]);

  // Função para salvar dados (Compatível com NW.js e Browser Preview)
  const salvarDados = async (item: any, isNew = true) => {
    setIsSubmitting(true);
    try {
      if (isNW) {
        // Lógica Direta NW.js
        const dbPath = path.join(process.cwd(), DB_FILENAME);
        const raw = fs.readFileSync(dbPath, "utf-8");
        let db = JSON.parse(raw);

        if (isNew) {
          const novo = {
            ...item,
            id: db.length > 0 ? Math.max(...db.map((r: any) => r.id)) + 1 : 1,
            created_at: new Date().toISOString()
          };
          db.push(novo);
        } else {
          const idx = db.findIndex((r: any) => r.id === item.id);
          if (idx !== -1) db[idx] = { ...db[idx], ...item };
        }

        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        await carregarDados();
        return true;
      } else {
        // Fallback para o Preview (Chamando a API que usa FS no servidor)
        const url = isNew ? "/api/register" : `/api/records/${item.id}`;
        const method = isNew ? "POST" : "PATCH";
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        if (response.ok) {
          await carregarDados();
          return true;
        }
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
    } finally {
      setIsSubmitting(false);
    }
    return false;
  };

  const fetchAtestados = carregarDados;

  useEffect(() => {
    if (currentScreen === "pesquisar" || currentScreen === "banco" || currentScreen === "home" || currentScreen === "relatorios") {
      carregarDados();
    }
  }, [currentScreen, carregarDados]);

  const sortedAtestados = React.useMemo(() => {
    let sortableItems = [...atestados];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] || "";
        const bValue = b[sortConfig.key] || "";
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [atestados, sortConfig]);

  const requestSort = (key: keyof Atestado) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const menuItems = [
    {
      id: "home" as Screen,
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      gradient: "from-slate-700 to-slate-500",
    },
    {
      id: "cadastrar" as Screen,
      label: "Cadastrar",
      icon: <Plus className="w-5 h-5" />,
      gradient: "from-blue-700 to-blue-500",
    },
    {
      id: "pesquisar" as Screen,
      label: "Pesquisar",
      icon: <Search className="w-5 h-5" />,
      gradient: "from-green-700 to-green-500",
    },
    {
      id: "relatorios" as Screen,
      label: "Relatórios",
      icon: <BarChart3 className="w-5 h-5" />,
      gradient: "from-amber-700 to-amber-500",
    },
    {
      id: "banco" as Screen,
      label: "Banco de Dados",
      icon: <Database className="w-5 h-5" />,
      gradient: "from-purple-700 to-purple-500",
    },
  ];

  const handleNavigate = (screen: Screen) => {
    console.log("Navigating to screen:", screen);
    setCurrentScreen(screen);
    if (screen === "cadastrar") {
      setFormData(initialFormData);
      setShowSuccess(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "dias_trabalho" || name === "dias_estudo") {
      const dias = value === "" ? "" : parseInt(value);
      setFormData((prev) => ({ 
        ...prev, 
        [name]: dias
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const saveRecord = async () => {
    if (!formData.matricula || !formData.nome || !formData.solicitante || !formData.data_pedido) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return false;
    }

    const dataToSave = {
      ...formData,
      data_pedido: toBR(formData.data_pedido),
      data_envio: toBR(formData.data_envio)
    };

    const success = await salvarDados(dataToSave, true);
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    return success;
  };

  const handleCadastrar = async () => {
    const success = await saveRecord();
    if (success) {
      setFormData(initialFormData);
    }
  };

  const handleSalvarESair = async () => {
    const success = await saveRecord();
    if (success) {
      setCurrentScreen("home");
    }
  };

  const handleBackup = async () => {
    try {
      let data;
      if (isNW) {
        const dbPath = path.join(process.cwd(), DB_FILENAME);
        const raw = fs.readFileSync(dbPath, "utf-8");
        data = JSON.parse(raw);
      } else {
        const response = await fetch("/api/system/backup");
        if (response.ok) data = await response.json();
      }

      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_atestados_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Erro ao baixar backup:", error);
      alert("Erro ao gerar backup.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (isNW) {
          const dbPath = path.join(process.cwd(), DB_FILENAME);
          fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
          await carregarDados();
        } else {
          const response = await fetch("/api/system/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (response.ok) {
            await carregarDados();
          }
        }
        alert("Backup importado com sucesso!");
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClearSystem = async () => {
    try {
      if (isNW) {
        const dbPath = path.join(process.cwd(), DB_FILENAME);
        fs.writeFileSync(dbPath, JSON.stringify([], null, 2));
        await carregarDados();
      } else {
        await fetch("/api/system/clear", { method: "DELETE" });
        setAtestados([]);
      }
      setShowClearConfirm(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao limpar sistema:", error);
      alert("Erro ao limpar sistema.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAtestado) return;

    const dataToUpdate = {
      ...editingAtestado,
      data_pedido: toBR(editingAtestado.data_pedido),
      data_envio: toBR(editingAtestado.data_envio)
    };

    const success = await salvarDados(dataToUpdate, false);
    if (success) {
      setEditingAtestado(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      if (isNW) {
        const dbPath = path.join(process.cwd(), DB_FILENAME);
        const raw = fs.readFileSync(dbPath, "utf-8");
        let db = JSON.parse(raw);
        db = db.filter((r: any) => r.id !== id);
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
        await carregarDados();
      } else {
        const response = await fetch(`/api/records/${id}`, { method: "DELETE" });
        if (response.ok) await carregarDados();
      }
      setDeletingId(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
  };

  const renderContent = () => {
    if (currentScreen === "home") {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <div className="mb-10">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">
              Dashboard Geral
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              Visão geral do sistema de gestão de atestados
            </p>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { label: "Total Registros", value: atestados.length, color: "bg-white text-slate-700", icon: <FileText className="w-5 h-5 text-slate-400" />, bigIcon: <FileText className="w-20 h-20" /> },
              { label: "Dias Trabalho", value: atestados.reduce((acc, curr) => acc + (curr.dias_trabalho || 0), 0), color: "bg-white text-blue-700", icon: <CheckCircle2 className="w-5 h-5 text-blue-400" />, bigIcon: <CheckCircle2 className="w-20 h-20" /> },
              { label: "Dias Estudo", value: atestados.reduce((acc, curr) => acc + (curr.dias_estudo || 0), 0), color: "bg-white text-purple-700", icon: <Database className="w-5 h-5 text-purple-400" />, bigIcon: <Database className="w-20 h-20" /> },
              { label: "Incompletos", value: atestados.filter(a => !a.num_grade || !a.tipo_atestado || !a.data_envio).length, color: "bg-white text-amber-700", icon: <RefreshCw className="w-5 h-5 text-amber-400" />, bigIcon: <RefreshCw className="w-20 h-20" /> },
            ].map((stat, idx) => (
              <div key={idx} className={`${stat.color} p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">{stat.label}</span>
                  {stat.icon}
                </div>
                <span className="text-3xl font-black tracking-tighter">{stat.value}</span>
                <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
                   {stat.bigIcon}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" />
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={() => handleNavigate('cadastrar')}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Novo Cadastro</span>
                </button>
                <button 
                  onClick={() => handleNavigate('pesquisar')}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-green-50 text-slate-700 hover:text-green-700 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Search className="w-5 h-5" />
                  </div>
                  <span className="font-semibold">Pesquisar</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-500" />
                Últimos Registros
              </h3>
              <div className="space-y-4">
                {atestados.slice(0, 3).map((atestado) => (
                  <div key={atestado.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{atestado.nome}</span>
                      <span className="text-[10px] text-slate-500 uppercase font-medium">{atestado.matricula}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600 block">{atestado.dias_trabalho + atestado.dias_estudo} dias</span>
                      <span className="text-[10px] text-slate-400">{atestado.tipo_atestado}</span>
                    </div>
                  </div>
                ))}
                {atestados.length === 0 && (
                  <p className="text-center text-slate-400 py-4 text-sm italic">Nenhum registro encontrado.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (currentScreen === "cadastrar") {
      return (
        <motion.div
          key="cadastrar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-8 max-w-5xl mx-auto"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-blue-600 p-8 text-white">
              <h2 className="text-2xl font-bold uppercase tracking-widest">
                Novo Registro
              </h2>
              <p className="text-blue-100 text-sm mt-1">Insira as informações do atestado abaixo</p>
            </div>
            
            <div className="p-10">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Matrícula</label>
                    <input
                      type="text"
                      name="matricula"
                      value={formData.matricula}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      placeholder="Matrícula..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      placeholder="Nome completo..."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Solicitante</label>
                    <select
                      name="solicitante"
                      value={formData.solicitante}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all appearance-none"
                    >
                      <option value="" disabled className="text-slate-800">Selecione...</option>
                      <option value="Advogado" className="text-slate-800">Advogado</option>
                      <option value="DEECRIM" className="text-slate-800">DEECRIM</option>
                      <option value="Defensoria" className="text-slate-800">Defensoria</option>
                      <option value="FUNAP" className="text-slate-800">FUNAP</option>
                      <option value="Outra U.P" className="text-slate-800">Outra U.P</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Data do Pedido</label>
                    <input
                      type="date"
                      name="data_pedido"
                      value={formData.data_pedido}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Atestado</label>
                    <select
                      name="tipo_atestado"
                      value={formData.tipo_atestado}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all appearance-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Estudo">Estudo</option>
                      <option value="ENCCEJA">ENCCEJA</option>
                      <option value="ENEM">ENEM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Nº da Grade</label>
                    <input
                      type="text"
                      name="num_grade"
                      value={formData.num_grade}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      placeholder="Ex: 123/2024"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Data de Envio</label>
                    <input
                      type="date"
                      name="data_envio"
                      value={formData.data_envio}
                      onChange={handleInputChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dias Trabalho</label>
                      <input
                        type="number"
                        name="dias_trabalho"
                        value={formData.dias_trabalho}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Dias Estudo</label>
                      <input
                        type="number"
                        name="dias_estudo"
                        value={formData.dias_estudo}
                        onChange={handleInputChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleCadastrar}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    Cadastrar
                  </button>
                  <button
                    onClick={handleSalvarESair}
                    disabled={isSubmitting}
                    className="flex-1 bg-slate-100 text-slate-700 border border-slate-200 font-bold py-4 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    Salvar e Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (currentScreen === "pesquisar") {
      return (
        <motion.div
          key="pesquisar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-8 h-full flex flex-col"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[calc(100vh-160px)]">
            <div className="bg-green-600 p-6 text-white sticky top-0 z-20">
              <h2 className="text-xl font-bold uppercase tracking-widest">
                Pesquisar Registros
              </h2>
              <p className="text-green-100 text-xs mt-1">Localize atestados cadastrados no sistema</p>
            </div>
            
            <div className="p-6 flex flex-col flex-1 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-50">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    name="nome"
                    placeholder="Nome..."
                    value={filters.nome}
                    onChange={handleFilterChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    name="matricula"
                    placeholder="Matrícula..."
                    value={filters.matricula}
                    onChange={handleFilterChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                  />
                </div>
                <div className="relative group">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  <input
                    type="text"
                    name="num_grade"
                    placeholder="Nº Grade..."
                    value={filters.num_grade}
                    onChange={handleFilterChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
                  />
                </div>
                <div className="relative group">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                  <select
                    name="tipo_atestado"
                    value={filters.tipo_atestado}
                    onChange={handleFilterChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-400 transition-all appearance-none"
                  >
                    <option value="">Todos os Tipos</option>
                    <option value="Trabalho">Trabalho</option>
                    <option value="Estudo">Estudo</option>
                    <option value="ENCCEJA">ENCCEJA</option>
                    <option value="ENEM">ENEM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {isLoading ? (
                  <div className="text-center py-10 text-slate-400 italic">Carregando registros...</div>
                ) : atestados.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 italic">Nenhum registro encontrado com os filtros atuais.</div>
                ) : (
                  atestados.map((atestado) => {
                    const isIncomplete = !atestado.num_grade || !atestado.tipo_atestado || !atestado.data_envio;
                    return (
                      <motion.div
                        layout
                        key={atestado.id}
                        className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:shadow-sm transition-all group"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center transition-colors ${isIncomplete ? 'text-amber-500' : 'text-green-600'}`}>
                              {isIncomplete ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800">{atestado.nome}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{atestado.matricula}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span className="text-[10px] text-slate-500">{atestado.data_pedido}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                              {atestado.solicitante}
                            </span>
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                              {atestado.tipo_atestado || "Não definido"}
                            </span>
                            {atestado.num_grade && (
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                Grade: {atestado.num_grade}
                              </span>
                            )}
                            <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-800">{(atestado.dias_trabalho || 0) + (atestado.dias_estudo || 0)} dias</span>
                                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-tighter">Total Remição</span>
                              </div>
                              <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                              <button
                                onClick={() => setEditingAtestado({
                                  ...atestado,
                                  data_pedido: toISO(atestado.data_pedido),
                                  data_envio: toISO(atestado.data_envio)
                                })}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(atestado.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (currentScreen === "relatorios") {
      const filteredByMonth = atestados.filter(a => {
        if (!a.data_pedido) return false;
        const parts = a.data_pedido.split("/");
        if (parts.length !== 3) return false;
        const [day, month, year] = parts;
        return `${year}-${month}` === reportMonth;
      });

      const stats = {
        trabalho: {
          count: filteredByMonth.filter(a => a.tipo_atestado === "Trabalho").length,
          days: filteredByMonth.filter(a => a.tipo_atestado === "Trabalho").reduce((acc, curr) => acc + (curr.dias_trabalho || 0), 0)
        },
        estudo: {
          count: filteredByMonth.filter(a => a.tipo_atestado === "Estudo").length,
          days: filteredByMonth.filter(a => a.tipo_atestado === "Estudo").reduce((acc, curr) => acc + (curr.dias_estudo || 0), 0)
        },
        outros: {
          count: filteredByMonth.filter(a => a.tipo_atestado !== "Trabalho" && a.tipo_atestado !== "Estudo").length,
          days: filteredByMonth.filter(a => a.tipo_atestado !== "Trabalho" && a.tipo_atestado !== "Estudo").reduce((acc, curr) => acc + (curr.dias_trabalho || 0) + (curr.dias_estudo || 0), 0)
        }
      };

      return (
        <motion.div
          key="relatorios"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="p-8"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
            <div className="bg-amber-600 p-8 text-white">
              <h2 className="text-2xl font-bold uppercase tracking-widest">Relatório Mensal</h2>
              <p className="text-amber-100 text-sm mt-1">Resumo de atividades e remição por período</p>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4 mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span className="font-bold text-slate-700">Selecione o Mês:</span>
                </div>
                <input 
                  type="month" 
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-amber-400 outline-none transition-all font-bold text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Database className="w-32 h-32" />
                  </div>
                  <h3 className="text-blue-800 font-black text-xl uppercase tracking-tight mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                    Trabalho
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-blue-200/50">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Registros</p>
                      <p className="text-3xl font-black text-blue-900">{stats.trabalho.count}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-blue-200/50">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total de Dias</p>
                      <p className="text-3xl font-black text-blue-900">{stats.trabalho.days}d</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-[2rem] p-8 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <FileText className="w-32 h-32" />
                  </div>
                  <h3 className="text-purple-800 font-black text-xl uppercase tracking-tight mb-6 flex items-center gap-2">
                    <div className="w-2 h-6 bg-purple-600 rounded-full"></div>
                    Estudo
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-purple-200/50">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Registros</p>
                      <p className="text-3xl font-black text-purple-900">{stats.estudo.count}</p>
                    </div>
                    <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-purple-200/50">
                      <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Total de Dias</p>
                      <p className="text-3xl font-black text-purple-900">{stats.estudo.days}d</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">Resumo Geral do Mês</h3>
                    <p className="text-slate-400 text-sm">Consolidado de todas as atividades do período selecionado</p>
                  </div>
                  <div className="flex gap-8">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Registros</p>
                      <p className="text-4xl font-black text-white">{filteredByMonth.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Dias Remidos</p>
                      <p className="text-4xl font-black text-amber-500">
                        {stats.trabalho.days + stats.estudo.days + stats.outros.days}d
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (currentScreen === "banco") {
      return (
        <motion.div
          key="banco"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-8"
        >
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[calc(100vh-160px)]">
            {/* Sticky Header */}
            <div className="bg-purple-600 p-8 text-white sticky top-0 z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold uppercase tracking-widest">
                    Banco de Dados
                  </h2>
                  <p className="text-purple-100 text-sm mt-1">Gerenciamento de registros e backups</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm backdrop-blur-sm border border-white/10">
                    <Database className="w-4 h-4" />
                    <span className="font-bold">{atestados.length} registros ativos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBackup}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all active:scale-95 border border-white/10" 
                      title="Exportar Backup"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-all active:scale-95 border border-white/10" 
                      title="Importar Backup"
                    >
                      <Upload className="w-5 h-5" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImport} 
                      className="hidden" 
                      accept=".json"
                    />
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="p-3 bg-red-500/50 hover:bg-red-500/70 rounded-2xl transition-all active:scale-95 border border-white/10" 
                      title="Limpar Sistema"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-20 bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                  <tr>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('id')}
                    >
                      <div className="flex items-center gap-2">
                        ID {sortConfig?.key === 'id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('matricula')}
                    >
                      <div className="flex items-center gap-2">
                        Matrícula {sortConfig?.key === 'matricula' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('nome')}
                    >
                      <div className="flex items-center gap-2">
                        Nome {sortConfig?.key === 'nome' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('solicitante')}
                    >
                      <div className="flex items-center gap-2">
                        Solicitante {sortConfig?.key === 'solicitante' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('data_pedido')}
                    >
                      <div className="flex items-center gap-2">
                        Data Pedido {sortConfig?.key === 'data_pedido' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('num_grade')}
                    >
                      <div className="flex items-center gap-2">
                        Nº Grade {sortConfig?.key === 'num_grade' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('tipo_atestado')}
                    >
                      <div className="flex items-center gap-2">
                        Tipo {sortConfig?.key === 'tipo_atestado' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('data_envio')}
                    >
                      <div className="flex items-center gap-2">
                        Data Envio {sortConfig?.key === 'data_envio' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('dias_trabalho')}
                    >
                      <div className="flex items-center gap-2">
                        D. Trabalho {sortConfig?.key === 'dias_trabalho' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-5 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => requestSort('dias_estudo')}
                    >
                      <div className="flex items-center gap-2">
                        D. Estudo {sortConfig?.key === 'dias_estudo' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-20 text-center text-slate-400 italic">Carregando...</td>
                    </tr>
                  ) : sortedAtestados.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-20 text-center text-slate-400 italic">Nenhum registro ativo encontrado.</td>
                    </tr>
                  ) : (
                    sortedAtestados.map((atestado) => (
                      <tr 
                        key={atestado.id} 
                        className="hover:bg-slate-50 transition-colors group"
                      >
                        <td className="px-6 py-4 text-xs text-slate-400">{atestado.id}</td>
                        <td className="px-6 py-4 font-mono text-sm text-slate-600">{atestado.matricula}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{atestado.nome}</td>
                        <td className="px-6 py-4 text-slate-600">{atestado.solicitante}</td>
                        <td className="px-6 py-4 text-slate-600">{atestado.data_pedido}</td>
                        <td className="px-6 py-4 text-slate-600">{atestado.num_grade || "---"}</td>
                        <td className="px-6 py-4">
                          {atestado.tipo_atestado ? (
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase border border-purple-200">
                              {atestado.tipo_atestado}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-xs">---</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">{atestado.data_envio || "---"}</td>
                        <td className="px-6 py-4 font-bold text-blue-600">{atestado.dias_trabalho || 0}d</td>
                        <td className="px-6 py-4 font-bold text-purple-600">{atestado.dias_estudo || 0}d</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20 shadow-sm">
        <div className="p-8 flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-800 leading-none">
              GESTÃO DE<br />ATESTADOS
            </h1>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desktop v2.0</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${
                currentScreen === item.id 
                  ? "bg-blue-50 text-blue-700 shadow-sm" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <div className={`transition-transform group-hover:scale-110 ${currentScreen === item.id ? "text-blue-600" : "text-slate-400"}`}>
                {item.icon}
              </div>
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
              {currentScreen === item.id && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-lg shadow-blue-200"></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status do Sistema</p>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs font-bold text-slate-700">Banco de Dados Local</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Modo NW.js Offline</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-slate-50/50">
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-10 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {menuItems.find(m => m.id === currentScreen)?.label || "Início"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">Operador do Sistema</span>
              <span className="text-[10px] text-slate-400 font-medium">Acesso Administrativo</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {editingAtestado && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setEditingAtestado(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-2xl shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Editar Registro</h3>
                <button onClick={() => setEditingAtestado(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Matrícula</label>
                    <input
                      type="text"
                      value={editingAtestado.matricula}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, matricula: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome</label>
                    <input
                      type="text"
                      value={editingAtestado.nome}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, nome: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Solicitante</label>
                    <select
                      value={editingAtestado.solicitante}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, solicitante: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    >
                      <option value="Advogado">Advogado</option>
                      <option value="DEECRIM">DEECRIM</option>
                      <option value="Defensoria">Defensoria</option>
                      <option value="FUNAP">FUNAP</option>
                      <option value="Outra U.P">Outra U.P</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data do Pedido</label>
                    <input
                      type="date"
                      value={editingAtestado.data_pedido}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, data_pedido: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tipo de Atestado</label>
                    <select
                      value={editingAtestado.tipo_atestado || ""}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, tipo_atestado: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    >
                      <option value="">Selecione...</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Estudo">Estudo</option>
                      <option value="ENCCEJA">ENCCEJA</option>
                      <option value="ENEM">ENEM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nº da Grade</label>
                    <input
                      type="text"
                      value={editingAtestado.num_grade || ""}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, num_grade: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data de Envio</label>
                    <input
                      type="date"
                      value={editingAtestado.data_envio || ""}
                      onChange={(e) => setEditingAtestado({ ...editingAtestado, data_envio: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Dias Trabalho</label>
                    <input
                      type="number"
                      value={editingAtestado.dias_trabalho === 0 ? "" : editingAtestado.dias_trabalho}
                      onChange={(e) => {
                        const val = e.target.value;
                        const dias = val === "" ? 0 : parseInt(val);
                        setEditingAtestado({ ...editingAtestado, dias_trabalho: dias });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Dias Estudo</label>
                    <input
                      type="number"
                      value={editingAtestado.dias_estudo === 0 ? "" : editingAtestado.dias_estudo}
                      onChange={(e) => {
                        const val = e.target.value;
                        const dias = val === "" ? 0 : parseInt(val);
                        setEditingAtestado({ ...editingAtestado, dias_estudo: dias });
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl text-center border border-slate-100"
            >
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Confirmar Exclusão</h3>
              <p className="text-slate-500 mb-8">
                Deseja realmente excluir este registro? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleDelete(deletingId)}
                  className="flex-1 bg-red-600 text-white font-bold py-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  Sim, Excluir
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Não, Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear System Confirmation */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl text-center border border-red-100"
            >
              <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <AlertTriangle className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tight">ATENÇÃO!</h3>
              <p className="text-slate-500 mb-10 leading-relaxed">
                Você está prestes a <span className="text-red-600 font-bold">APAGAR TODOS OS REGISTROS</span> do sistema. Esta ação é irreversível e todos os dados de remição serão perdidos.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleClearSystem}
                  className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 active:scale-95 transition-all shadow-lg shadow-red-200"
                >
                  SIM, LIMPAR TUDO
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 active:scale-95 transition-all"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-10 right-10 z-50 bg-green-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 border border-green-500/50 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="font-bold tracking-tight">Operação realizada com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
