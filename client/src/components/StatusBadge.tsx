interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  const styles = {
    draft: "bg-secondary text-muted-foreground border-border/50",
    submitted: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    verified: "bg-mint/10 text-mint border-mint/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    pending: "bg-peach/10 text-peach border-peach/20",
  };
  
  const labels = {
    draft: "Draft",
    submitted: "Submitted",
    verified: "Verified",
    cancelled: "Cancelled",
    pending: "Pending"
  };

  const styleClass = styles[normalized as keyof typeof styles] || styles.draft;
  const label = labels[normalized as keyof typeof labels] || status;

  return (
    <span className={`
      px-2.5 py-1 rounded-full text-xs font-semibold border
      flex items-center w-fit gap-1.5 uppercase tracking-wide
      ${styleClass}
    `}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}
