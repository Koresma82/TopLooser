import { useMemo, useState } from 'react'
import { Avatar, Carregar, IconeMarca, Vazio } from '../Comuns'
import { ACOES, ACOES_DE_GESTAO, rotuloAcao } from '../../lib/auditoria'
import { paraData } from '../../hooks/useAdmin'
import { dataHora, haQuantoTempo, primeiroNome } from '../../lib/formato'

const GRUPOS = [
  { id: 'todas', nome: 'Tudo' },
  { id: 'entrada', nome: 'Entradas' },
  { id: 'gestao', nome: 'Gestão' },
  { id: 'pesagens', nome: 'Pesagens' },
  { id: 'inscricoes', nome: 'Inscrições' }
]

const POR_GRUPO = {
  entrada: ['entrada'],
  gestao: ACOES_DE_GESTAO,
  pesagens: ['pesagem-criada', 'pesagem-editada', 'pesagem-apagada'],
  inscricoes: ['inscricao', 'saida', 'participante-removido']
}

// Cor do ponto conforme o peso da ação: o que o admin faz destaca-se do
// movimento normal, e o que apaga alguma coisa destaca-se de tudo.
function tom(acao) {
  if (acao.includes('apagad')) return 'var(--mau)'
  if (ACOES_DE_GESTAO.includes(acao)) return 'var(--aviso)'
  if (acao === 'entrada') return 'var(--destaque)'
  return 'var(--texto-fraco)'
}

function paraCSV(linhas) {
  const cabecalho = ['quando', 'nome', 'email', 'acao', 'detalhe', 'eventoId']
  const escapar = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const corpo = linhas.map((l) =>
    [
      paraData(l.quando)?.toISOString() || '',
      l.nome,
      l.email,
      rotuloAcao(l.acao),
      l.detalhe,
      l.eventoId || ''
    ]
      .map(escapar)
      .join(',')
  )
  return [cabecalho.join(','), ...corpo].join('\n')
}

export default function PainelAuditoria({ dados }) {
  const { auditoria, porUtilizador, aCarregar, erro, limiteAuditoria } = dados
  const [grupo, setGrupo] = useState('todas')
  const [pessoa, setPessoa] = useState('todas')

  const filtrada = useMemo(() => {
    return auditoria.filter((a) => {
      if (pessoa !== 'todas' && a.uid !== pessoa) return false
      if (grupo === 'todas') return true
      return (POR_GRUPO[grupo] || []).includes(a.acao)
    })
  }, [auditoria, grupo, pessoa])

  function exportar() {
    const csv = paraCSV(filtrada)
    // BOM à frente: sem isto o Excel abre os acentos trocados.
    const ficheiro = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(ficheiro)
    const a = document.createElement('a')
    a.href = url
    a.download = `toplooser-auditoria-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (aCarregar) return <Carregar texto="A carregar o registo…" />

  if (erro) {
    return (
      <div className="alerta alerta--erro">
        Não foi possível ler o registo. Publica as regras novas com{' '}
        <code>npm run regras:todos</code>.
      </div>
    )
  }

  return (
    <>
      <div className="secao__topo">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="desafios" />
          <div>
            <h2>Registo de atividade</h2>
            <p className="subtitulo">
              As últimas {limiteAuditoria} ações, da mais recente para a mais antiga.
            </p>
          </div>
        </div>
        <button className="btn" onClick={exportar} disabled={!filtrada.length}>
          Exportar {filtrada.length} linhas
        </button>
      </div>

      <div className="linha linha--espaco" style={{ marginBottom: 14 }}>
        <div className="chips">
          {GRUPOS.map((g) => (
            <button
              key={g.id}
              className={`chip ${grupo === g.id ? 'chip--ativo' : ''}`}
              onClick={() => setGrupo(g.id)}
            >
              {g.nome}
            </button>
          ))}
        </div>

        <div className="campo" style={{ margin: 0, minWidth: 190 }}>
          <select value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
            <option value="todas">Toda a gente</option>
            {porUtilizador.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!filtrada.length ? (
        <Vazio titulo="Nada a mostrar com estes filtros">
          {auditoria.length
            ? 'Experimenta alargar o filtro.'
            : 'O registo começa a encher-se assim que alguém entrar na aplicação.'}
        </Vazio>
      ) : (
        <div className="lista-cartoes">
          {filtrada.map((a) => {
            const quando = paraData(a.quando)
            return (
              <div className="linha-auditoria" key={a.id}>
                <span className="linha-auditoria__ponto" style={{ background: tom(a.acao) }} />
                <Avatar nome={a.nome} tamanho="p" />
                <div className="linha-auditoria__corpo">
                  <div>
                    <strong>{primeiroNome(a.nome)}</strong> · {rotuloAcao(a.acao)}
                    {a.detalhe && <span className="neutro"> — {a.detalhe}</span>}
                  </div>
                  <div className="linha-auditoria__meta">{a.email}</div>
                </div>
                <div className="linha-auditoria__quando" title={quando ? dataHora(quando) : ''}>
                  {haQuantoTempo(quando)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="alerta" style={{ marginTop: 16 }}>
        <strong>O que isto é, e o que não é.</strong> O registo é escrito pelo browser de cada
        pessoa. As regras impedem que alguém escreva em nome de outro, que altere ou que apague —
        mas nada obriga o browser a escrever. Serve para acompanhar a atividade do grupo, não
        para provar alguma coisa contra quem queira enganar o sistema.
      </div>
    </>
  )
}
