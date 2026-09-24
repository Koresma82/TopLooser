import { useEffect, useState } from 'react'
import { Modal } from '../Comuns'
import { CORES, primeiraCorLivre } from '../../lib/cores'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { atualizarParticipante, inscrever } from '../../lib/servicos'
import { calcularImc, classeImc } from '../../lib/calculos'
import { numero } from '../../lib/formato'

export default function ModalInscricao({ aberto, aoFechar, eventoId, participantes, euParticipante }) {
  const { utilizador, nome } = useAuth()
  const toast = useToast()

  const aEditar = Boolean(euParticipante)
  const [cor, setCor] = useState('laranja')
  const [altura, setAltura] = useState('')
  const [alcunha, setAlcunha] = useState('')
  const [pesoExemplo, setPesoExemplo] = useState('')
  const [aGravar, setAGravar] = useState(false)

  useEffect(() => {
    if (!aberto) return
    if (euParticipante) {
      setCor(euParticipante.cor || 'laranja')
      setAltura(euParticipante.alturaCm ? String(euParticipante.alturaCm) : '')
      setAlcunha(euParticipante.nome || '')
    } else {
      setCor(primeiraCorLivre(participantes))
      setAltura('')
      setAlcunha(nome || '')
    }
    setPesoExemplo('')
  }, [aberto, euParticipante, participantes, nome])

  const ocupadas = new Set(
    participantes.filter((p) => p.uid !== utilizador?.uid).map((p) => p.cor)
  )

  const imcExemplo = calcularImc(pesoExemplo, altura)

  async function gravar() {
    const alturaNum = Number(String(altura).replace(',', '.'))
    if (!alturaNum || alturaNum < 100 || alturaNum > 250) {
      toast.erro('Indica a tua altura em centímetros (entre 100 e 250).')
      return
    }
    setAGravar(true)
    try {
      if (aEditar) {
        await atualizarParticipante(eventoId, utilizador.uid, {
          cor,
          alturaCm: alturaNum,
          nome: alcunha.trim() || nome
        })
        toast.sucesso('Ficha atualizada.')
      } else {
        await inscrever(eventoId, utilizador, { cor, alturaCm: alturaNum, alcunha })
        toast.sucesso('Estás dentro. Boa sorte.')
      }
      aoFechar()
    } catch (e) {
      console.error(e)
      toast.erro(
        aEditar ? 'Não foi possível guardar as alterações.' : 'Não foi possível concluir a inscrição.'
      )
    } finally {
      setAGravar(false)
    }
  }

  return (
    <Modal
      titulo={aEditar ? 'A minha ficha' : 'Entrar no desafio'}
      aberto={aberto}
      aoFechar={aoFechar}
      rodape={
        <>
          <button className="btn" onClick={aoFechar} disabled={aGravar}>
            Cancelar
          </button>
          <button className="btn btn--principal" onClick={gravar} disabled={aGravar}>
            {aGravar ? 'A gravar…' : aEditar ? 'Guardar' : 'Entrar no desafio'}
          </button>
        </>
      }
    >
      <div className="campo">
        <label className="campo__etiqueta">Como queres aparecer</label>
        <input
          type="text"
          value={alcunha}
          placeholder={nome}
          onChange={(e) => setAlcunha(e.target.value)}
        />
      </div>

      <div className="campo">
        <label className="campo__etiqueta">Altura (cm)</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="100"
          max="250"
          value={altura}
          placeholder="Ex.: 178"
          onChange={(e) => setAltura(e.target.value)}
        />
        <span className="campo__ajuda">
          Serve para calcular o IMC a partir do peso. Declara-se uma vez e fica assim.
        </span>
      </div>

      {altura && (
        <div className="campo">
          <label className="campo__etiqueta">Conferir (opcional)</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={pesoExemplo}
            placeholder="Escreve um peso para ver o IMC correspondente"
            onChange={(e) => setPesoExemplo(e.target.value)}
          />
          {imcExemplo !== null && (
            <span className="campo__ajuda">
              Com {numero(Number(pesoExemplo), 1)} kg e {altura} cm o teu IMC é{' '}
              <strong>{numero(imcExemplo, 2)}</strong> — {classeImc(imcExemplo)}.
            </span>
          )}
        </div>
      )}

      <div className="campo">
        <label className="campo__etiqueta">A tua cor</label>
        <div className="chips">
          {CORES.map((c) => {
            const indisponivel = ocupadas.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                title={indisponivel ? `${c.nome} — já escolhida` : c.nome}
                aria-label={c.nome}
                disabled={indisponivel}
                className={`chip-cor ${cor === c.id ? 'chip-cor--ativo' : ''} ${
                  indisponivel ? 'chip-cor--ocupado' : ''
                }`}
                style={{ background: c.hex }}
                onClick={() => setCor(c.id)}
              />
            )
          })}
        </div>
        <span className="campo__ajuda">
          É esta a cor que te identifica nos gráficos e nas tabelas. As cores já usadas por outros
          aparecem apagadas.
        </span>
      </div>
    </Modal>
  )
}
