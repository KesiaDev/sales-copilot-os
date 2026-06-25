import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function Topbar({
  title,
  subtitle,
  showCurrencyToggle,
}: {
  title: string;
  subtitle?: string;
  showCurrencyToggle?: boolean;
}) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {showCurrencyToggle && (
        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8"
          title="A plataforma exibe valores em EUR"
        >
          € EUR
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </header>
  );
}

