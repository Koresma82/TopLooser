import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { configuracaoEmFalta } from './firebase/config'
import Layout from './components/Layout'
import { Carregar } from './components/Comuns'
import Entrar from './pages/Entrar'
import Eventos from './pages/Eventos'
import EventoDetalhe from './pages/EventoDetalhe'
import Admin from './pages/Admin'

function Protegida({ children, apenasAdmin = false }) {
  const { utilizador, isAdmin, aCarregar } = useAuth()
  if (aCarregar) return <Carregar />
  if (!utilizador) return <Navigate to="/entrar" replace />
  if (apenasAdmin && !isAdmin) return <Navigate to="/" replace />
  return children
}

function ConfiguracaoEmFalta() {
  return (
    <div className="entrada">
      <div className="entrada__caixa">
        <img className="entrada__logo" src="/marca/icone-app-512.png" alt="TopLooser" />
        <div className="alerta alerta--aviso" style={{ marginTop: 4, textAlign: 'left' }}>
          <strong>Falta configurar o Firebase.</strong>
          <p style={{ marginTop: 8 }}>
            Preenche as variáveis <code>VITE_FB_*</code> no ficheiro <code>.env.development</code> (ou
            nas variáveis de ambiente do Netlify) e volta a arrancar a aplicação. Tens os passos todos
            no <code>README.md</code>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  if (configuracaoEmFalta) return <ConfiguracaoEmFalta />

  return (
    <Routes>
      <Route path="/entrar" element={<Entrar />} />
      <Route
        path="/"
        element={
          <Protegida>
            <Layout>
              <Eventos />
            </Layout>
          </Protegida>
        }
      />
      <Route
        path="/evento/:eventoId"
        element={
          <Protegida>
            <Layout>
              <EventoDetalhe />
            </Layout>
          </Protegida>
        }
      />
      <Route
        path="/admin"
        element={
          <Protegida apenasAdmin>
            <Layout>
              <Admin />
            </Layout>
          </Protegida>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
