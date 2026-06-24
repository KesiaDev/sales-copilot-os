import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseHotmartCsv, type ParsedRow } from "@/lib/hotmart-csv";
import { importHotmartCsv } from "@/lib/import.functions";
import { formatCurrency } from "@/lib/format";

export function HotmartCsvImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [filename, setFilename] = useState("");
  const [importing, setImporting] = useState(false);
  const importFn = useServerFn(importHotmartCsv);
  const qc = useQueryClient();

  const onPick = () => inputRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    try {
      const text = await file.text();
      const parsed = parseHotmartCsv(text);
      if (parsed.rows.length === 0) {
        toast.error("Nenhuma linha válida encontrada no CSV.");
        return;
      }
      setRows(parsed.rows);
      setSkipped(parsed.skipped);
      setOpen(true);
    } catch (err: any) {
      toast.error("Erro ao ler CSV: " + (err.message ?? err));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onConfirm = async () => {
    setImporting(true);
    try {
      const res = await importFn({
        data: {
          rows: rows.map((r) => ({
            external_id: r.external_id,
            produto: r.produto,
            vendedor: r.vendedor,
            comprador_email: r.comprador_email,
            valor: r.valor,
            vendido_em: r.vendido_em,
            status: r.status as "aprovada" | "reembolsada" | "cancelada",
            raw: r.raw,
          })),
        },
      });
      toast.success(
        `Importação concluída: ${res.inserted} inseridas, ${res.duplicated} duplicadas, ${res.errors} erros.` +
          (res.flaggedPossibleDuplicates > 0
            ? ` ${res.flaggedPossibleDuplicates} marcadas como possível duplicata cruzada (revisar no CRM).`
            : ""),
      );
      if (res.errors > 0 && res.errorDetails.length) {
        console.error("Erros de importação:", res.errorDetails);
      }
      qc.invalidateQueries();
      setOpen(false);
      setRows([]);
    } catch (err: any) {
      toast.error("Falha na importação: " + (err.message ?? err));
    } finally {
      setImporting(false);
    }
  };

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFile}
      />
      <Button onClick={onPick} variant="default" size="sm" className="gap-2">
        <Upload className="h-4 w-4" /> Importar CSV da Hotmart
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Prévia da importação</DialogTitle>
            <DialogDescription>
              {filename} — {rows.length} linhas válidas
              {skipped > 0 ? `, ${skipped} ignoradas (status desconhecido / sem ID)` : ""}.
              Duplicadas serão ignoradas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">Aprovadas: {counts.aprovada ?? 0}</Badge>
            <Badge variant="outline">Reembolsadas: {counts.reembolsada ?? 0}</Badge>
            <Badge variant="outline">Canceladas: {counts.cancelada ?? 0}</Badge>
          </div>

          <div className="max-h-[50vh] overflow-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((r) => (
                  <TableRow key={r.external_id}>
                    <TableCell className="font-mono text-xs">{r.external_id}</TableCell>
                    <TableCell className="text-xs">{r.vendido_em.slice(0, 10)}</TableCell>
                    <TableCell className="text-xs">{r.produto}</TableCell>
                    <TableCell className="text-xs">{r.vendedor ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          r.status === "aprovada"
                            ? "default"
                            : r.status === "reembolsada"
                              ? "destructive"
                              : "secondary"
                        }
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{formatCurrency(r.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {rows.length > 200 && (
              <p className="p-2 text-center text-xs text-muted-foreground">
                Mostrando 200 de {rows.length}. Todas serão importadas.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando…
                </>
              ) : (
                `Confirmar importação (${rows.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
