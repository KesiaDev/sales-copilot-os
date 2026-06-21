import brandLogo from "@/assets/brand-logo.jpeg.asset.json";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ClipboardList, Trophy, Brain, Sparkles,
  FileText, TrendingUp, MessageSquareWarning, Database, Bot, LogOut, RefreshCw,
} from "lucide-react";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const groups = [
  {
    label: "Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Daily Executiva", url: "/daily", icon: FileText },
      { title: "Previsão", url: "/previsao", icon: TrendingUp },
    ],
  },
  {
    label: "Pessoas",
    items: [
      { title: "Equipe", url: "/equipe", icon: Users },
      { title: "Perfil DISC", url: "/disc", icon: Brain },
      { title: "Inteligência", url: "/inteligencia", icon: Sparkles },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Fechamento Diário", url: "/fechamento", icon: ClipboardList },
      { title: "Ranking", url: "/ranking", icon: Trophy },
      { title: "CRM Performance", url: "/crm", icon: Database },
      { title: "Renovações", url: "/renovacoes", icon: RefreshCw },
      { title: "Banco de Objeções", url: "/objecoes", icon: MessageSquareWarning },

    ],
  },
  {
    label: "Copiloto",
    items: [{ title: "IA de Liderança", url: "/copiloto", icon: Bot }],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <img src={brandLogo.url} alt="LLMídia" className="h-9 w-9 rounded-lg object-cover" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight">LLMídia</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sales OS</span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = path === item.url || path.startsWith(item.url + "/");
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start gap-2">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
