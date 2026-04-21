export function PlaceholderExample({ label }: { label: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-12 text-center text-sm text-slate-500">
      {label} — content coming soon
    </p>
  )
}

export function Ex05Placeholder() {
  return <PlaceholderExample label="Ex05" />
}
