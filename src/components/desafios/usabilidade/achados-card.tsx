"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { DesafioSeveridadeChip } from "@/components/ui/desafio-severidade-chip";
import { TaxonomiaChip } from "@/components/ui/taxonomia-chip";
import {
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_SEVERIDADES,
  DESAFIO_TIPO_ORDER,
  DESAFIO_TIPOS,
  type DesafioSeveridade,
  type DesafioTipo,
  type TesteAchadoStatus,
} from "@/lib/constants";
import { codigoDesafio } from "@/lib/desafios";
import { estadoDoVinculo } from "@/lib/usabilidade/sessao";
import { perguntasDoPerfil, type Perfil } from "@/lib/usabilidade/roteiro";
import {
  createAchado,
  criarDesafioDoAchado,
  deleteAchado,
  desvincularAchado,
  updateAchado,
  vincularAchadoADesafio,
  type AchadoFormInput,
} from "@/lib/actions/usabilidade";
import type { TaxonomiaOption } from "../desafios-view";

export type AchadoRow = {
  id: string;
  pergunta_id: string | null;
  resumo: string;
  trecho: string | null;
  tipo: DesafioTipo;
  severidade: DesafioSeveridade;
  status: TesteAchadoStatus;
  categoria: { nome: string; cor: string } | null;
  categoria_id: string | null;
  fluxo: { nome: string; cor: string } | null;
  fluxo_id: string | null;
  desafio_id: string | null;
  desafio_codigo: number | null;
};

export type DesafioOption = { id: string; codigo: number; titulo: string };

function vazio(): AchadoFormInput {
  return {
    pergunta_id: null,
    resumo: "",
    trecho: "",
    // `atrito` é o default porque é o que um teste de usabilidade produz na
    // maioria das vezes — mas os três tipos acontecem aqui de verdade: o Bloco 1
    // pergunta por erros técnicos (bug) e o Bloco 3B por "o que você precisaria
    // configurar e hoje não dá" (lacuna).
    tipo: "atrito",
    severidade: "media",
    status: "aberto",
    categoria_id: null,
    fluxo_id: null,
  };
}

function paraForm(achado: AchadoRow): AchadoFormInput {
  return {
    pergunta_id: achado.pergunta_id,
    resumo: achado.resumo,
    trecho: achado.trecho ?? "",
    tipo: achado.tipo,
    severidade: achado.severidade,
    status: achado.status,
    categoria_id: achado.categoria_id,
    fluxo_id: achado.fluxo_id,
  };
}

export function AchadosCard({
  sessaoId,
  perfil,
  varejo,
  achados,
  categorias,
  fluxos,
  desafios,
}: {
  sessaoId: string;
  perfil: Perfil;
  varejo: boolean;
  achados: AchadoRow[];
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
  desafios: DesafioOption[];
}) {
  const [editando, setEditando] = useState<AchadoRow | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<AchadoRow | null>(null);
  const [vinculando, setVinculando] = useState<AchadoRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, startActing] = useTransition();
  const router = useRouter();

  function promover(achado: AchadoRow) {
    setError(null);
    startActing(async () => {
      const result = await criarDesafioDoAchado(achado.id);
      if (result.ok) router.push(`/desafios/${result.data.desafioId}`);
      else setError(result.error);
    });
  }

  function desvincular(achado: AchadoRow) {
    setError(null);
    startActing(async () => {
      const result = await desvincularAchado(achado.id, sessaoId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-slate-700">Achados</h3>
          <p className="text-xs text-slate-500">
            O que deu errado nesta sessão. Cada achado pode virar um desafio, ou
            entrar num que já existe.
          </p>
        </div>
        <Button size="sm" icon={PlusIcon} onClick={() => setEditando("novo")}>
          Registrar achado
        </Button>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      {achados.length === 0 ? (
        <EmptyState
          discreet
          icon={SparklesIcon}
          title="Nenhum achado nesta sessão"
          description="Registre o que travou, atritou ou faltou — com o trecho em que aconteceu."
        />
      ) : (
        <ul className="flex flex-col">
          {achados.map((achado) => (
            <LinhaAchado
              key={achado.id}
              achado={achado}
              acting={acting}
              onEditar={() => setEditando(achado)}
              onExcluir={() => setExcluindo(achado)}
              onPromover={() => promover(achado)}
              onVincular={() => setVinculando(achado)}
              onDesvincular={() => desvincular(achado)}
            />
          ))}
        </ul>
      )}

      {editando ? (
        <AchadoModal
          key={editando === "novo" ? "novo" : editando.id}
          sessaoId={sessaoId}
          perfil={perfil}
          varejo={varejo}
          achado={editando === "novo" ? null : editando}
          categorias={categorias}
          fluxos={fluxos}
          onClose={() => setEditando(null)}
        />
      ) : null}

      {vinculando ? (
        <VincularModal
          achado={vinculando}
          sessaoId={sessaoId}
          desafios={desafios}
          onClose={() => setVinculando(null)}
        />
      ) : null}

      <ConfirmModal
        open={excluindo !== null}
        onClose={() => setExcluindo(null)}
        onConfirm={() => {
          const alvo = excluindo;
          if (!alvo) return;
          startActing(async () => {
            const result = await deleteAchado(alvo.id, sessaoId);
            if (result.ok) setExcluindo(null);
            else {
              setExcluindo(null);
              setError(result.error);
            }
          });
        }}
        tone="danger"
        title="Excluir este achado?"
        description="O desafio criado a partir dele, se houver, continua existindo."
        confirmLabel="Excluir achado"
        loading={acting}
      />
    </section>
  );
}

function LinhaAchado({
  achado,
  acting,
  onEditar,
  onExcluir,
  onPromover,
  onVincular,
  onDesvincular,
}: {
  achado: AchadoRow;
  acting: boolean;
  onEditar: () => void;
  onExcluir: () => void;
  onPromover: () => void;
  onVincular: () => void;
  onDesvincular: () => void;
}) {
  const estado = estadoDoVinculo(achado);

  return (
    <li className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-b-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-800">{achado.resumo}</p>
        <ActionMenu
          items={[
            { label: "Editar", icon: PencilSquareIcon, onSelect: onEditar },
            ...(estado === "vinculado"
              ? [
                  {
                    label: "Desvincular do desafio",
                    icon: LinkIcon,
                    onSelect: onDesvincular,
                    disabled: acting,
                  },
                ]
              : [
                  {
                    label: "Virar desafio",
                    icon: SparklesIcon,
                    onSelect: onPromover,
                    disabled: acting,
                  },
                  {
                    label: "Vincular a um desafio",
                    icon: LinkIcon,
                    onSelect: onVincular,
                    disabled: acting,
                  },
                ]),
            {
              label: "Excluir",
              icon: TrashIcon,
              destructive: true,
              onSelect: onExcluir,
            },
          ]}
        />
      </div>

      {achado.trecho ? (
        <blockquote className="border-l-2 border-slate-200 pl-3 text-sm whitespace-pre-wrap break-words text-slate-600">
          {achado.trecho}
        </blockquote>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <DesafioSeveridadeChip severidade={achado.severidade} compact />
        <span className="text-xs text-slate-500">
          {DESAFIO_TIPOS[achado.tipo].label}
        </span>
        {achado.categoria ? (
          <TaxonomiaChip
            nome={achado.categoria.nome}
            cor={achado.categoria.cor}
            compact
          />
        ) : null}
        {achado.fluxo ? (
          <TaxonomiaChip nome={achado.fluxo.nome} cor={achado.fluxo.cor} compact />
        ) : null}
        <Vinculo achado={achado} />
      </div>
    </li>
  );
}

/*
 * TRÊS estados, não dois. "Nunca virou desafio" e "virou DES-014 e o desafio foi
 * excluído" chegam aqui os dois com `desafio_id` nulo — é `desafio_codigo`, que
 * nunca é limpo, que separa os casos. Sem isso a lista de pendentes mandaria
 * refazer trabalho já feito.
 */
function Vinculo({ achado }: { achado: AchadoRow }) {
  const estado = estadoDoVinculo(achado);

  if (estado === "vinculado" && achado.desafio_id && achado.desafio_codigo !== null) {
    return (
      <a
        href={`/desafios/${achado.desafio_id}`}
        className="inline-flex items-center gap-1 rounded-full text-xs font-medium text-primary hover:text-[#1E4A9E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        {codigoDesafio(achado.desafio_codigo)}
        <ArrowTopRightOnSquareIcon aria-hidden className="h-3.5 w-3.5" />
      </a>
    );
  }

  if (estado === "desafio_excluido" && achado.desafio_codigo !== null) {
    return (
      <span className="text-xs text-slate-500">
        {codigoDesafio(achado.desafio_codigo)} (desafio excluído)
      </span>
    );
  }

  return <span className="text-xs text-slate-400">Sem desafio</span>;
}

function opcoesTaxonomia(itens: TaxonomiaOption[], atual: string | null) {
  return [
    { value: "", label: "—" },
    // Arquivada some do seletor, MAS fica quando já é a escolha atual: senão
    // abrir o achado para editar outra coisa o desclassificaria em silêncio ao
    // salvar. Mesma regra do detalhe do desafio.
    ...itens
      .filter((item) => !item.arquivada || item.id === atual)
      .map((item) => ({ value: item.id, label: item.nome })),
  ];
}

function AchadoModal({
  sessaoId,
  perfil,
  varejo,
  achado,
  categorias,
  fluxos,
  onClose,
}: {
  sessaoId: string;
  perfil: Perfil;
  varejo: boolean;
  achado: AchadoRow | null;
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
  onClose: () => void;
}) {
  const [values, setValues] = useState<AchadoFormInput>(
    achado ? paraForm(achado) : vazio(),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const perguntas = perguntasDoPerfil(perfil, varejo);

  function set<K extends keyof AchadoFormInput>(key: K, value: AchadoFormInput[K]) {
    setValues((atual) => ({ ...atual, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = achado
        ? await updateAchado(achado.id, sessaoId, values)
        : await createAchado(sessaoId, values);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={achado ? "Editar achado" : "Registrar achado"}
      width="max-w-lg"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="O problema, em uma frase"
          help="É este texto que vira o título do desafio."
          htmlFor="achado-resumo"
        >
          <Input
            id="achado-resumo"
            value={values.resumo}
            onChange={(event) => set("resumo", event.target.value)}
            maxLength={200}
          />
        </Field>

        <Field
          label="Trecho"
          help="A citação da transcrição, ou o que você observou. Opcional — no modo ficha muitas vezes não há de onde citar."
          htmlFor="achado-trecho"
        >
          <Textarea
            id="achado-trecho"
            value={values.trecho}
            onChange={(event) => set("trecho", event.target.value)}
          />
        </Field>

        <Field
          label="Pergunta de origem"
          help="De qual pergunta do roteiro este achado saiu. Opcional."
          htmlFor="achado-pergunta"
        >
          <Select
            id="achado-pergunta"
            options={[
              { value: "", label: "— observação livre" },
              ...perguntas.map((pergunta) => ({
                value: pergunta.id,
                label: pergunta.rotulo,
              })),
            ]}
            value={values.pergunta_id ?? ""}
            onChange={(event) => set("pergunta_id", event.target.value || null)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Tipo" htmlFor="achado-tipo">
            <Select
              id="achado-tipo"
              options={DESAFIO_TIPO_ORDER.map((id) => ({
                value: id,
                label: DESAFIO_TIPOS[id].label,
              }))}
              value={values.tipo}
              onChange={(event) => set("tipo", event.target.value as DesafioTipo)}
            />
          </Field>

          <Field label="Severidade" htmlFor="achado-severidade">
            <Select
              id="achado-severidade"
              options={DESAFIO_SEVERIDADE_ORDER.map((id) => ({
                value: id,
                label: DESAFIO_SEVERIDADES[id].label,
              }))}
              value={values.severidade}
              onChange={(event) =>
                set("severidade", event.target.value as DesafioSeveridade)
              }
            />
          </Field>

          <Field label="Categoria" htmlFor="achado-categoria">
            <Select
              id="achado-categoria"
              options={opcoesTaxonomia(categorias, values.categoria_id)}
              value={values.categoria_id ?? ""}
              onChange={(event) => set("categoria_id", event.target.value || null)}
            />
          </Field>

          <Field label="Fluxo" htmlFor="achado-fluxo">
            <Select
              id="achado-fluxo"
              options={opcoesTaxonomia(fluxos, values.fluxo_id)}
              value={values.fluxo_id ?? ""}
              onChange={(event) => set("fluxo_id", event.target.value || null)}
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-6 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : achado ? "Salvar" : "Registrar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function VincularModal({
  achado,
  sessaoId,
  desafios,
  onClose,
}: {
  achado: AchadoRow;
  sessaoId: string;
  desafios: DesafioOption[];
  onClose: () => void;
}) {
  const [desafioId, setDesafioId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!desafioId) {
      setError("Escolha o desafio.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await vincularAchadoADesafio(achado.id, sessaoId, desafioId);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Modal open onClose={onClose} title="Vincular a um desafio">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Desafio"
          help="Use quando outro participante já topou com o mesmo problema — é o vínculo que faz a contagem de sessões significar alguma coisa."
          htmlFor="vincular-desafio"
        >
          <Select
            id="vincular-desafio"
            options={[
              { value: "", label: "—" },
              ...desafios.map((desafio) => ({
                value: desafio.id,
                label: `${codigoDesafio(desafio.codigo)} · ${desafio.titulo}`,
              })),
            ]}
            value={desafioId}
            onChange={(event) => setDesafioId(event.target.value)}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-xs text-trend-negative">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-6 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Vinculando…" : "Vincular"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
