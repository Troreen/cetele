export function SectionHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return <header className="section-header"><div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="section-actions">{actions}</div> : null}</header>;
}
