import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { VolumeMixer } from '@/components/ui/VolumeMixer';
import { DiagnosticOverlay } from '@/components/ui/diagnostic-overlay';
import { ArrowLeft, Mic, Volume2, Settings as SettingsIcon, RefreshCw } from 'lucide-react';
import { micBootstrap } from '@/audio/MicBootstrap';

interface SettingsProps {
  settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    micSensitivity: number;
    pronunciationLeniency: number;
    alwaysCast: boolean;
    hotwordEnabled: boolean;
    hotword: string;
    selectedMicDevice?: string;
    minAccuracy: number;
  };
  onSettingsChange: (newSettings: any) => void;
  onBack: () => void;
}

export const Settings = ({ settings, onSettingsChange, onBack }: SettingsProps) => {
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isFixingMic, setIsFixingMic] = useState(false);

  // Load available microphone devices
  useEffect(() => {
    const loadMicDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setMicDevices(audioInputs);
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    loadMicDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      loadMicDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);

  const handleVolumeChange = (type: 'master' | 'sfx' | 'music', value: number) => {
    const volumeKey = type === 'master' ? 'masterVolume' : type === 'sfx' ? 'sfxVolume' : 'musicVolume';
    onSettingsChange({
      ...settings,
      [volumeKey]: value
    });
  };

  const handleMicSensitivityChange = (value: number) => {
    onSettingsChange({
      ...settings,
      micSensitivity: value
    });
  };

  const handlePronunciationLeniencyChange = (value: number) => {
    onSettingsChange({
      ...settings,
      pronunciationLeniency: value
    });
  };

  const handleAlwaysCastChange = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      alwaysCast: checked
    });
  };

  const handleHotwordToggle = (checked: boolean) => {
    onSettingsChange({
      ...settings,
      hotwordEnabled: checked
    });
  };

  const handleHotwordChange = (value: string) => {
    onSettingsChange({
      ...settings,
      hotword: value
    });
  };

  const handleMicDeviceChange = async (deviceId: string) => {
    try {
      setIsFixingMic(true);
      await micBootstrap.reacquireMic('device switched');
      onSettingsChange({
        ...settings,
        selectedMicDevice: deviceId
      });
      toast({
        title: "Microphone Updated",
        description: "Successfully switched to new microphone device",
      });
    } catch (error) {
      console.error('Failed to switch microphone:', error);
      toast({
        title: "Device Switch Failed",
        description: "Could not switch to the selected microphone",
        variant: "destructive",
      });
    } finally {
      setIsFixingMic(false);
    }
  };

  const handleFixMic = async () => {
    try {
      setIsFixingMic(true);
      await micBootstrap.reacquireMic('user tap');
      toast({
        title: "Microphone Fixed",
        description: "Microphone has been reacquired successfully",
      });
    } catch (error) {
      console.error('Failed to fix microphone:', error);
      toast({
        title: "Fix Failed",
        description: "Could not reacquire microphone. Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsFixingMic(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold flex items-center">
            <SettingsIcon className="w-6 h-6 mr-2" />
            Settings
          </h1>
          <Button
            variant="outline"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="text-sm"
          >
            {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="w-5 h-5 mr-2" />
                Audio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <VolumeMixer
                volumes={{
                  master: settings.masterVolume,
                  sfx: settings.sfxVolume,
                  music: settings.musicVolume
                }}
                onVolumeChange={handleVolumeChange}
              />
            </CardContent>
          </Card>

          {/* Microphone Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mic className="w-5 h-5 mr-2" />
                Microphone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Device Selection */}
              <div className="space-y-2">
                <Label>Microphone Device</Label>
                <div className="flex gap-2">
                  <Select
                    value={settings.selectedMicDevice || 'default'}
                    onValueChange={handleMicDeviceChange}
                    disabled={isFixingMic}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      {micDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleFixMic}
                    disabled={isFixingMic}
                    className="px-3"
                  >
                    {isFixingMic ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      'Fix Mic'
                    )}
                  </Button>
                </div>
              </div>

              {/* Sensitivity */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Microphone Sensitivity</Label>
                  <Badge variant="secondary">{(settings.micSensitivity * 100).toFixed(0)}%</Badge>
                </div>
                <Slider
                  value={[settings.micSensitivity * 100]}
                  onValueChange={([value]) => handleMicSensitivityChange(value / 100)}
                  min={1}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = easier to cast on quiet microphones
                </p>
              </div>

              {/* Pronunciation Leniency */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Pronunciation Leniency</Label>
                  <Badge variant="secondary">{((1 - settings.minAccuracy) * 100).toFixed(0)}%</Badge>
                </div>
                <Slider
                  value={[(1 - settings.minAccuracy) * 100]}
                  onValueChange={([value]) => onSettingsChange({
                    ...settings,
                    minAccuracy: 1 - (value / 100)
                  })}
                  min={15}
                  max={60}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Higher = accepts poorer pronunciation (min accuracy: {(settings.minAccuracy * 100).toFixed(0)}%)
                </p>
              </div>

              {/* Always Cast */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Always Cast (Assist Mode)</Label>
                  <p className="text-xs text-muted-foreground">
                    Cast a reduced-power fallback even if recognition is poor
                  </p>
                </div>
                <Switch
                  checked={settings.alwaysCast}
                  onCheckedChange={handleAlwaysCastChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hotword Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Hotword Activation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Enable Hotword</Label>
                <Switch
                  checked={settings.hotwordEnabled}
                  onCheckedChange={handleHotwordToggle}
                />
              </div>
              
              {settings.hotwordEnabled && (
                <div className="space-y-2">
                  <Label>Hotword</Label>
                  <Select value={settings.hotword} onValueChange={handleHotwordChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cast">Cast</SelectItem>
                      <SelectItem value="spell">Spell</SelectItem>
                      <SelectItem value="magic">Magic</SelectItem>
                      <SelectItem value="invoke">Invoke</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Say "{settings.hotword} [spell name]" to cast
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Diagnostics Overlay */}
        {showDiagnostics && (
          <div className="mt-6">
            <DiagnosticOverlay />
          </div>
        )}
      </div>
    </div>
  );
};