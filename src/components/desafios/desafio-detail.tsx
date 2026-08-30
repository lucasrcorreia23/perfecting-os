"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowTopRightOnSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  DESAFIO_SEVERIDADES,
  DESAFIO_SEVERIDADE_ORDER,
  DESAFIO_STATUSES,
  DESAFIO_STATUS_ORDER,
  DESAFIO_TIPOS,
  DESAFIO_TIPO_ORDER,
  type DesafioSeveridade,
  type DesafioStatus,
  type DesafioTipo,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import {
  deleteDesafio,
  setDesafioStatus,
  updateDesafio,
  type DesafioFormInput,
} from "@/lib/actions/desafios";
import { Button, ButtonLink } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Field, FormSection, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { ActionBar } from "@/components/ui/action-bar";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { DesafioStatusChip } from "@/components/ui/desafio-status-chip";
import { DesafioSeveridadeChip } from "@/components/ui/desafio-severidade-chip";
import { TaxonomiaChip } from "@/components/ui/taxonomia-chip";
import { RecorrenciaCard } from "./recorrencia-card";
import { OcorrenciasCard } from "./ocorrencias-card";
import type { DesafioRow, TaxonomiaOption } from "./desafios-view";

const SEM = "";

function toValues(desafio: DesafioRow): DesafioFormInput {
  return {
    titulo: desafio.titulo,
    descricao: desafio.descricao ?? "",
    tipo: desafio.tipo,
    severidade: desafio.severidade,
    categoria_id: desafio.categoria?.id ?? null,
    fluxo_id: desafio.fluxo?.id ?? null,
    tentativas: desafio.tentativas,
    falhas: desafio.falhas,
    passos: desafio.passos ?? "",
    esperado: desafio.esperado ?? "",
    obtido: desafio.obtido ?? "",
    ambiente: desafio.ambiente ?? "",
    rota: desafio.rota ?? "",
    evidencia_url: desafio.evidencia_url ?? "",
    resolucao: desafio.resolucao ?? "",
    observacoes: desafio.observacoes ?? "",
  };
}

export function DesafioDetail({
  desafio,
  categorias,
  fluxos,
  codigo,
  origem,
}: {
  desafio: DesafioRow;
  categorias: TaxonomiaOption[];
  fluxos: TaxonomiaOption[];
  codigo: string;
  // Slot para o card de procedência em testes de usabilidade. É um Server
  // Component passado como ReactNode: a leitura é derivada de `teste_achados`,
  // e trazê-la para dentro deste componente cliente exigiria uma segunda
  // consulta ou uma coluna nova em `desafios` — que seria a segunda fonte da
  // verdade que o vínculo de aresta única existe para evitar.
  origem?: ReactNode;
}) {
  const router = useRouter();
  const [initial, setInitial] = useState(() => toValues(desafio));
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<DesafioStatus>(desafio.status);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  // Dois transitions: salvar o formulário não pode travar a troca de status
  // nem a exclusão (molde do post-editor).
  const [saving, startSaving] = useTransition();
  const [acting, startActing] = useTransition();

  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  // Os chips do cabeçalho leem o ESTADO do formulário, não a linha do servidor:
  // com metade deles vivo (severidade) e metade congelado (categoria), trocar o
  // seletor ao lado pareceria não ter efeito até salvar.
  const categoriaAtual = categorias.find((linha) => linha.id === values.categoria_id) ?? null;
  const fluxoAtual = fluxos.find((linha) => linha.id === values.fluxo_id) ?? null;

  function set<K extends keyof DesafioFormInput>(key: K, value: DesafioFormInput[K]) {
    setValues((atual) => ({ ...atual, [key]: value }));
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const result = await updateDesafio(desafio.id, values);
      if (result.ok) setInitial(values);
      else setError(result.error);
    });
  }

  // Transição de estado é action dedicada: é ela que mantém
  // `resolvido ⇒ resolvido_em`. Salva na hora, como o status do lead.
  function trocarStatus(proximo: DesafioStatus) {
    setStatus(proximo);
    setError(null);
    startActing(async () => {
      const result = await setDesafioStatus(desafio.id, proximo);
      if (result.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setStatus(desafio.status);
        setError(result.error);
      }
    });
  }

  const opcoes = (linhas: TaxonomiaOption[], vazio: string, atual: string | null) => [
    { value: SEM, label: vazio },
    ...linhas
      // Arquivada some do seletor, MENOS quando é a escolha atual — senão abrir
      // o desafio já o desclassificaria em silêncio ao salvar.
      .filter((linha) => !linha.arquivada || linha.id === atual)
      .map((linha) => ({ value: linha.id, label: linha.nome })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <BackButton href="/desafios" />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs tabular-nums text-slate-400">{codigo}</span>
            </div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {values.titulo.trim() || desafio.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <DesafioStatusChip status={status} />
              <DesafioSeveridadeChip severidade={values.severidade} />
              <TaxonomiaChip nome={categoriaAtual?.nome ?? null} cor={categoriaAtual?.cor} />
              <TaxonomiaChip nome={fluxoAtual?.nome ?? null} cor={fluxoAtual?.cor} />
            </div>
            <p className="text-xs text-slate-500">
              Registrado em {formatDateTime(desafio.created_at)}
              {desafio.resolvido_em
                ? ` · Resolvido em ${formatDateTime(desafio.resolvido_em)}`
                : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saved ? (
            <span aria-live="polite" className="text-xs text-trend-positive">
              Salvo
            </span>
          ) : null}
          <Select
            aria-label="Status do desafio"
            options={DESAFIO_STATUS_ORDER.map((valor) => ({
              value: valor,
              label: DESAFIO_STATUSES[valor].label,
            }))}
            value={status}
            color={DESAFIO_STATUSES[status].color}
            onChange={(event) => trocarStatus(event.target.value as DesafioStatus)}
            className="w-48"
          />
          <Button
            variant="danger"
            icon={TrashIcon}
            onClick={() => {
              setError(null);
              setExcluindo(true);
            }}
          >
            Excluir
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-6 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
            <FormSection title="Relato" first>
              <Field label="Título" htmlFor="desafio-titulo">
                <Input
                  id="desafio-titulo"
                  value={values.titulo}
                  maxLength={200}
                  onChange={(event) => set("titulo", event.target.value)}
                />
              </Field>
              <Field
                label="O que acontece"
                help="A descrição livre do problema, como você contaria a alguém."
                htmlFor="desafio-descricao"
              >
                <Textarea
                  id="desafio-descricao"
                  value={values.descricao}
                  className="min-h-24"
                  onChange={(event) => set("descricao", event.target.value)}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Reprodução"
              description="É o que separa um relato de uma reclamação — e é o que vai no JSON exportado."
            >
              <Field
                label="Passos"
                help="Um por linha."
                htmlFor="desafio-passos"
              >
                <Textarea
                  id="desafio-passos"
                  value={values.passos}
                  className="min-h-24"
                  onChange={(event) => set("passos", event.target.value)}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Resultado esperado" htmlFor="desafio-esperado">
                  <Textarea
                    id="desafio-esperado"
                    value={values.esperado}
                    className="min-h-20"
                    onChange={(event) => set("esperado", event.target.value)}
                  />
                </Field>
                <Field label="Resultado obtido" htmlFor="desafio-obtido">
                  <Textarea
                    id="desafio-obtido"
                    value={values.obtido}
                    className="min-h-20"
                    onChange={(event) => set("obtido", event.target.value)}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Contexto">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label="Ambiente"
                  help="Aparelho, sistema e navegador, numa linha."
                  htmlFor="desafio-ambiente"
                >
                  <Input
                    id="desafio-ambiente"
                    value={values.ambiente}
                    placeholder="iPhone 15 · iOS 18 · Safari"
                    onChange={(event) => set("ambiente", event.target.value)}
                  />
                </Field>
                <Field
                  label="Rota"
                  help="Onde acontece, no endereço."
                  htmlFor="desafio-rota"
                >
                  <Input
                    id="desafio-rota"
                    value={values.rota}
                    placeholder="/clientes/123"
                    onChange={(event) => set("rota", event.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Link de evidência"
                help="Print, gravação ou documento. Guardamos o link, não o arquivo."
                htmlFor="desafio-evidencia"
              >
                <div className="flex items-center gap-2">
                  <Input
                    id="desafio-evidencia"
                    value={values.evidencia_url}
                    placeholder="https://…"
                    onChange={(event) => set("evidencia_url", event.target.value)}
                  />
                  {/* <a> e não <button> com window.open: abrir em nova aba,
                      copiar endereço e o anúncio de "link" do leitor de tela
                      vêm do ELEMENTO, não do estilo (ver button.tsx). */}
                  {desafio.evidencia_url ? (
                    <ButtonLink
                      href={desafio.evidencia_url}
                      variant="tertiary"
                      icon={ArrowTopRightOnSquareIcon}
                      aria-label="Abrir evidência em nova aba"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ) : null}
                </div>
              </Field>
            </FormSection>
          </section>

          <OcorrenciasCard desafioId={desafio.id} ocorrencias={desafio.ocorrencias} />
        </div>

        <div className="flex flex-col gap-6">
          {origem}

          <RecorrenciaCard
            tentativas={values.tentativas}
            falhas={values.falhas}
            ocorrencias={desafio.ocorrencias}
            onChange={(campo, valor) => set(campo, Number.isFinite(valor) ? valor : 0)}
          />

          <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xs font-semibold text-slate-500">Classificação</h2>
            <Field label="Tipo" htmlFor="desafio-tipo">
              <Select
                id="desafio-tipo"
                options={DESAFIO_TIPO_ORDER.map((valor) => ({
                  value: valor,
                  label: DESAFIO_TIPOS[valor].label,
                }))}
                value={values.tipo}
                onChange={(event) => set("tipo", event.target.value as DesafioTipo)}
              />
            </Field>
            <Field label="Severidade" htmlFor="desafio-severidade">
              <Select
                id="desafio-severidade"
                options={DESAFIO_SEVERIDADE_ORDER.map((valor) => ({
                  value: valor,
                  label: DESAFIO_SEVERIDADES[valor].label,
                }))}
                value={values.severidade}
                color={DESAFIO_SEVERIDADES[values.severidade].color}
                onChange={(event) =>
                  set("severidade", event.target.value as DesafioSeveridade)
                }
              />
            </Field>
            <Field label="Categoria" htmlFor="desafio-categoria">
              <Select
                id="desafio-categoria"
                options={opcoes(categorias, "Sem categoria", values.categoria_id)}
                value={values.categoria_id ?? SEM}
                onChange={(event) => set("categoria_id", event.target.value || null)}
              />
            </Field>
            <Field label="Fluxo" htmlFor="desafio-fluxo">
              <Select
                id="desafio-fluxo"
                options={opcoes(fluxos, "Sem fluxo", values.fluxo_id)}
                value={values.fluxo_id ?? SEM}
                onChange={(event) => set("fluxo_id", event.target.value || null)}
              />
            </Field>
          </section>

          <section className="flex flex-col gap-4 rounded-sm border border-slate-200 bg-white p-4 sm:p-6">
            <h2 className="text-xs font-semibold text-slate-500">Fecho</h2>
            <Field
              label="Resolução"
              help="O que foi feito, para quem reabrir o desafio daqui a seis meses."
              htmlFor="desafio-resolucao"
            >
              <Textarea
                id="desafio-resolucao"
                value={values.resolucao}
                className="min-h-20"
                onChange={(event) => set("resolucao", event.target.value)}
              />
            </Field>
            <Field label="Observações internas" htmlFor="desafio-observacoes">
              <Textarea
                id="desafio-observacoes"
                value={values.observacoes}
                className="min-h-20"
                onChange={(event) => set("observacoes", event.target.value)}
              />
            </Field>
          </section>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-trend-negative">
          {error}
        </p>
      ) : null}

      <ActionBar
        dirty={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => setValues(initial)}
      />

      <ConfirmModal
        open={excluindo}
        onClose={() => setExcluindo(false)}
        tone="danger"
        title={`Excluir ${codigo}?`}
        description="As ocorrências registradas vão junto. Esta ação não pode ser desfeita."
        confirmLabel="Excluir desafio"
        loading={acting}
        onConfirm={() =>
          startActing(async () => {
            const result = await deleteDesafio(desafio.id);
            if (result.ok) router.push("/desafios");
            else {
              setExcluindo(false);
              setError(result.error);
            }
          })
        }
      />
    </div>
  );
}
