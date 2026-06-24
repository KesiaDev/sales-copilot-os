// Supabase/PostgREST corta o resultado em paginas de no maximo ~1000 linhas por
// padrao. Sem paginar, qualquer soma/agregacao numa tabela que passe desse
// tamanho fica truncada silenciosamente (sem erro) — foi a causa da Receita do
// Mes (KPI) divergir da Evolucao Mensal depois da importacao do CSV historico
// da Hotmart em 24/06/2026 (uma query buscava 6 meses sem paginar).
export async function fetchAllRows<T>(
  build: (range: { from: number; to: number }) => PromiseLike<{ data: T[] | null; error: unknown }>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await build({ from, to: from + pageSize - 1 });
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}
