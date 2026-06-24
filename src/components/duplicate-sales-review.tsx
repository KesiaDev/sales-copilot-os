import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { listPossibleDuplicates, resolveDuplicate } from "@/lib/data.functions";
import { formatCurrency, shortDate } from "@/lib/format";

// Supabase tipa o embed do FK auto-referenciado (duplicate_of -> sales.id) como array
// por causa de ambiguidade de direcao no codegen para self-joins; no runtime o PostgREST
// sempre devolve um objeto unico (ou null) porque duplicate_of e uma FK direta desta linha.
type DuplicateSaleRow = {
  id: string;
  vendido_em: string;
  produto: string;
  fonte: string;
  valor: number;
  original: {
    id: string;
    produto: string;
    valor: number;
    vendido_em: string;
    fonte: string;
  } | null;
};

export function DuplicateSalesReview() {
  const qc = useQueryClient();
  const resolveFn = useServerFn(resolveDuplicate);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: duplicates } = useQuery({
    queryKey: ["possible-duplicates"],
    queryFn: () => listPossibleDuplicates(),
  });

  const act = async (id: string, action: "dismiss" | "delete") => {
    setBusyId(id);
    try {
      await resolveFn({ data: { id, action } });
      toast.success(
        action === "delete" ? "Venda duplicada removida." : "Marcado como não-duplicata.",
      );
      qc.invalidateQueries({ queryKey: ["possible-duplicates"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Falha ao resolver: " + message);
    } finally {
      setBusyId(null);
      setPendingDeleteId(null);
    }
  };

  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-base">Possíveis duplicatas entre Clint e Hotmart</CardTitle>
        </div>
        <CardDescription>
          Vendas com mesmo valor e data próxima registradas por fontes diferentes (ex: sincronizada
          da Clint e também importada via CSV da Hotmart). Pode ser falso positivo — dois
          compradores diferentes no mesmo preço e dia. Revise antes de excluir.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Venda original (mesma fonte cruzada)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(duplicates as unknown as DuplicateSaleRow[]).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="text-xs">{shortDate(d.vendido_em)}</TableCell>
                <TableCell className="text-xs">{d.produto}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {d.fonte}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  {formatCurrency(d.valor)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.original ? (
                    <>
                      {d.original.produto} · {formatCurrency(d.original.valor)} ·{" "}
                      {shortDate(d.original.vendido_em)} ·{" "}
                      <Badge variant="outline" className="text-[10px]">
                        {d.original.fonte}
                      </Badge>
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === d.id}
                      onClick={() => act(d.id, "dismiss")}
                      className="gap-1"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Não é duplicata
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === d.id}
                      onClick={() => setPendingDeleteId(d.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover venda duplicada?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa venda será excluída permanentemente da tabela de vendas. Use apenas se tiver
              confirmado que é de fato a mesma venda registrada duas vezes (Clint + Hotmart).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingDeleteId && act(pendingDeleteId, "delete")}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
