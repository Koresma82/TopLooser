import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../Comuns'
import { categoriasDoEvento, categoriasEditaveis, CATEGORIAS_POR_ID } from '../../lib/categorias'
import { calcularImc, classeImc } from '../../lib/calculos'
import { comUnidade, dataCurta, hojeISO, numero } from '../../lib/formato'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { atualizarParticipante, atualizarRegisto, criarRegisto } from '../../lib/servicos'
import { lerTalao } from '../../lib/ocr'

const TAMANHO_MAXIMO = 10 * 1024 * 1024

const ROTULO_CONFIANCA = {
  alta: 'leitura nítida',
  media: 'confere com atenção',
  baixa: 'leitura duvidosa'
}

export default function ModalRegisto({ aberto, aoFechar, evento, participante, registo }) {
  const { utilizador } = useAuth()
  const toast = useToast()
  const inputFicheiro = useRef(null)

  const editaveis = useMemo(() => categoriasEditaveis(evento), [evento])
  const todas = useMemo(() => categoriasDoEvento(evento), [evento])
  const mostraImc = todas.some((c) => c.id === 'imc')

  const [data, setData] = useState(hojeISO())
  const [valores, setValores] = useState({})
  const [notas, setNotas] = useState('')
  const [ficheiro, setFicheiro] = useState(null)
  const [prever, setPrever] = useState('')
  const [aGravar, setAGravar] = useState(false)

  // Leitura automática
  const [aLer, setALer] = useState(false)
  const [leitura, setLeitura] = useState(null)
  const [erroLeitura, setErroLeitura] = useState(null)
  const [camposIA, setCamposIA] = useState([])

  useEffect(() => {
    if (!aberto) return
    if (registo) {
      setData(registo.data || hojeISO())
      const v = {}
      Object.entries(registo.valores || {}).forEach(([k, valor]) => {
        v[k] = String(valor)
      })
      setValores(v)
      setNotas(registo.notas || '')
      setPrever(registo.ficheiroURL || '')
    } else {
      setData(hojeISO())
      setValores({})
      setNotas('')
      setPrever('')
    }
    setFicheiro(null)
    setLeitura(null)
    setErroLeitura(null)
    setCamposIA([])
    setALer(false)
  }, [aberto, registo])

  // Liberta o URL temporário da pré-visualização.
  useEffect(() => {
    if (!ficheiro) return undefined
    const url = URL.createObjectURL(ficheiro)
    setPrever(url)
    return () => URL.revokeObjectURL(url)
  }, [ficheiro])

  const imcCalculado = calcularImc(
    String(valores.peso || '').replace(',', '.'),
    participante?.alturaCm
  )

  // Altura do talão diferente da que está na ficha.
  const alturaDivergente =
    leitura?.alturaCm &&
    participante?.alturaCm &&
    Math.abs(leitura.alturaCm - participante.alturaCm) >= 1

  // Campos que o talão trazia mas que este desafio não acompanha de todo.
  // O IMC não entra aqui: é acompanhado, só não se escreve à mão.
  const foraDoDesafio = leitura
    ? Object.keys(leitura.valores).filter((id) => !todas.some((c) => c.id === id))
    : []

  async function correrLeitura(f) {
    setALer(true)
    setErroLeitura(null)
    try {
      const resultado = await lerTalao(f)
      setLeitura(resultado)

      // Calculado fora do setValores: o updater do React pode correr mais tarde
      // (e duas vezes em modo estrito), por isso não serve para contar campos.
      const preenchidos = editaveis
        .filter((cat) => resultado.valores[cat.id] !== undefined)
        .map((cat) => cat.id)

      setValores((atuais) => {
        const novos = { ...atuais }
        preenchidos.forEach((id) => {
          novos[id] = String(resultado.valores[id])
        })
        return novos
      })
      setCamposIA(preenchidos)

      if (resultado.data) setData(resultado.data)

      if (!preenchidos.length) {
        toast.info('Não consegui aproveitar nenhum valor do talão. Preenche à mão.')
      } else {
        toast.sucesso(
          `Li ${preenchidos.length} ${preenchidos.length === 1 ? 'valor' : 'valores'} do talão. Confere antes de guardar.`
        )
      }
    } catch (e) {
      setErroLeitura(e.mensagem || e.message || 'Falhou a leitura do talão.')
    } finally {
      setALer(false)
    }
  }

  function escolherFicheiro(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.type.startsWith('image/')) {
      toast.erro('A foto do talão tem de ser uma imagem.')
      return
    }
    if (f.size > TAMANHO_MAXIMO) {
      toast.erro('A imagem é demasiado grande (máximo 10 MB).')
      return
    }
    setFicheiro(f)
    setLeitura(null)
    setErroLeitura(null)
    setCamposIA([])
    correrLeitura(f)
  }

  function mudarValor(catId, valor) {
    setValores((atuais) => ({ ...atuais, [catId]: valor }))
    // Um campo editado à mão deixa de estar marcado como lido pela IA.
    setCamposIA((atuais) => atuais.filter((id) => id !== catId))
  }

  async function aplicarAltura() {
    try {
      await atualizarParticipante(evento.id, participante.uid, { alturaCm: leitura.alturaCm })
      toast.sucesso(`Altura atualizada para ${leitura.alturaCm} cm.`)
    } catch {
      toast.erro('Não foi possível atualizar a altura.')
    }
  }

  async function gravar() {
    const preenchidos = Object.entries(valores).filter(
      ([, v]) => v !== '' && v !== null && v !== undefined
    )
    if (!preenchidos.length) {
      toast.erro('Preenche pelo menos um valor.')
      return
    }
    if (!data) {
      toast.erro('Indica a data da pesagem.')
      return
    }

    for (const cat of editaveis) {
      const bruto = valores[cat.id]
      if (bruto === '' || bruto === undefined || bruto === null) continue
      const n = Number(String(bruto).replace(',', '.'))
      if (!Number.isFinite(n)) {
        toast.erro(`O valor de ${cat.nome} não é um número.`)
        return
      }
      if ((cat.min !== undefined && n < cat.min) || (cat.max !== undefined && n > cat.max)) {
        toast.erro(`${cat.nome}: o valor tem de estar entre ${cat.min} e ${cat.max} ${cat.unidade}.`)
        return
      }
    }

    setAGravar(true)
    try {
      const extra = leitura
        ? {
            leituraIA: {
              modelo: leitura.modelo || '',
              confianca: leitura.confianca,
              farmacia: leitura.farmacia || '',
              hora: leitura.hora || '',
              campos: camposIA
            }
          }
        : {}

      if (registo) {
        await atualizarRegisto(
          evento.id,
          registo.id,
          participante,
          { data, valores, notas, ...extra },
          ficheiro
        )
        toast.sucesso('Registo atualizado.')
      } else {
        await criarRegisto(
          evento.id,
          utilizador,
          participante,
          { data, valores, notas, ...extra },
          ficheiro
        )
        toast.sucesso('Pesagem registada.')
      }
      aoFechar()
    } catch (e) {
      console.error(e)
      toast.erro('Não foi possível gravar o registo.')
    } finally {
      setAGravar(false)
    }
  }

  return (
    <Modal
      titulo={registo ? 'Editar pesagem' : 'Nova pesagem'}
      aberto={aberto}
      aoFechar={aoFechar}
      largo
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={aGravar}>
            Cancelar
          </button>
          <button className="btn btn--principal" onClick={gravar} disabled={aGravar || aLer}>
            {aGravar ? 'A gravar…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="grelha grelha--2" style={{ alignItems: 'start' }}>
        {/* ---------------- Coluna da foto ---------------- */}
        <div>
          <div className="campo">
            <label className="campo__etiqueta">Foto do talão</label>
            <input
              ref={inputFicheiro}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={escolherFicheiro}
            />
            <button
              className="btn btn--largo"
              onClick={() => inputFicheiro.current?.click()}
              disabled={aLer}
            >
              {prever ? 'Trocar foto' : 'Tirar ou escolher foto do talão'}
            </button>
            <span className="campo__ajuda">
              Fotografa o talão e os valores são lidos automaticamente. Confere sempre antes de
              guardar.
            </span>
          </div>

          {prever && (
            <img
              src={prever}
              alt="Talão fotografado"
              style={{
                width: '100%',
                borderRadius: 'var(--raio-p)',
                border: '1px solid var(--borda)',
                maxHeight: 300,
                objectFit: 'contain',
                background: 'var(--fundo-2)',
                marginBottom: 12
              }}
            />
          )}

          {aLer && (
            <div className="leitura leitura--ocupado">
              <div className="roda roda--p" />
              <div>
                <strong>A ler o talão…</strong>
                <div className="campo__ajuda">Demora uns segundos.</div>
              </div>
            </div>
          )}

          {erroLeitura && !aLer && (
            <div className="alerta alerta--aviso" style={{ marginBottom: 12 }}>
              {erroLeitura}
              {ficheiro && (
                <div style={{ marginTop: 10 }}>
                  <button className="btn btn--p" onClick={() => correrLeitura(ficheiro)}>
                    Tentar outra vez
                  </button>
                </div>
              )}
            </div>
          )}

          {leitura && !aLer && (
            <div className="leitura">
              <div className="linha linha--espaco" style={{ marginBottom: 8 }}>
                <strong>Valores lidos do talão</strong>
                <span className={`distintivo distintivo--conf-${leitura.confianca}`}>
                  {ROTULO_CONFIANCA[leitura.confianca]}
                </span>
              </div>

              {camposIA.length > 0 ? (
                <ul className="leitura__lista">
                  {camposIA.map((id) => (
                    <li key={id}>
                      <span>{CATEGORIAS_POR_ID[id]?.nome || id}</span>
                      <strong>
                        {comUnidade(
                          Number(String(valores[id]).replace(',', '.')),
                          CATEGORIAS_POR_ID[id]
                        )}
                      </strong>
                    </li>
                  ))}
                  {leitura.data && (
                    <li>
                      <span>Data</span>
                      <strong>
                        {dataCurta(leitura.data)}
                        {leitura.hora ? ` · ${leitura.hora}` : ''}
                      </strong>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="campo__ajuda" style={{ margin: 0 }}>
                  Não deu para aproveitar nenhum valor. Preenche à mão.
                </p>
              )}

              {leitura.farmacia && (
                <div className="campo__ajuda" style={{ marginTop: 8 }}>
                  {leitura.farmacia}
                </div>
              )}

              {leitura.observacoes && (
                <div className="campo__ajuda" style={{ marginTop: 8, color: 'var(--aviso)' }}>
                  {leitura.observacoes}
                </div>
              )}

              {leitura.ignorados?.length > 0 && (
                <div className="campo__ajuda" style={{ marginTop: 8 }}>
                  Deixei em branco, por parecerem mal lidos: {leitura.ignorados.join(', ')}.
                </div>
              )}

              {foraDoDesafio.length > 0 && (
                <div className="campo__ajuda" style={{ marginTop: 8 }}>
                  O talão também trazia{' '}
                  {foraDoDesafio.map((id) => CATEGORIAS_POR_ID[id]?.nome || id).join(', ')}, mas
                  este desafio não acompanha esses campos.
                </div>
              )}

              {alturaDivergente && (
                <div className="alerta alerta--aviso" style={{ marginTop: 10 }}>
                  O talão diz {leitura.alturaCm} cm e a tua ficha tem {participante.alturaCm} cm.
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn--p" onClick={aplicarAltura}>
                      Passar a ficha para {leitura.alturaCm} cm
                    </button>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <button className="btn btn--p" onClick={() => correrLeitura(ficheiro)}>
                  Ler outra vez
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Coluna dos valores ---------------- */}
        <div>
          <div className="campo">
            <label className="campo__etiqueta">
              Data da pesagem
              {leitura?.data && data === leitura.data && <span className="selo-ia">IA</span>}
            </label>
            <input
              type="date"
              value={data}
              max={hojeISO()}
              onChange={(e) => setData(e.target.value)}
            />
            {evento?.dataInicio && data && data < evento.dataInicio && (
              <span className="campo__ajuda" style={{ color: 'var(--aviso)' }}>
                Esta data é anterior ao início do desafio — serve de pesagem de referência.
              </span>
            )}
          </div>

          <div className="grelha-campos">
            {editaveis.map((cat) => (
              <div className="campo" key={cat.id}>
                <label className="campo__etiqueta">
                  {cat.nome}{' '}
                  {cat.unidade && <span style={{ color: 'var(--texto-fraco)' }}>({cat.unidade})</span>}
                  {camposIA.includes(cat.id) && <span className="selo-ia">IA</span>}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step={cat.casas === 0 ? '1' : '0.1'}
                  min={cat.min}
                  max={cat.max}
                  value={valores[cat.id] ?? ''}
                  className={camposIA.includes(cat.id) ? 'campo--ia' : ''}
                  onChange={(e) => mudarValor(cat.id, e.target.value)}
                />
              </div>
            ))}
          </div>

          {mostraImc && (
            <div className="alerta" style={{ marginBottom: 14 }}>
              {participante?.alturaCm ? (
                imcCalculado !== null ? (
                  <>
                    IMC calculado: <strong>{numero(imcCalculado, 2)}</strong> — {classeImc(imcCalculado)}
                    <div style={{ fontSize: '.8rem', marginTop: 4, color: 'var(--texto-fraco)' }}>
                      Com {participante.alturaCm} cm de altura.
                      {leitura?.valores?.imc !== undefined &&
                        Math.abs(leitura.valores.imc - imcCalculado) >= 0.5 && (
                          <> O talão indica {numero(leitura.valores.imc, 2)}.</>
                        )}
                    </div>
                  </>
                ) : (
                  'Escreve o peso para veres o IMC.'
                )
              ) : (
                'Preenche a tua altura na ficha do participante para o IMC ser calculado.'
              )}
            </div>
          )}

          <div className="campo">
            <label className="campo__etiqueta">Notas (opcional)</label>
            <textarea
              value={notas}
              placeholder="Balança da farmácia do costume, em jejum…"
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}
