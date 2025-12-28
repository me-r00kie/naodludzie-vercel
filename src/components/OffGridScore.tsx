import { OffGridScore, getScoreLevel, getScoreLabel } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Mountain, Building2, Route, MapPin } from 'lucide-react';

interface OffGridScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function OffGridScoreBadge({ score, size = 'md', showLabel = false, className }: OffGridScoreBadgeProps) {
  const level = getScoreLevel(score);
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-14 h-14 text-lg',
    lg: 'w-20 h-20 text-2xl',
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold shadow-md',
          sizeClasses[size],
          level === 'high' && 'bg-score-high text-primary-foreground',
          level === 'medium' && 'bg-score-medium text-primary-foreground',
          level === 'low' && 'bg-score-low text-primary-foreground'
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground text-center">
          {getScoreLabel(level)}
        </span>
      )}
    </div>
  );
}

interface OffGridScoreDetailProps {
  score: OffGridScore;
  className?: string;
}

export function OffGridScoreDetail({ score, className }: OffGridScoreDetailProps) {
  const components = [
    { key: 'lightPollution', label: 'Zanieczyszczenie świetlne', value: score.lightPollution, icon: Mountain, description: 'Im wyższy wynik, tym ciemniejsze niebo' },
    { key: 'buildingDensity', label: 'Gęstość zabudowy', value: score.buildingDensity, icon: Building2, description: 'Im wyższy wynik, tym mniej budynków w okolicy' },
    { key: 'roadDensity', label: 'Gęstość dróg', value: score.roadDensity, icon: Route, description: 'Im wyższy wynik, tym mniej dróg w pobliżu' },
    { key: 'distanceToBuildings', label: 'Odległość od zabudowy', value: score.distanceToBuildings || 5, icon: MapPin, description: 'Im wyższy wynik, tym dalej od sąsiadów' },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-4">
        <OffGridScoreBadge score={score.total} size="lg" />
        <div>
          <h3 className="font-display text-xl font-semibold">Wynik NaOdludzie</h3>
          <p className="text-muted-foreground">{getScoreLabel(getScoreLevel(score.total))}</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {components.map((component, index) => {
          const Icon = component.icon;
          const level = getScoreLevel(component.value);
          
          return (
            <motion.div
              key={component.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{component.label}</span>
                </div>
                <span className={cn(
                  'text-sm font-bold',
                  level === 'high' && 'text-score-high',
                  level === 'medium' && 'text-score-medium',
                  level === 'low' && 'text-score-low'
                )}>
                  {component.value}/10
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${component.value * 10}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={cn(
                    'h-full rounded-full',
                    level === 'high' && 'bg-score-high',
                    level === 'medium' && 'bg-score-medium',
                    level === 'low' && 'bg-score-low'
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground">{component.description}</p>
            </motion.div>
          );
        })}
      </div>
      
      <div className="p-4 bg-muted/50 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Co oznacza Wynik NaOdludzie?</h4>
        <p className="text-xs text-muted-foreground">
          Wynik jest średnią czterech komponentów ocenionych przez gospodarza: 
          zanieczyszczenia świetlnego, gęstości zabudowy, gęstości dróg i odległości od najbliższych budynków.
        </p>
        <div className="mt-3 flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-score-low" />
            <span>1-3: Blisko miasta</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-score-medium" />
            <span>4-6: Umiarkowanie</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-score-high" />
            <span>7-10: Na odludziu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
