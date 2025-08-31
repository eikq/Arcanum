import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Music, Zap } from 'lucide-react';

interface VolumeMixerProps {
  volumes: {
    ui: number;
    sfx: number;
    music: number;
  };
  onVolumeChange: (channel: 'ui' | 'sfx' | 'music', value: number) => void;
  onMuteAll?: () => void;
  isMuted?: boolean;
  className?: string;
}

export const VolumeMixer = ({ 
  volumes, 
  onVolumeChange, 
  onMuteAll, 
  isMuted = false,
  className = '' 
}: VolumeMixerProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Audio Levels</CardTitle>
          {onMuteAll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onMuteAll}
              className="gap-2"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              {isMuted ? 'Unmute' : 'Mute'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* UI Sounds */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            UI Sounds: {Math.round(volumes.ui * 100)}%
          </Label>
          <Slider
            value={[volumes.ui]}
            onValueChange={([value]) => onVolumeChange('ui', value)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Sound Effects */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Sound Effects: {Math.round(volumes.sfx * 100)}%
          </Label>
          <Slider
            value={[volumes.sfx]}
            onValueChange={([value]) => onVolumeChange('sfx', value)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Music */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Music className="w-4 h-4" />
            Music: {Math.round(volumes.music * 100)}%
          </Label>
          <Slider
            value={[volumes.music]}
            onValueChange={([value]) => onVolumeChange('music', value)}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};