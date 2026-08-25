"use client";

import { useState, useTransition } from "react";
import {
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  PencilSquareIcon,
  PlusIcon,
  Squares2X2Icon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { CORES_TAXONOMIA } from "@/lib/constants";
import {
  createTaxonomia,
  deleteTaxonomia,
  setTaxonomiaArquivada,
  updateTaxonomia,
} from "@/lib/actions/desafio-taxonomias";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionMenu, type MenuItem } from "@/components/ui/action-menu";
import { TaxonomiaChip } from "@/components/ui/taxonomia-chip";

export type TaxonomiaRow = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  arquivada: boolean;
};

type Eixo = "categoria" | "fluxo";

const COPY: Record<
  Eixo,
  { titulo: string; descricao: string; novo: string; vazio: string; rotulo: string }
> = {
  categoria: {
    titulo: "Categorias",
    descricao:
      "Que TIPO de problema é. É a linha da matriz do dashboard, e a cor dela é que tinge a célula.",
    novo: "Nova categoria",
    vazio: "Nenhuma categoria ainda",
    rotulo: "categoria",
  },
  fluxo: {
    titulo: "Fluxos",
    descricao:
      "ONDE no produto o problema mora. A ordem descreve a jornada, então ela não é alfabética.",
    novo: "Novo fluxo",
    vazio: "Nenhum fluxo ainda",
    rotulo: "fluxo",
  },
};

export function TaxonomiasView({
  categorias,
  fluxos,
  usos,
}: {
  categorias: TaxonomiaRow[];
  fluxos: TaxonomiaRow[];
  usos: Record<string, number>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-slate-600">
        Os dois eixos do cruzamento. Renomear não reescreve histórico — o desafio
        aponta para a linha, não para o texto. Arquivar tira a opção de novos
        cadastros e mantém o que já foi classificado.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TaxonomiaCard eixo="categoria" linhas={categorias} usos={usos} />
        <TaxonomiaCard eixo="fluxo" linhas={fluxos} usos={usos} />
      </div>
    </div>
  );
}

function TaxonomiaCard({
  eixo,
  linhas,
  usos,
}: {
  eixo: Eixo;
  linhas: TaxonomiaRow[];
  usos: Record<string, number>;
}) {
  const copy = COPY[eixo];
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<TaxonomiaRow | null>(null);
  const [excluindo, setExcluindo] = useState<TaxonomiaRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function menuFor(linha: TaxonomiaRow): MenuItem[] {
    const emUso = usos[linha.id] ?? 0;
    return [
      {
        label: "Editar",
        icon: PencilSquareIcon,
        onSelect: () => {
          setError(null);
          setEditando(linha);
        },
      },
      {
        label: linha.arquivada ? "Reativar" : "Arquivar",
        icon: linha.arquivada ? ArrowUturnLeftIcon : ArchiveBoxIcon,
        onSelect: () =>
          startTransition(async () => {
            const result = await setTaxonomiaArquivada(eixo, linha.id, !linha.arquivada);
            if (!result.ok) setError(result.error);
          }),
      },
      {
        label: "Excluir",
        icon: TrashIcon,
        destructive: true,
        // Excluir com uso é recusado pela action de qualquer forma; desabilitar
        // aqui poupa o clique e diz o motivo no lugar em que ele importa.
        disabled: emUso > 0,
        badge: emUso > 0 ? `${emUso} em uso` : undefined,
        onSelect: () => {
          setError(null);
          setExcluindo(linha);
        },
      },
    ];
  }

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-slate-700">{copy.titulo}</h2>
          <p className="max-w-md text-xs text-slate-500">{copy.descricao}</p>
        </div>
        <Button
          icon={PlusIcon}
          size="sm"
          onClick={() => {
            setError(null);
            setCriando(true);
          }}
        >
          {copy.novo}
        </Button>
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icon={Squares2X2Icon}
          title={copy.vazio}
          description={`Crie a primeira ${copy.rotulo} para começar a classificar os desafios.`}
          discreet
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {linhas.map((linha) => (
            <li
              key={linha.id}
              className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0"
            >
              <span className="w-8 shrink-0 text-xs tabular-nums text-slate-400">
                {linha.ordem}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TaxonomiaChip nome={linha.nome} cor={linha.cor} />
                  {linha.arquivada ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                      Arquivada
                    </span>
                  ) : null}
                  {(usos[linha.id] ?? 0) > 0 ? (
                    <span className="text-xs tabular-nums text-slate-500">
                      {usos[linha.id]} desafio(s)
                    </span>
                  ) : null}
                </div>
                {linha.descricao ? (
                  <p className="truncate text-xs text-slate-500">{linha.descricao}</p>
                ) : null}
              </div>
              <ActionMenu items={menuFor(linha)} />
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <NovaTaxonomiaModal
        eixo={eixo}
        open={criando}
        onClose={() => setCriando(false)}
      />
      {/* `key` remonta o formulário a cada linha aberta: sem ela o estado da
          cor sobreviveria de uma edição para a seguinte. */}
      {editando ? (
        <EditarTaxonomiaModal
          key={editando.id}
          eixo={eixo}
          linha={editando}
          onClose={() => setEditando(null)}
        />
      ) : null}
      <ConfirmModal
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        tone="danger"
        title={`Excluir ${excluindo?.nome ?? ""}?`}
        description="Esta ação não pode ser desfeita. Nenhum desafio usa esta linha."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={() => {
          const alvo = excluindo;
          if (!alvo) return;
          startTransition(async () => {
            const result = await deleteTaxonomia(eixo, alvo.id);
            if (result.ok) setExcluindo(null);
            else setError(result.error);
          });
        }}
      />
    </section>
  );
}

function NovaTaxonomiaModal({
  eixo,
  open,
  onClose,
}: {
  eixo: Eixo;
  open: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await createTaxonomia(eixo, String(form.get("nome") ?? ""));
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={COPY[eixo].novo}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nome" htmlFor={`nova-${eixo}-nome`}>
          <Input id={`nova-${eixo}-nome`} name="nome" required autoFocus maxLength={60} />
        </Field>
        <p className="text-xs text-slate-500">
          Cor, ordem e descrição se ajustam depois, em Editar.
        </p>
        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Criando…" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditarTaxonomiaModal({
  eixo,
  linha,
  onClose,
}: {
  eixo: Eixo;
  linha: TaxonomiaRow;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cor, setCor] = useState(linha.cor);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await updateTaxonomia(eixo, linha.id, {
        nome: String(form.get("nome") ?? ""),
        cor,
        ordem: Number(form.get("ordem") ?? 0),
        descricao: String(form.get("descricao") ?? ""),
      });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal open onClose={onClose} title={`Editar ${COPY[eixo].rotulo}`} width="max-w-lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nome" htmlFor={`editar-${eixo}-nome`}>
          <Input
            id={`editar-${eixo}-nome`}
            name="nome"
            defaultValue={linha.nome}
            required
            maxLength={60}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cor" htmlFor={`editar-${eixo}-cor`}>
            <Select
              id={`editar-${eixo}-cor`}
              options={CORES_TAXONOMIA}
              value={cor}
              color={cor}
              onChange={(event) => setCor(event.target.value)}
            />
          </Field>
          <Field
            label="Ordem"
            help="Menor aparece primeiro na matriz e nos seletores."
            htmlFor={`editar-${eixo}-ordem`}
          >
            <Input
              id={`editar-${eixo}-ordem`}
              name="ordem"
              type="number"
              min={0}
              step={1}
              defaultValue={linha.ordem}
            />
          </Field>
        </div>
        <Field label="Descrição" htmlFor={`editar-${eixo}-descricao`}>
          <Textarea
            id={`editar-${eixo}-descricao`}
            name="descricao"
            defaultValue={linha.descricao ?? ""}
            className="min-h-20"
          />
        </Field>
        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
