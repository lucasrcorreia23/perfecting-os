"use client";

import { Field, Input, Textarea } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import {
  dependenciaSatisfeita,
  limparDependentes,
  type RespostaValor,
  type RespostasMap,
} from "@/lib/usabilidade/respostas";
import {
  blocosDoPerfil,
  perguntasDoPerfil,
  type Perfil,
  type Pergunta,
} from "@/lib/usabilidade/roteiro";

/*
 * O formulário do roteiro, escrito UMA vez.
 *
 * Ele serve o cadastro manual e — na etapa de importação — a revisão do que foi
 * lido do texto colado. Duas telas separadas para as mesmas 70 perguntas seriam
 * o maior componente do repositório em duplicata, e a segunda cópia divergiria
 * da primeira na terceira pergunta que mudasse.
 *
 * Ele é dirigido por `blocosDoPerfil`: quem decide o que aparece é o roteiro,
 * nunca uma lista aqui dentro.
 */

export function RespostasForm({
  respostas,
  onChange,
  campoComErro,
  camposDestacados,
  disabled,
}: {
  respostas: RespostasMap;
  onChange: (proximas: RespostasMap) => void;
  campoComErro?: string | null;
  // Usado pela revisão da importação para marcar o que não foi reconhecido.
  camposDestacados?: Record<string, string>;
  disabled?: boolean;
}) {
  const perfilBruto = respostas.b0_perfil;
  const perfil: Perfil | null =
    perfilBruto === "gestor" || perfilBruto === "vendedor" ? perfilBruto : null;
  const varejo = respostas.b0_varejo === "sim";

  const aplicaveis = perguntasDoPerfil(perfil, varejo);
  const blocos = blocosDoPerfil(perfil, varejo);

  function definir(pergunta: Pergunta, valor: RespostaValor | undefined) {
    const proximas: RespostasMap = { ...respostas };
    if (valor === undefined || valor === "") delete proximas[pergunta.id];
    else proximas[pergunta.id] = valor;
    // Trocar o perfil muda o roteiro inteiro, então a limpeza usa as perguntas
    // do estado NOVO — senão uma resposta de gestor sobreviveria a virar
    // vendedor, invisível na tela e viva no jsonb.
    const novoPerfil = proximas.b0_perfil;
    const perfilDepois: Perfil | null =
      novoPerfil === "gestor" || novoPerfil === "vendedor" ? novoPerfil : null;
    onChange(
      limparDependentes(
        perguntasDoPerfil(perfilDepois, proximas.b0_varejo === "sim"),
        proximas,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {blocos.map((bloco) => (
        <section key={bloco.id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-slate-700">{bloco.titulo}</h3>
            {bloco.descricao ? (
              <p className="text-xs text-slate-500">{bloco.descricao}</p>
            ) : null}
          </div>

          {/*
            Curtos e abertos são renderizados SEPARADOS, e não é arranjo: o
            `alinhado` do Field usa `grid-rows-subgrid`, que só herda as faixas
            do pai quando o Field é filho DIRETO da grade. Embrulhar um campo
            num <div> para dar-lhe largura dupla quebraria o subgrid de toda a
            linha em silêncio — os rótulos voltariam a sair tortos quando uma
            ajuda ocupasse duas linhas e a vizinha uma.
          */}
          {(() => {
            const visiveis = bloco.perguntas.filter((pergunta) =>
              // Pergunta dependente só existe quando a condição vale — e o
              // estado já foi limpo por `limparDependentes`, então a tela e o
              // dado dizem a mesma coisa.
              dependenciaSatisfeita(pergunta, respostas),
            );
            const curtos = visiveis.filter((p) => p.forma.tipo !== "texto");
            const abertos = visiveis.filter((p) => p.forma.tipo === "texto");

            const campo = (pergunta: Pergunta) => (
              <CampoPergunta
                key={pergunta.id}
                pergunta={pergunta}
                valor={respostas[pergunta.id]}
                onChange={(valor) => definir(pergunta, valor)}
                erro={
                  campoComErro === pergunta.id ? "Confira esta resposta." : undefined
                }
                destaque={camposDestacados?.[pergunta.id]}
                disabled={disabled}
              />
            );

            return (
              <div className="flex flex-col gap-4">
                {curtos.length > 0 ? (
                  <div className="grid grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-4 md:grid-cols-2">
                    {curtos.map(campo)}
                  </div>
                ) : null}
                {abertos.length > 0 ? (
                  <div className="flex flex-col gap-4">{abertos.map(campo)}</div>
                ) : null}
              </div>
            );
          })()}
        </section>
      ))}

      <ForaDoRoteiro respostas={respostas} aplicaveis={aplicaveis} />
    </div>
  );
}

function CampoPergunta({
  pergunta,
  valor,
  onChange,
  erro,
  destaque,
  disabled,
}: {
  pergunta: Pergunta;
  valor: RespostaValor | undefined;
  onChange: (valor: RespostaValor | undefined) => void;
  erro?: string;
  destaque?: string;
  disabled?: boolean;
}) {
  const id = `pergunta-${pergunta.id}`;
  const numero = pergunta.numero ? `${pergunta.numero}. ` : "";
  const ajuda = destaque ?? pergunta.ajuda ?? ajudaDaForma(pergunta);
  // Aberta ocupa a largura toda e vive fora da grade, então não usa `alinhado`:
  // não há vizinha com quem alinhar faixa.
  const naGrade = pergunta.forma.tipo !== "texto";

  return (
    <Field
      label={`${numero}${pergunta.rotulo}`}
      help={ajuda}
      error={erro}
      htmlFor={id}
      alinhado={naGrade}
    >
      {renderControle(pergunta, id, valor, onChange, disabled)}
    </Field>
  );
}

function ajudaDaForma(pergunta: Pergunta): string | undefined {
  if (pergunta.forma.tipo === "escala") {
    const { min, max, ancoras } = pergunta.forma;
    return ancoras
      ? `${min} = ${ancoras[0]}, ${max} = ${ancoras[1]}.`
      : `De ${min} a ${max}.`;
  }
  if (pergunta.forma.tipo === "duracao") return "Em minutos.";
  return undefined;
}

function renderControle(
  pergunta: Pergunta,
  id: string,
  valor: RespostaValor | undefined,
  onChange: (valor: RespostaValor | undefined) => void,
  disabled?: boolean,
) {
  switch (pergunta.forma.tipo) {
    case "escolha":
      return (
        <Select
          id={id}
          disabled={disabled}
          options={[
            { value: "", label: "—" },
            ...pergunta.forma.opcoes.map((opcao) => ({
              value: opcao.id,
              label: opcao.label,
            })),
          ]}
          value={typeof valor === "string" ? valor : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      );

    case "escala": {
      // Select e não uma fita de botões: 11 alvos de 44px passam de 480px e não
      // cabem num celular de 375, e uma fita que rola horizontalmente esconde
      // metade da régua.
      const { min, max } = pergunta.forma;
      const numeros = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <Select
          id={id}
          disabled={disabled}
          options={[
            { value: "", label: "—" },
            ...numeros.map((n) => ({ value: String(n), label: String(n) })),
          ]}
          value={typeof valor === "number" ? String(valor) : ""}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : undefined)
          }
        />
      );
    }

    case "data":
      return (
        <Input
          id={id}
          type="date"
          disabled={disabled}
          value={typeof valor === "string" ? valor : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      );

    case "duracao":
      return (
        <Input
          id={id}
          type="number"
          min={1}
          inputMode="numeric"
          disabled={disabled}
          value={typeof valor === "number" ? String(valor) : ""}
          onChange={(event) =>
            onChange(event.target.value ? Number(event.target.value) : undefined)
          }
        />
      );

    case "texto":
      return (
        <Textarea
          id={id}
          disabled={disabled}
          value={typeof valor === "string" ? valor : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      );

    case "texto_curto":
      return (
        <Input
          id={id}
          disabled={disabled}
          value={typeof valor === "string" ? valor : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      );
  }
}

/*
 * Respostas cujo id não está mais no roteiro. Elas NÃO somem da tela: o roteiro
 * mora em código e só a versão corrente existe, então uma sessão antiga pode
 * carregar uma pergunta que foi removida ou renomeada. Escondê-la faria a
 * sessão perder dado em silêncio no dia em que o roteiro mudasse.
 */
function ForaDoRoteiro({
  respostas,
  aplicaveis,
}: {
  respostas: RespostasMap;
  aplicaveis: readonly Pergunta[];
}) {
  const conhecidas = new Set(aplicaveis.map((pergunta) => pergunta.id));
  const orfas = Object.entries(respostas).filter(([id]) => !conhecidas.has(id));
  if (orfas.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-sm border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-slate-700">Fora do roteiro atual</h3>
        <p className="text-xs text-slate-500">
          Respostas de uma versão anterior do roteiro, ou de outro perfil. Ficam
          guardadas como estão.
        </p>
      </div>
      <dl className="flex flex-col gap-3">
        {orfas.map(([id, valor]) => (
          <div key={id} className="flex flex-col gap-1">
            <dt className="text-xs text-slate-500">{id}</dt>
            <dd className="whitespace-pre-wrap break-words text-sm text-slate-800">
              {String(valor)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
