import { CircleStackIcon } from "@heroicons/react/24/outline";
import { formatBytes } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export type StorageByClient = {
  clientId: string;
  clientName: string;
  files: number;
  bytes: number;
};

// Somente leitura: agregado de client_files (interno vê tudo; RLS
// restringe o role cliente aos próprios arquivos).
export function StorageSummary({
  totalFiles,
  totalBytes,
  byClient,
  showByClient,
}: {
  totalFiles: number;
  totalBytes: number;
  byClient: StorageByClient[];
  showByClient: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-sm border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Total de arquivos</span>
          <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
            {totalFiles}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-sm border border-slate-200 bg-white p-4">
          <span className="text-xs text-slate-500">Espaço utilizado</span>
          <span className="text-(length:--text-score-md) font-semibold leading-none tabular-nums text-slate-900">
            {totalBytes === 0 ? "0 MB" : formatBytes(totalBytes)}
          </span>
        </div>
      </div>

      {showByClient ? (
        totalFiles === 0 ? (
          <EmptyState
            icon={CircleStackIcon}
            title="Nenhum arquivo armazenado"
            description="O uso de storage por cliente aparecerá aqui."
            discreet
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600"
                  >
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600"
                  >
                    Arquivos
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600"
                  >
                    Tamanho
                  </th>
                </tr>
              </thead>
              <tbody>
                {byClient.map((row) => (
                  <tr key={row.clientId}>
                    <td className="h-14 px-4 text-sm font-medium text-slate-800">
                      {row.clientName}
                    </td>
                    <td className="h-14 px-4 text-right text-sm tabular-nums text-slate-600">
                      {row.files}
                    </td>
                    <td className="h-14 px-4 text-right text-sm tabular-nums text-slate-600">
                      {formatBytes(row.bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
