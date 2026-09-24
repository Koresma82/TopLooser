import { useState } from 'react'
import GraficoEvolucao from './GraficoEvolucao'
import FaixaLider from './FaixaLider'
import { categoriasDoEvento } from '../../lib/categorias'
import { classificacao } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, comUnidade, dataCurta, percentagemComSinal, primeiroNome } from '../../lib/formato'
import { Avatar, IconeMarca, Vazio } from '../Comuns'
import { useTelemovel } from '../../hooks/useEcra'

export default function TabEvolucao({ evento, participantes, registos }) {
  const telemovel = useTelemovel()
  const cats = categoriasDoEvento(evento)
  const [catId, setCatId] = useState(cats[0]?.id || 'peso')
  const [vista, setVista] = useState('valor')

  const cat = cats.find((c) => c.id === catId) || cats[0]
  if (!cat) return <Vazio titulo="Este evento não tem categorias configuradas." />

  const linhas = classificacao(participantes, registos, cat.id, 'percentual')

  return (
    <>
      <FaixaLider evento={evento} participantes={participantes} registos={registos} cat={cat} />

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
            className={`chip ${vista === 'valor' ? 'chip--ativo' : ''}`}
            onClick={() => setVista('valor')}
          >
            Valor medido
          </button>
          <button
            className={`chip ${vista === 'variacao' ? 'chip--ativo' : ''}`}
            onClick={() => setVista('variacao')}
          >
            Variação desde o início
          </button>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 18 }}>
        <div className="linha linha--espaco" style={{ marginBottom: 6 }}>
          <div className="linha" style={{ flexWrap: 'nowrap', gap: 10 }}>
            <IconeMarca nome="datas" tamanho="p" />
            <h3>
              {cat.nome}
              {cat.unidade ? ` (${cat.unidade})` : ''}
            </h3>
          </div>
          <span className="subtitulo" style={{ fontSize: '.82rem' }}>
            {cat.direcao === 'descer' ? 'descer é ganhar' : 'subir é ganhar'}
          </span>
        </div>
        <p className="subtitulo" style={{ fontSize: '.84rem', marginBottom: 14 }}>
          {vista === 'variacao'
            ? 'Cada linha começa no zero, na primeira pesagem de cada um.'
            : cat.ajuda}
        </p>

        <GraficoEvolucao participantes={participantes} registos={registos} cat={cat} vista={vista} />
      </div>

      {telemovel ? (
        <div className="lista-cartoes">
          {linhas.map((l) => {
            const cor = corPorId(l.participante.cor)
            const bom = l.ganho !== null && l.ganho > 0
            const mau = l.ganho !== null && l.ganho < 0
            return (
              <div
                className="cartao-lugar"
                key={l.participante.uid}
                style={{ '--cor-participante': cor }}
              >
                <Avatar
                  nome={l.participante.nome}
                  fotoURL={l.participante.fotoURL}
                  cor={cor}
                />
                <div className="cartao-lugar__corpo">
                  <div className="cartao-lugar__nome">{primeiroNome(l.participante.nome)}</div>
                  <div className="cartao-lugar__nota">
                    {l.primeiro ? (
                      <>
                        {comUnidade(l.primeiro.valor, cat)} → {comUnidade(l.ultimo.valor, cat)} ·{' '}
                        {l.nRegistos} {l.nRegistos === 1 ? 'pesagem' : 'pesagens'}
                      </>
                    ) : (
                      'ainda sem pesagens'
                    )}
                  </div>
                </div>
                <div className="cartao-lugar__valor">
                  <strong className={bom ? 'bom' : mau ? 'mau' : 'neutro'}>
                    {percentagemComSinal(l.pct, 1)}
                  </strong>
                  <span>{comSinal(l.abs, cat.casas, cat.unidade)}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div className="cartao cartao--limpo">
        <div className="tabela-envolvente">
          <table className="tabela">
            <thead>
              <tr>
                <th>Participante</th>
                <th className="num">Primeira</th>
                <th className="num">Última</th>
                <th className="num">Variação</th>
                <th className="num">%</th>
                <th className="num">Pesagens</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const cor = corPorId(l.participante.cor)
                const bom = l.ganho !== null && l.ganho > 0
                const mau = l.ganho !== null && l.ganho < 0
                return (
                  <tr key={l.participante.uid}>
                    <td>
                      <div className="linha" style={{ flexWrap: 'nowrap', gap: 9 }}>
                        <Avatar
                          nome={l.participante.nome}
                          fotoURL={l.participante.fotoURL}
                          cor={cor}
                          tamanho="p"
                        />
                        <span>{primeiroNome(l.participante.nome)}</span>
                      </div>
                    </td>
                    <td className="num">
                      {l.primeiro ? comUnidade(l.primeiro.valor, cat) : '—'}
                      {l.primeiro && (
                        <div style={{ fontSize: '.74rem', color: 'var(--texto-fraco)' }}>
                          {dataCurta(l.primeiro.data)}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      {l.ultimo ? comUnidade(l.ultimo.valor, cat) : '—'}
                      {l.ultimo && (
                        <div style={{ fontSize: '.74rem', color: 'var(--texto-fraco)' }}>
                          {dataCurta(l.ultimo.data)}
                        </div>
                      )}
                    </td>
                    <td className={`num ${bom ? 'bom' : mau ? 'mau' : 'neutro'}`}>
                      {comSinal(l.abs, cat.casas, cat.unidade)}
                    </td>
                    <td className={`num ${bom ? 'bom' : mau ? 'mau' : 'neutro'}`}>
                      {percentagemComSinal(l.pct, 1)}
                    </td>
                    <td className="num">{l.nRegistos}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </>
  )
}
