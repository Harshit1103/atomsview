import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  accent?: string;
  sublabel?: string;
  progress?: number;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label, value, unit, icon, accent, sublabel, progress, className = ''
}) => (
  <div className={`card card-hover stat-card fade-up ${className}`} style={{ position:'relative' }}>
    {/* Accent line */}
    <div className="stat-accent" style={{
      background: accent
        ? `linear-gradient(90deg, ${accent} 0%, transparent 100%)`
        : 'linear-gradient(90deg, rgba(139,92,246,.4) 0%, transparent 100%)',
    }}/>
    {/* Subtle glow dot */}
    {accent && (
      <div style={{
        position:'absolute', top:16, right:14,
        width:28, height:28, borderRadius:'50%',
        background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`,
        pointerEvents:'none',
      }}/>
    )}
    {icon && (
      <span className="stat-icon" style={{color: accent ?? 'var(--violet-light)'}}>{icon}</span>
    )}
    <p className="stat-label">{label}</p>
    <div style={{display:'flex',alignItems:'baseline',gap:2,flexWrap:'wrap'}}>
      <span className="stat-value" style={accent ? {color:accent} : {color:'var(--text-1)'}}>
        {value}
      </span>
      {unit && <span className="stat-unit">{unit}</span>}
    </div>
    {progress !== undefined && (
      <div className="prog">
        <div className="prog-fill" style={{
          width:`${Math.min(progress,100)}%`,
          background: accent
            ? `linear-gradient(90deg, ${accent}99, ${accent})`
            : 'linear-gradient(90deg, #8b5cf6, #e879f9)',
        }}/>
      </div>
    )}
    {sublabel && <p className="stat-sub">{sublabel}</p>}
  </div>
);
