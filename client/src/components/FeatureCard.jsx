export default function FeatureCard({ icon, title, description }) {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-lg text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
