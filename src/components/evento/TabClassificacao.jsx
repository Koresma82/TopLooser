import { useState } from 'react'
import { categoriasDoEvento } from '../../lib/categorias'
import { classificacao, resultadosVisiveis } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, comUnidade, dataCurta, percentagemComSinal, primeiroNome } from '../../lib/formato'
import { Avatar, IconeMarca, Vazio } from '../Comuns'

export default function TabClassificacao({ evento, participantes, registos }) {
  const cats = categoriasDoEvento(evento)
  const [catId, setCatId] = useState(cats[0]?.id || 'peso')
  const [modo, setModo] = useState(evento?.modoRanking || 'percentual')

  const cat = cats.find((c) => c.id === catId) || cats[0]
  if (!cat) return <Vazio titulo="Este evento não tem categorias configuradas." />

  const linhas = classificacao(participantes, registos, cat.id, modo)
  const fechado = resultadosVisiveis(evento)

  return (
    <>
      <div className="secao__topo">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="tops" />
          <div>
            <h2>Classificação</h2>
            <p className="subtitulo">Quem vai à frente em cada categoria, desde o início.</p>
          </div>
        </div>
      </div>

      <div className="linha linha--espaco" style={{ marginBottom: 14 }}>
        <div className="chips">
          {cats.map((c) => (
            <button
              key={c.id}
              className={`chip ${c.id === catId ? 'chip--ativo' : ''}`}
              onClick={() => setCatId(c.id)}
            >
              {c.nome}
            </button>
          ))}
        </div>
        <div className="chips">
          <button
            className={`chip ${modo === 'percentual' ? 'chip--ativo' : ''}`}
            onClick={() => setModo('percentual')}
          >
            Por percentagem
          </button>
          <button
            className={`chip ${modo === 'absoluto' ? 'chip--ativo' : ''}`}
            onClick={() => setModo('absoluto')}
          >
            Por valor absoluto
          </button>
        </div>
      </div>

      {!fechado && (
        <div className="alerta" style={{ marginBottom: 14 }}>
          Classificação provisória — conta a diferença entre a primeira e a última pesagem de cada
          um. Os vencedores oficiais só são apurados a {dataCurta(evento.dataFim)}, pelo critério{' '}
          <strong>
            {evento?.modoRanking === 'absoluto' ? 'de valor absoluto' : 'de percentagem'}
          </strong>
          .
        </div>
      )}

      <div className="cartao cartao--limpo">
        <div className="tabela-envolvente">
          <table className="tabela">
            <thead>
              <tr>
                <th style={{ width: 46 }}>#</th>
                <th>Participante</th>
                <th className="num">Início</th>
                <th className="num">Agora</th>
                <th className="num">{modo === 'absoluto' ? 'Variação' : 'Variação %'}</th>
                <th className="num esconder-movel">
                  {modo === 'absoluto' ? '%' : `Em ${cat.unidade || 'pontos'}`}
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const cor = corPorId(l.participante.cor)
                const bom = l.ganho !== null && l.ganho > 0
                const mau = l.ganho !== null && l.ganho < 0
                const principal =
                  modo === 'absoluto'
                    ? comSinal(l.abs, cat.casas, cat.unidade)
                    : percentagemComSinal(l.pct, 1)
                const secundario =
                  modo === 'absoluto'
                    ? percentagemComSinal(l.pct, 1)
                    : comSinal(l.abs, cat.casas, cat.unidade)

                return (
                  <tr key={l.participante.uid}>
                    <td>
                      {l.posicao ? (
                        <span className={`posicao ${l.posicao <= 3 ? `posicao--${l.posicao}` : ''}`}>
                          {l.posicao}
                        </span>
                      ) : (
                        <span className="posicao">—</span>
                      )}
                    </td>
                    <td>
                      <div className="linha" style={{ flexWrap: 'nowrap', gap: 9 }}>
                        <Avatar
                          nome={l.participante.nome}
                          fotoURL={l.participante.fotoURL}
                          cor={cor}
                          tamanho="p"
                        />
                        <div>
                          <div>{primeiroNome(l.participante.nome)}</div>
                          {!l.classificado && (
                            <div style={{ fontSize: '.74rem', color: 'var(--texto-fraco)' }}>
                              {l.nRegistos === 0
                                ? 'ainda sem pesagens'
                                : 'falta uma segunda pesagem'}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="num">{l.primeiro ? comUnidade(l.primeiro.valor, cat) : '—'}</td>
                    <td className="num">{l.ultimo ? comUnidade(l.ultimo.valor, cat) : '—'}</td>
                    <td className={`num ${bom ? 'bom' : mau ? 'mau' : 'neutro'}`} style={{ fontWeight: 650 }}>
                      {l.classificado ? principal : '—'}
                    </td>
                    <td className="num esconder-movel neutro">{l.classificado ? secundario : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="subtitulo" style={{ marginTop: 12, fontSize: '.82rem' }}>
        {cat.direcao === 'descer'
          ? `Em ${cat.nome.toLowerCase()}, ganha quem mais desceu.`
          : `Em ${cat.nome.toLowerCase()}, ganha quem mais subiu.`}{' '}
        Quem só tem uma pesagem ainda não entra na classificação.
      </p>
    </>
  )
}
