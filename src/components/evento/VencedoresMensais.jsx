import { useState } from 'react'
import { Avatar, IconeMarca, Vazio } from '../Comuns'
import { categoriasDoEvento } from '../../lib/categorias'
import { nomeDoMes, vencedoresMensais } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, comUnidade, dataCurta, percentagemComSinal, primeiroNome } from '../../lib/formato'

export default function VencedoresMensais({ evento, participantes, registos }) {
  const cats = categoriasDoEvento(evento)
  const [catId, setCatId] = useState(cats[0]?.id || 'peso')
  const modo = evento?.modoRanking || 'percentual'

  const cat = cats.find((c) => c.id === catId) || cats[0]
  if (!cat) return null

  const meses = vencedoresMensais(evento, participantes, registos, cat.id, modo)

  return (
    <section className="secao">
      <div className="secao__topo">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="motivacao" />
          <div>
            <h2>Vencedor do mês</h2>
            <p className="subtitulo">
              Cada mês tem o seu vencedor e pode mudar de dono todos os meses. Conta a diferença
              entre a última pesagem do mês anterior e a última do próprio mês.
            </p>
          </div>
        </div>

        {cats.length > 1 && (
          <div className="chips">
            {cats.map((c) => (
              <button
                key={c.id}
                className={`chip ${c.id === catId ? 'chip--ativo' : ''}`}
                onClick={() => setCatId(c.id)}
              >
                {c.curto}
              </button>
            ))}
          </div>
        )}
      </div>

      {!meses.length ? (
        <Vazio titulo="Ainda não há meses para apurar">
          O primeiro vencedor mensal aparece assim que houver pesagens em dois meses.
        </Vazio>
      ) : (
        <div className="grelha grelha--3">
          {meses.map(({ mes, vencedor, linhas, emCurso }, i) => {
            const restantes = linhas.filter((l) => l.classificado && l !== vencedor).slice(0, 2)
            // Os meses vêm do mais recente para o mais antigo: o último da lista
            // é o mês de partida, que não tem mês anterior com que comparar.
            const mesDePartida = i === meses.length - 1
            return (
              <div className={`mes ${emCurso ? 'mes--curso' : ''}`} key={mes}>
                <div className="linha linha--espaco" style={{ marginBottom: 10 }}>
                  <div>
                    <div className="mes__nome">{nomeDoMes(mes)}</div>
                    <div className="mes__estado">
                      {emCurso ? 'ainda a decorrer' : 'fechado'}
                    </div>
                  </div>
                  {emCurso && <span className="distintivo distintivo--ativo">provisório</span>}
                </div>

                {vencedor ? (
                  <>
                    <div className="linha" style={{ flexWrap: 'nowrap', gap: 10 }}>
                      <Avatar
                        nome={vencedor.participante.nome}
                        fotoURL={vencedor.participante.fotoURL}
                        cor={corPorId(vencedor.participante.cor)}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 680 }}>
                          {primeiroNome(vencedor.participante.nome)}
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--texto-fraco)' }}>
                          {comUnidade(vencedor.inicio?.valor, cat)} →{' '}
                          {comUnidade(vencedor.fim?.valor, cat)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="bom" style={{ fontWeight: 720, fontVariantNumeric: 'tabular-nums' }}>
                          {modo === 'absoluto'
                            ? comSinal(vencedor.abs, cat.casas, cat.unidade)
                            : percentagemComSinal(vencedor.pct, 1)}
                        </div>
                        <div style={{ fontSize: '.72rem', color: 'var(--texto-fraco)' }}>
                          {dataCurta(vencedor.fim?.data)}
                        </div>
                      </div>
                    </div>

                    {restantes.length > 0 && (
                      <div style={{ marginTop: 10, borderTop: '1px solid var(--borda)', paddingTop: 8 }}>
                        {restantes.map((l, j) => (
                          <div
                            className="linha linha--espaco"
                            key={l.participante.uid}
                            style={{ fontSize: '.82rem', padding: '2px 0' }}
                          >
                            <span className="neutro">
                              {j + 2}.º {primeiroNome(l.participante.nome)}
                            </span>
                            <span
                              className={l.ganho > 0 ? 'bom' : l.ganho < 0 ? 'mau' : 'neutro'}
                              style={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {modo === 'absoluto'
                                ? comSinal(l.abs, cat.casas, cat.unidade)
                                : percentagemComSinal(l.pct, 1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="subtitulo" style={{ fontSize: '.84rem', margin: 0 }}>
                    {mesDePartida
                      ? 'Mês de partida — é daqui que se começa a contar.'
                      : linhas.some((l) => l.fim)
                        ? `Ninguém ${cat.direcao === 'descer' ? 'desceu' : 'subiu'} neste mês.`
                        : 'Sem pesagens neste mês.'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
