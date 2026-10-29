import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="text-blue-600 underline">
        Voltar ao início
      </Link>
    </section>
  )
}
