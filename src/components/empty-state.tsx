export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-foreground/20 mb-4">{icon}</div>}
      <h2 className="text-foreground/60 text-lg font-medium">{title}</h2>
      {description && <p className="text-foreground/40 mt-1 text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
