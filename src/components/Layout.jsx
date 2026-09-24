import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AMBIENTE } from '../firebase/config'
import { Avatar } from './Comuns'
import { LOGOTIPO } from '../lib/marca'

export default function Layout({ children }) {
  const { utilizador, isAdmin, sair, nome, fotoURL } = useAuth()
  const navegar = useNavigate()

  async function terminarSessao() {
    await sair()
    navegar('/entrar')
  }

  return (
    <div className="app">
      <header className="cabecalho">
        <Link to="/" className="marca" aria-label="TopLooser — início">
          <img src={LOGOTIPO} alt="TopLooser" />
        </Link>

        {AMBIENTE !== 'prod' && <span className="etiqueta-ambiente">{AMBIENTE}</span>}

        <div className="cabecalho__espaco" />

        {utilizador && (
          <>
            {isAdmin && (
              <Link to="/admin" className="btn btn--p esconder-movel">
                Gerir eventos
              </Link>
            )}
            <Avatar nome={nome} fotoURL={fotoURL} tamanho="p" />
            <button className="btn btn--discreto btn--p" onClick={terminarSessao}>
              Sair
            </button>
          </>
        )}
      </header>

      <main className="conteudo">{children}</main>

      <footer className="rodape">
        TopLooser · quem perde mais, ganha · a balança não sabe de amizades
      </footer>
    </div>
  )
}
