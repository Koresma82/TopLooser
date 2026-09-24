import { useState } from 'react'
import { Avatar, IconeMarca, Lupa } from '../Comuns'
import { vencedores } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, comUnidade, dataCurta, percentagemComSinal, primeiroNome } from '../../lib/formato'

const ORDINAL = ['1.º', '2.º', '3.º']

function Lugar({ linha, posicao, cat, modo }) {
  const valor =
    modo === 'absoluto'
      ? comSinal(linha.abs, cat.casas, cat.unidade)
      : percentagemComSinal(linha.pct, 1)
  const bom = linha.ganho !== null && linha.ganho > 0

  return (
    <div className={`podio__lugar podio__lugar--${posicao}`}>
      <span className={`posicao posicao--${posicao}`}>{posicao}</span>
      <Avatar
        nome={linha.participante.nome}
        fotoURL={linha.participante.fotoURL}
        cor={corPorId(linha.participante.cor)}
        tamanho="p"
      />
      <div className="podio__nome">
        {primeiroNome(linha.participante.nome)}
        <span>
          {ORDINAL[posicao - 1]} ·{' '}
          {modo === 'absoluto'
            ? percentagemComSinal(linha.pct, 1)
            : comSinal(linha.abs, cat.casas, cat.unidade)}
        </span>
      </div>
      <span className={`podio__valor ${bom ? 'bom' : 'neutro'}`}>{valor}</span>
    </div>
  )
}

function Lado({ rotulo, ponto, cat, aoAmpliar }) {
  return (
    <div className="comparacao__lado">
      <div className="comparacao__rotulo">{rotulo}</div>
      <div className="comparacao__valor">{ponto ? comUnidade(ponto.valor, cat) : '—'}</div>
      <div className="comparacao__data">{ponto ? dataCurta(ponto.data) : ''}</div>
      {ponto?.registo?.ficheiroURL && (
        <img
          className="comparacao__foto"
          src={ponto.registo.ficheiroURL}
          alt={`Talão de ${rotulo.toLowerCase()}`}
          onClick={() => aoAmpliar(ponto.registo.ficheiroURL)}
        />
      )}
    </div>
  )
}

export default function Vencedores({ evento, participantes, registos }) {
  const [lupa, setLupa] = useState('')
  const modo = evento?.modoRanking || 'percentual'
  const resultados = vencedores(evento, participantes, registos, modo)

  return (
    <>
      <div className="secao__topo">
        <div className="linha" style={{ flexWrap: 'nowrap', gap: 12 }}>
          <IconeMarca nome="desafios" />
          <div>
            <h2>Vencedores do desafio</h2>
            <p className="subtitulo">
              Apurados a {dataCurta(evento.dataFim)}, por{' '}
              {modo === 'absoluto' ? 'variação absoluta' : 'variação em percentagem'}, entre a
              primeira e a última pesagem.
            </p>
          </div>
        </div>
      </div>

      <div className="grelha grelha--2">
        {resultados.map(({ categoria: cat, vencedor, podio }) => (
          <div className="vencedor" key={cat.id}>
            <div className="vencedor__categoria">
              {cat.nome}
              {cat.unidade ? ` · ${cat.unidade}` : ''}
            </div>

            {vencedor ? (
              <>
                <div className="linha" style={{ flexWrap: 'nowrap', gap: 11 }}>
                  <Avatar
                    nome={vencedor.participante.nome}
                    fotoURL={vencedor.participante.fotoURL}
                    cor={corPorId(vencedor.participante.cor)}
                    tamanho="g"
                  />
                  <div>
                    <div className="vencedor__nome">{primeiroNome(vencedor.participante.nome)}</div>
                    <div className="vencedor__detalhe">
                      {cat.direcao === 'descer' ? 'maior descida' : 'maior subida'} do grupo
                    </div>
                  </div>
                </div>

                <div className="vencedor__valor bom">
                  {modo === 'absoluto'
                    ? comSinal(vencedor.abs, cat.casas, cat.unidade)
                    : percentagemComSinal(vencedor.pct, 1)}
                </div>
                <div className="vencedor__detalhe">
                  {modo === 'absoluto'
                    ? `${percentagemComSinal(vencedor.pct, 1)} face ao início`
                    : `${comSinal(vencedor.abs, cat.casas, cat.unidade)} no total`}
                </div>

                <div className="comparacao">
                  <Lado rotulo="Primeira" ponto={vencedor.primeiro} cat={cat} aoAmpliar={setLupa} />
                  <div className="comparacao__seta">→</div>
                  <Lado rotulo="Última" ponto={vencedor.ultimo} cat={cat} aoAmpliar={setLupa} />
                </div>

                <div className="podio">
                  {[0, 1, 2].map((i) =>
                    podio[i] ? (
                      <Lugar
                        key={podio[i].participante.uid}
                        linha={podio[i]}
                        posicao={i + 1}
                        cat={cat}
                        modo={modo}
                      />
                    ) : (
                      <div className="podio__lugar" key={`vazio-${i}`}>
                        <span className="posicao">{i + 1}</span>
                        <span className="podio__vazio">
                          sem ninguém neste lugar — faltaram pesagens
                        </span>
                      </div>
                    )
                  )}
                </div>
              </>
            ) : (
              <p className="subtitulo" style={{ fontSize: '.88rem' }}>
                Sem vencedor nesta categoria — ninguém {cat.direcao === 'descer' ? 'desceu' : 'subiu'}{' '}
                entre a primeira e a última pesagem, ou faltaram registos.
              </p>
            )}
          </div>
        ))}
      </div>

      <Lupa url={lupa} aoFechar={() => setLupa('')} />
    </>
  )
}
