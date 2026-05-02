import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-4xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-3 text-slate-600">
        The page you’re looking for doesn’t exist or has been moved.
      </p>
      <Link to="/" className="btn-primary mt-6 inline-flex">Back home</Link>
    </section>
  );
}
