import { Avatar, IconeMarca } from '../Comuns'
import { liderAtual } from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, dataCurta, percentagemComSinal, primeiroNome } from '../../lib/formato'

// Quem vai em primeiro ao dia de hoje. Como os registos chegam por escuta em
// tempo real, isto reage a cada pesagem nova sem ninguém ter de recarregar.
export default function FaixaLider({ evento, participantes, registos, cat }) {
  const modo = evento?.modoRanking || 'percentual'
  const { lider, empatados, segundo } = liderAtual(participantes, registos, cat.id, modo)

  if (!lider) {
    return (
      <div className="lider">
        <IconeMarca nome="tops" />
        <div className="lider__texto">
          <div className="lider__rotulo">Ao dia de hoje</div>
          <div className="lider__nome">Ainda ninguém está à frente</div>
          <div className="lider__detalhe">
            Falta quem tenha duas pesagens em {cat.nome.toLowerCase()} e tenha{' '}
            {cat.direcao === 'descer' ? 'descido' : 'subido'} desde o início.
          </div>
        </div>
      </div>
    )
  }

  const empate = empatados.length > 1
  const principal =
    modo === 'absoluto' ? comSinal(lider.abs, cat.casas, cat.unidade) : percentagemComSinal(lider.pct, 1)
  const secundario =
    modo === 'absoluto' ? percentagemComSinal(lider.pct, 1) : comSinal(lider.abs, cat.casas, cat.unidade)

  const vantagem =
    segundo && !empate
      ? modo === 'absoluto'
        ? comSinal(lider.ganho - segundo.ganho, cat.casas, cat.unidade).replace('+', '')
        : percentagemComSinal(lider.ganhoPct - segundo.ganhoPct, 1).replace('+', '')
      : null

  return (
    <div className="lider">
      <IconeMarca nome="tops" />

      <div className="linha" style={{ flexWrap: 'nowrap', gap: 10 }}>
        {empatados.map((l) => (
          <Avatar
            key={l.participante.uid}
            nome={l.participante.nome}
            fotoURL={l.participante.fotoURL}
            cor={corPorId(l.participante.cor)}
          />
        ))}
      </div>

      <div className="lider__texto">
        <div className="lider__rotulo">Em primeiro ao dia de hoje · {cat.nome}</div>
        <div className="lider__nome">
          {empate
            ? empatados.map((l) => primeiroNome(l.participante.nome)).join(' e ')
            : primeiroNome(lider.participante.nome)}
        </div>
        <div className="lider__detalhe">
          {empate ? 'empatados à frente' : vantagem ? `${vantagem} à frente do segundo` : 'sozinho na frente'}
          {lider.ultimo && ` · última pesagem a ${dataCurta(lider.ultimo.data)}`}
        </div>
      </div>

      <div className="lider__valor">
        <strong className="bom">{principal}</strong>
        <span>{secundario} desde o início</span>
      </div>
    </div>
  )
}
