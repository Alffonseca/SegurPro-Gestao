import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, 
  Eye, 
  EyeOff, 
  Check, 
  Lock, 
  AlertCircle,
  Calendar, 
  DollarSign, 
  FileText, 
  BarChart2, 
  PieChart, 
  ShoppingCart, 
  Activity,
  ClipboardList,
  ArrowLeft,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface DashboardDisplayConfigProps {
  canAccess: (tab: string) => boolean;
  onBack?: () => void;
}

type ConfigKeys = 
  | 'showVisitsCard'
  | 'showPayablesCard'
  | 'showOsCard'
  | 'showPdvSalesCard'
  | 'showBudgetsCard'
  | 'showReceivablesCard'
  | 'showBalanceCard'
  | 'showMonthBalanceCard'
  | 'showVisitsChart'
  | 'showTypesChart'
  | 'showFluxoChart'
  | 'showForecastChart'
  | 'showTodayVisitsList';

// INÍCIO DA ROTINA: COMPONENTE DE CONFIGURAÇÃO DO DISPLAY DO DASHBOARD (DashboardDisplayConfig)
// Esta rotina controla a visibilidade, exibição personalizada e ordenação arrastável/clicável 
// dos cards de resumo estatístico e gráficos analíticos no Painel Geral do Usuário.
export default function DashboardDisplayConfig({ canAccess, onBack }: DashboardDisplayConfigProps) {
  // Config state keys and configurations
  const [configs, setConfigs] = useState<Record<ConfigKeys, boolean>>({
    // Cards
    showVisitsCard: true,
    showPayablesCard: true,
    showOsCard: true,
    showPdvSalesCard: true,
    showBudgetsCard: true,
    showReceivablesCard: true,
    showBalanceCard: true,
    showMonthBalanceCard: true,
    
    // Charts and Lists
    showVisitsChart: true,
    showTypesChart: true,
    showFluxoChart: true,
    showForecastChart: true,
    showTodayVisitsList: true
  });

  const [cardsOrder, setCardsOrder] = useState<string[]>(() => {
    const defaultCards = ['showVisitsCard', 'showPayablesCard', 'showOsCard', 'showPdvSalesCard', 'showBudgetsCard', 'showReceivablesCard', 'showBalanceCard', 'showMonthBalanceCard'];
    const saved = localStorage.getItem('dashboard_cards_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSaved = parsed.filter(item => defaultCards.includes(item));
          const missing = defaultCards.filter(item => !validSaved.includes(item));
          return [...validSaved, ...missing];
        }
      } catch (e) {
        // Fallback
      }
    }
    return defaultCards;
  });

  const [chartsOrder, setChartsOrder] = useState<string[]>(() => {
    const defaultCharts = ['showVisitsChart', 'showTypesChart', 'showFluxoChart', 'showForecastChart', 'showTodayVisitsList'];
    const saved = localStorage.getItem('dashboard_charts_order');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validSaved = parsed.filter(item => defaultCharts.includes(item));
          const missing = defaultCharts.filter(item => !validSaved.includes(item));
          return [...validSaved, ...missing];
        }
      } catch (e) {
        // Fallback
      }
    }
    return defaultCharts;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    setConfigs({
      // Cards
      showVisitsCard: localStorage.getItem('dashboard_show_visits_card') !== 'false',
      showPayablesCard: localStorage.getItem('dashboard_show_payables_card') !== 'false',
      showOsCard: localStorage.getItem('dashboard_show_os_card') !== 'false',
      showPdvSalesCard: localStorage.getItem('dashboard_show_pdv_sales_card') !== 'false',
      showBudgetsCard: localStorage.getItem('dashboard_show_budgets_card') !== 'false',
      showReceivablesCard: localStorage.getItem('dashboard_show_receivables_card') !== 'false',
      showBalanceCard: localStorage.getItem('dashboard_show_balance_card') !== 'false',
      showMonthBalanceCard: localStorage.getItem('dashboard_show_month_balance_card') !== 'false',
      
      // Charts and Lists
      showVisitsChart: localStorage.getItem('dashboard_show_visits_chart') !== 'false',
      showTypesChart: localStorage.getItem('dashboard_show_types_chart') !== 'false',
      showFluxoChart: localStorage.getItem('dashboard_show_fluxo_chart') !== 'false',
      showForecastChart: localStorage.getItem('dashboard_show_forecast_chart') !== 'false',
      showTodayVisitsList: localStorage.getItem('dashboard_show_today_visits') !== 'false'
    });
  }, []);

  const handleToggle = (key: ConfigKeys) => {
    const newValue = !configs[key];
    setConfigs(prev => ({ ...prev, [key]: newValue }));
    
    // Map state key to localStorage key
    const mapping: Record<ConfigKeys, string> = {
      showVisitsCard: 'dashboard_show_visits_card',
      showPayablesCard: 'dashboard_show_payables_card',
      showOsCard: 'dashboard_show_os_card',
      showPdvSalesCard: 'dashboard_show_pdv_sales_card',
      showBudgetsCard: 'dashboard_show_budgets_card',
      showReceivablesCard: 'dashboard_show_receivables_card',
      showBalanceCard: 'dashboard_show_balance_card',
      showMonthBalanceCard: 'dashboard_show_month_balance_card',
      showVisitsChart: 'dashboard_show_visits_chart',
      showTypesChart: 'dashboard_show_types_chart',
      showFluxoChart: 'dashboard_show_fluxo_chart',
      showForecastChart: 'dashboard_show_forecast_chart',
      showTodayVisitsList: 'dashboard_show_today_visits'
    };

    localStorage.setItem(mapping[key], String(newValue));
    
    // Show quick feedback
    setSavedSuccess(true);
    const timer = setTimeout(() => setSavedSuccess(false), 2000);
    return () => clearTimeout(timer);
  };

  const handleReset = () => {
    const defaultConfigs: Record<ConfigKeys, boolean> = {
      showVisitsCard: true,
      showPayablesCard: true,
      showOsCard: true,
      showPdvSalesCard: true,
      showBudgetsCard: true,
      showReceivablesCard: true,
      showBalanceCard: true,
      showMonthBalanceCard: true,
      showVisitsChart: true,
      showTypesChart: true,
      showFluxoChart: true,
      showForecastChart: true,
      showTodayVisitsList: true
    };
    
    setConfigs(defaultConfigs);
    
    localStorage.setItem('dashboard_show_visits_card', 'true');
    localStorage.setItem('dashboard_show_payables_card', 'true');
    localStorage.setItem('dashboard_show_os_card', 'true');
    localStorage.setItem('dashboard_show_pdv_sales_card', 'true');
    localStorage.setItem('dashboard_show_budgets_card', 'true');
    localStorage.setItem('dashboard_show_receivables_card', 'true');
    localStorage.setItem('dashboard_show_balance_card', 'true');
    localStorage.setItem('dashboard_show_month_balance_card', 'true');
    localStorage.setItem('dashboard_show_visits_chart', 'true');
    localStorage.setItem('dashboard_show_types_chart', 'true');
    localStorage.setItem('dashboard_show_fluxo_chart', 'true');
    localStorage.setItem('dashboard_show_forecast_chart', 'true');
    localStorage.setItem('dashboard_show_today_visits', 'true');

    const defaultOrder = ['showVisitsCard', 'showPayablesCard', 'showOsCard', 'showPdvSalesCard', 'showBudgetsCard', 'showReceivablesCard', 'showBalanceCard', 'showMonthBalanceCard'];
    setCardsOrder(defaultOrder);
    localStorage.setItem('dashboard_cards_order', JSON.stringify(defaultOrder));

    const defaultChartsOrder = ['showVisitsChart', 'showTypesChart', 'showFluxoChart', 'showForecastChart', 'showTodayVisitsList'];
    setChartsOrder(defaultChartsOrder);
    localStorage.setItem('dashboard_charts_order', JSON.stringify(defaultChartsOrder));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const moveCard = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...cardsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      
      setCardsOrder(newOrder);
      localStorage.setItem('dashboard_cards_order', JSON.stringify(newOrder));
      
      setSavedSuccess(true);
      const timer = setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const moveChart = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...chartsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      
      setChartsOrder(newOrder);
      localStorage.setItem('dashboard_charts_order', JSON.stringify(newOrder));
      
      setSavedSuccess(true);
      const timer = setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  // Sections with access keys
  const cardsItems = [
    {
      key: 'showVisitsCard' as ConfigKeys,
      label: 'Visitas Agendadas',
      description: 'Exibe o total de visitas técnicas agendadas pendentes.',
      requiredMenu: 'visits',
      icon: <Calendar className="text-[#3b82f6]" size={16} />
    },
    {
      key: 'showOsCard' as ConfigKeys,
      label: 'Ordens de Serviço Ativas',
      description: 'Mostra o volume de ordens de serviço em aberto ou em andamento.',
      requiredMenu: 'service-orders',
      icon: <ClipboardList className="text-[#10b981]" size={16} />
    },
    {
      key: 'showBudgetsCard' as ConfigKeys,
      label: 'Orçamentos Pendentes',
      description: 'Exibe os orçamentos que aguardam aprovação de clientes.',
      requiredMenu: 'budgets',
      icon: <FileText className="text-[#f59e0b]" size={16} />
    },
    {
      key: 'showPayablesCard' as ConfigKeys,
      label: 'Contas a Pagar (Pendentes)',
      description: 'Card financeiro que indica obrigações em aberto (Visitas fallback).',
      requiredMenu: 'payable',
      icon: <DollarSign className="text-red-500" size={16} />
    },
    {
      key: 'showReceivablesCard' as ConfigKeys,
      label: 'Contas a Receber (Pendentes)',
      description: 'Card financeiro que indica valores a receber (Orçamentos fallback).',
      requiredMenu: 'receivable',
      icon: <DollarSign className="text-emerald-500" size={16} />
    },
    {
      key: 'showPdvSalesCard' as ConfigKeys,
      label: 'Vendas no PDV (Hoje)',
      description: 'Totaliza o número de vendas registradas hoje no PDV (O.S. fallback).',
      requiredMenu: 'pdv',
      icon: <ShoppingCart className="text-indigo-400" size={16} />
    },
    {
      key: 'showBalanceCard' as ConfigKeys,
      label: 'Saldo do Dia',
      description: 'Diferença líquida de receitas e despesas registradas hoje.',
      requiredMenu: 'financial',
      icon: <DollarSign className="text-amber-500" size={16} />
    },
    {
      key: 'showMonthBalanceCard' as ConfigKeys,
      label: 'Resumo Financeiro do Mês (8º Card)',
      description: 'Card financeiro detalhado com Receitas Mês, Despesas Mês e Saldo do Mês atual.',
      requiredMenu: 'financial',
      icon: <DollarSign className="text-pink-500" size={16} />
    }
  ];

  const visualItems = [
    {
      key: 'showVisitsChart' as ConfigKeys,
      label: 'Gráfico: Cronograma de Visitas',
      description: 'Gráfico de barras e linhas com agenda de visitas da semana.',
      requiredMenu: 'visits',
      icon: <BarChart2 className="text-[#3b82f6]" size={16} />
    },
    {
      key: 'showTypesChart' as ConfigKeys,
      label: 'Gráfico: Distribuição por Tipo de Serviço',
      description: 'Gráfico de pizza/rosca distribuindo os atendimentos por categorias.',
      requiredMenu: 'visits',
      icon: <PieChart className="text-[#10b981]" size={16} />
    },
    {
      key: 'showFluxoChart' as ConfigKeys,
      label: 'Gráfico: Fluxo Financeiro (Últimos 7 dias)',
      description: 'Histórico gráfico diário de entradas e saídas de caixa.',
      requiredMenu: 'financial',
      icon: <BarChart2 className="text-[#10b981]" size={16} />
    },
    {
      key: 'showForecastChart' as ConfigKeys,
      label: 'Gráfico: Previsão Financeira Dupla',
      description: 'Previsão de vencimentos de contas a pagar e receber para o mês.',
      requiredMenu: 'financial',
      icon: <Activity className="text-[#8b5cf6]" size={16} />
    },
    {
      key: 'showTodayVisitsList' as ConfigKeys,
      label: 'Lista: Visitas para Hoje',
      description: 'Listagem simplificada com horários e técnicos das visitas de hoje.',
      requiredMenu: 'visits',
      icon: <Calendar className="text-[#3b82f6]" size={16} />
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2d3139]/30 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {onBack && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onBack}
                className="h-8 w-8 text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]/50 -ml-1"
                title="Voltar ao Painel Geral"
              >
                <ArrowLeft size={16} />
              </Button>
            )}
            <h2 className="text-xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Configurações de Exibição do Painel Geral</h2>
          </div>
          <p className="text-[#a0a0a0] text-sm md:pl-9 mt-1">Defina exatamente quais blocos de informação e gráficos devem aparecer no seu resumo operacional.</p>
        </div>
        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-emerald-400 text-xs font-semibold animate-pulse mr-2 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Check size={12} /> Configurações salvas!
            </span>
          )}
          {onBack && (
            <Button 
              variant="outline"
              size="sm"
              onClick={onBack}
              className="border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 font-medium"
            >
              Voltar ao Painel
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            className="border-[#2d3139] hover:bg-[#25282e]/50 text-[#a0a0a0] hover:text-white pointer-events-auto"
          >
            Restaurar Padrão
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Section 1: Dashboard Stat Cards */}
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-[#2d3139] bg-[#1d2027]/50 px-6 py-4">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <LayoutGrid size={16} className="text-[#3b82f6]" />
              Configuração dos Cards de Resumo
            </CardTitle>
            <CardDescription className="text-xs text-[#71717a]">
              Tópicos de indicadores numéricos que ocupam o topo do painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 divide-y divide-[#2d3139]/30 space-y-4">
            {(() => {
              const sortedCardsItems = [...cardsItems].sort((a, b) => {
                const indexA = cardsOrder.indexOf(a.key);
                const indexB = cardsOrder.indexOf(b.key);
                const finalA = indexA === -1 ? 99 : indexA;
                const finalB = indexB === -1 ? 99 : indexB;
                return finalA - finalB;
              });

              return sortedCardsItems.map((item, index) => {
                const hasAccessToMenu = canAccess(item.requiredMenu);
                const isEnabled = configs[item.key] && hasAccessToMenu;

                return (
                  <div key={item.key} className="flex items-center justify-between pt-4 first:pt-0 gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-[#2d3139]/30 rounded-lg mt-0.5 shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[13px] font-medium transition-colors truncate ${hasAccessToMenu ? 'text-zinc-100 font-semibold' : 'text-[#71717a]'}`}>
                            {item.label}
                          </span>
                          {!hasAccessToMenu && (
                            <Badge variant="outline" className="text-[9px] text-[#ef4444] border-red-500/20 bg-red-500/5 flex items-center gap-1 py-0 px-1.5 h-4 shrink-0 select-none">
                              <Lock size={8} /> Bloqueado no Plano
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[#71717a] mt-0.5 block max-w-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Order Controls */}
                      <div className="flex items-center gap-1 bg-[#25282e]/40 p-1 rounded-lg border border-[#2d3139]/30">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveCard(index, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 text-[#71717a] hover:text-white hover:bg-[#2d3139]/50 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover para Cima"
                        >
                          <ArrowUp size={13} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveCard(index, 'down')}
                          disabled={index === sortedCardsItems.length - 1}
                          className="h-7 w-7 text-[#71717a] hover:text-white hover:bg-[#2d3139]/50 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover para Baixo"
                        >
                          <ArrowDown size={13} />
                        </Button>
                      </div>

                      {hasAccessToMenu ? (
                        <button
                          type="button"
                          onClick={() => handleToggle(item.key)}
                          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            isEnabled ? 'bg-[#3b82f6]' : 'bg-[#2d3139]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="text-[#ef4444] p-1.5 bg-red-500/10 rounded-full border border-red-500/20" title="Seu plano não inclui este menu">
                          <Lock size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>

        {/* Section 2: Charts and Detailed Modules */}
        <Card className="border-[#2d3139] bg-[#1a1d23] rounded-xl overflow-hidden flex flex-col">
          <CardHeader className="border-b border-[#2d3139] bg-[#1d2027]/50 px-6 py-4">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart2 size={16} className="text-[#10b981]" />
              Gráficos, Análises e Listas
            </CardTitle>
            <CardDescription className="text-xs text-[#71717a]">
              Gráficos de desempenho operacional e financeiro da parte inferior.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 divide-y divide-[#2d3139]/30 space-y-4">
            {(() => {
              const sortedVisualItems = [...visualItems].sort((a, b) => {
                const indexA = chartsOrder.indexOf(a.key);
                const indexB = chartsOrder.indexOf(b.key);
                const finalA = indexA === -1 ? 99 : indexA;
                const finalB = indexB === -1 ? 99 : indexB;
                return finalA - finalB;
              });

              return sortedVisualItems.map((item, index) => {
                const hasAccessToMenu = canAccess(item.requiredMenu);
                const isEnabled = configs[item.key] && hasAccessToMenu;

                return (
                  <div key={item.key} className="flex items-center justify-between pt-4 first:pt-0 gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-[#2d3139]/30 rounded-lg mt-0.5 shrink-0">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[13px] font-medium transition-colors truncate ${hasAccessToMenu ? 'text-zinc-100 font-semibold' : 'text-[#71717a]'}`}>
                            {item.label}
                          </span>
                          {!hasAccessToMenu && (
                            <Badge variant="outline" className="text-[9px] text-[#ef4444] border-red-500/20 bg-red-500/5 flex items-center gap-1 py-0 px-1.5 h-4 shrink-0 select-none">
                              <Lock size={8} /> Bloqueado no Plano
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-[#71717a] mt-0.5 block max-w-sm">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Order Controls */}
                      <div className="flex items-center gap-1 bg-[#25282e]/40 p-1 rounded-lg border border-[#2d3139]/30">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveChart(index, 'up')}
                          disabled={index === 0}
                          className="h-7 w-7 text-[#71717a] hover:text-white hover:bg-[#2d3139]/50 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover para Cima"
                        >
                          <ArrowUp size={13} />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => moveChart(index, 'down')}
                          disabled={index === sortedVisualItems.length - 1}
                          className="h-7 w-7 text-[#71717a] hover:text-white hover:bg-[#2d3139]/50 disabled:opacity-20 disabled:pointer-events-none"
                          title="Mover para Baixo"
                        >
                          <ArrowDown size={13} />
                        </Button>
                      </div>

                      {hasAccessToMenu ? (
                        <button
                          type="button"
                          onClick={() => handleToggle(item.key)}
                          className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            isEnabled ? 'bg-[#3b82f6]' : 'bg-[#2d3139]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="text-[#ef4444] p-1.5 bg-red-500/10 rounded-full border border-red-500/20" title="Seu plano não inclui este menu">
                          <Lock size={12} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Info notice about sync */}
      <div className="flex gap-3 p-4 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-xl max-w-full">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <div>
          <strong className="block font-semibold">Sincronização imediata!</strong>
          As alterações feitas acima são aplicadas em tempo real ao navegar de volta para o Painel Geral. Nenhum dado de clientes ou histórico será afetado.
        </div>
      </div>
    </div>
  );
}
// FIM DA ROTINA: COMPONENTE DE CONFIGURAÇÃO DO DISPLAY DO DASHBOARD (DashboardDisplayConfig)
