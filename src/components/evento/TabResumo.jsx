import { Estatistica, IconeMarca, Vazio } from '../Comuns'
import Vencedores from './Vencedores'
import VencedoresMensais from './VencedoresMensais'
import { useAuth } from '../../contexts/AuthContext'
import { categoriasDoEvento } from '../../lib/categorias'
import {
  calcularVariacao,
  estadoEvento,
  progressoEvento,
  resultadosVisiveis,
  serieCategoria
} from '../../lib/calculos'
import { corPorId } from '../../lib/cores'
import { comSinal, comUnidade, dataCurta, diasEntre, hojeISO, percentagemComSinal } from '../../lib/formato'

export default function TabResumo({ evento, participantes, registos, euParticipante }) {
  const { uid } = useAuth()
  const estado = estadoEvento(evento)
  const cats = categoriasDoEvento(evento)
  const catPrincipal = cats[0]
  const fechado = resultadosVisiveis(evento)

  const diasQueFaltam = diasEntre(hojeISO(), evento.dataFim)
  const diasDesdeInicio = diasEntre(evento.dataInicio, hojeISO())

  const minhaSerie = euParticipante
    ? serieCategoria(registos, uid, catPrincipal?.id, euParticipante)
    : []
  const minhaVariacao = calcularVariacao(minhaSerie, catPrincipal)

  return (
    <>
      {evento.descricao && (
        <div className="cartao" style={{ marginBottom: 18 }}>
          <p>{evento.descricao}</p>
          {evento.premio && (
            <p className="subtitulo" style={{ marginTop: 10 }}>
              <strong>Prémio:</strong> {evento.premio}
            </p>
          )}
        </div>
      )}

      <div className="grelha grelha--4" style={{ marginBottom: 22 }}>
        <Estatistica
          rotulo="Participantes"
          valor={participantes.length}
          nota={participantes.length === 1 ? 'só tu, por enquanto' : 'no desafio'}
        />
        <Estatistica
          rotulo="Pesagens registadas"
          valor={registos.length}
          nota={`${new Set(registos.map((r) => r.uid)).size} de ${participantes.length} já registaram`}
        />
        <Estatistica
          rotulo={estado === 'agendado' ? 'Começa em' : fechado ? 'Terminou em' : 'Faltam'}
          valor={
            estado === 'agendado'
              ? `${Math.max(0, diasEntre(hojeISO(), evento.dataInicio))} dias`
              : fechado
                ? dataCurta(evento.dataFim)
                : `${Math.max(0, diasQueFaltam)} dias`
          }
          nota={
            estado === 'agendado'
              ? `início a ${dataCurta(evento.dataInicio)}`
              : fechado
                ? `durou ${Math.max(0, diasEntre(evento.dataInicio, evento.dataFim))} dias`
                : `vai em ${Math.max(0, diasDesdeInicio)} dias`
          }
          progresso={estado === 'ativo' ? progressoEvento(evento) : null}
        />
        {euParticipante && catPrincipal && (
          <Estatistica
            rotulo={`O meu ${catPrincipal.nome.toLowerCase()}`}
            valor={
              minhaSerie.length
                ? comUnidade(minhaSerie[minhaSerie.length - 1].valor, catPrincipal)
                : '—'
            }
            cor={corPorId(euParticipante.cor)}
            nota={
              minhaVariacao.abs !== null
                ? `${comSinal(minhaVariacao.abs, catPrincipal.casas, catPrincipal.unidade)} · ${percentagemComSinal(
                    minhaVariacao.pct,
                    1
                  )}`
                : minhaSerie.length
                  ? 'falta uma segunda pesagem'
                  : 'ainda sem registos'
            }
          />
        )}
      </div>

      {fechado ? (
        <section className="secao">
          <Vencedores evento={evento} participantes={participantes} registos={registos} />
        </section>
      ) : (
        <div className="cartao secao">
          <div className="linha" style={{ flexWrap: 'nowrap', gap: 12, alignItems: 'flex-start' }}>
            <IconeMarca nome="desafios" />
            <div>
              <h3>Vencedores do desafio</h3>
              <p className="subtitulo" style={{ marginTop: 6 }}>
                O pódio de cada categoria — primeiro, segundo e terceiro — é revelado a{' '}
                <strong>{dataCurta(evento.dataFim)}</strong>, com a primeira e a última pesagem
                lado a lado. Até lá, a classificação provisória está no separador{' '}
                <em>Classificação</em>.
              </p>
              {estado === 'agendado' && (
                <p className="subtitulo" style={{ marginTop: 8 }}>
                  O desafio ainda não começou — podes registar já uma pesagem de referência.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <VencedoresMensais evento={evento} participantes={participantes} registos={registos} />

      {!participantes.length && (
        <Vazio titulo="Ainda ninguém entrou">Sê o primeiro a inscrever-te.</Vazio>
      )}
    </>
  )
}
