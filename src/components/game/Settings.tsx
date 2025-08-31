import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Mic, Volume2, Eye, Type, Shield, RefreshCw } from 'lucide-react';
import { GameSettings } from '@/types/game';
import { useState, useEffect } from 'react';
import { reacquireMic, getMicState } from '@/audio/MicBootstrap';
import { toast } from '@/hooks/use-toast';

interface SettingsProps {
  settings: GameSettings;
  onSettingsChange: (settings: Partial<GameSettings>) => void;
  onBack: () => void;
}

export const Settings = ({ settings, onSettingsChange, onBack }: SettingsProps) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isFixingMic, setIsFixingMic] = useState(false);

  // Load audio devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        setAudioDevices(audioInputs);
        
        // Set current device
        const currentDeviceId = getMicState().deviceId;
        if (currentDeviceId) {
          setSelectedDeviceId(currentDeviceId);
        }
      } catch (error) {
        console.warn('Failed to enumerate devices:', error);
      }
    };

    loadDevices();
  }, []);

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      await reacquireMic("device switched");
      toast({
        title: "Microphone Switched",
        description: "Successfully switched to new microphone device",
      });
    } catch (error) {
      toast({
        title: "Device Switch Failed",
        description: "Could not switch to selected device",
        variant: "destructive",
      });
    }
  };

  const handleFixMic = async () => {
    setIsFixingMic(true);
    try {
      await reacquireMic("user tap");
      toast({
        title: "Microphone Fixed",
        description: "Microphone has been reacquired successfully",
      });
    } catch (error) {
      toast({
        title: "Fix Failed",
        description: "Could not fix microphone. Try refreshing the page.",
        variant: "destructive",
      });
    } finally {
      setIsFixingMic(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Game Settings</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voice Recognition Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                Voice Recognition
              </CardTitle>
              <CardDescription>
                Configure voice input and spell casting behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Microphone Device Selection */}
              <div className="space-y-2">
                <Label htmlFor="mic-device">Microphone Device</Label>
                <div className="flex gap-2">
                  <Select 
                    value={selectedDeviceId} 
                    onValueChange={handleDeviceChange}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select microphone" />
                    </SelectTrigger>
                    <SelectContent>
                      {audioDevices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId}>
                          {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFixMic}
                    disabled={isFixingMic}
                    className="gap-2"
                  >
                    {isFixingMic ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Fix Mic
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sr-language">Recognition Language</Label>
                <Select 
                  value={settings.srLanguage} 
                  onValueChange={(value) => onSettingsChange({ srLanguage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="en-AU">English (AU)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sensitivity Threshold: {Math.round(settings.sensitivity * 100)}%</Label>
                <Slider
                  value={[settings.sensitivity]}
                  onValueChange={([value]) => onSettingsChange({ sensitivity: value })}
                  min={0.3}
                  max={0.9}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values accept more varied pronunciations
                </p>
              </div>

              <div className="space-y-2">
                <Label>Microphone Sensitivity: {Math.round(settings.micSensitivity * 100)}%</Label>
                <Slider
                  value={[settings.micSensitivity]}
                  onValueChange={([value]) => onSettingsChange({ micSensitivity: value })}
                  min={0.01}
                  max={0.10}
                  step={0.005}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = easier to cast on quiet microphones
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pronunciation Leniency: {Math.round(settings.minAccuracy * 100)}%</Label>
                <Slider
                  value={[settings.minAccuracy]}
                  onValueChange={([value]) => onSettingsChange({ minAccuracy: value })}
                  min={0.10}
                  max={0.70}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = accepts poorer pronunciation
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="always-cast">Always Cast (Assist Mode)</Label>
                  <p className="text-xs text-muted-foreground">
                    Cast a reduced-power fallback even if recognition is poor
                  </p>
                </div>
                <Switch
                  id="always-cast"
                  checked={settings.alwaysCast}
                  onCheckedChange={(checked) => onSettingsChange({ alwaysCast: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Microphone Sensitivity: {Math.round(settings.micSensitivity * 100)}%</Label>
                <Slider
                  value={[settings.micSensitivity]}
                  onValueChange={([value]) => onSettingsChange({ micSensitivity: value })}
                  min={0.01}
                  max={0.10}
                  step={0.005}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = easier to cast on quiet microphones
                </p>
              </div>

              <div className="space-y-2">
                <Label>Pronunciation Leniency: {Math.round(settings.minAccuracy * 100)}%</Label>
                <Slider
                  value={[settings.minAccuracy]}
                  onValueChange={([value]) => onSettingsChange({ minAccuracy: value })}
                  min={0.10}
                  max={0.70}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower = accepts poorer pronunciation
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="always-cast">Always Cast (Assist Mode)</Label>
                  <p className="text-xs text-muted-foreground">
                    Cast a reduced-power fallback even if recognition is poor
                  </p>
                </div>
                <Switch
                  id="always-cast"
                  checked={settings.alwaysCast}
                  onCheckedChange={(checked) => onSettingsChange({ alwaysCast: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="hotword">Hotword Activation</Label>
                  <p className="text-xs text-muted-foreground">
                    Require "Arcanum" before spell names
                  </p>
                </div>
                <Switch
                  id="hotword"
                  checked={settings.hotwordEnabled}
                  onCheckedChange={(checked) => onSettingsChange({ hotwordEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Audio Settings
              </CardTitle>
              <CardDescription>
                Adjust volume levels for different audio sources
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Master Volume: {Math.round(settings.masterVolume * 100)}%</Label>
                <Slider
                  value={[settings.masterVolume]}
                  onValueChange={([value]) => onSettingsChange({ masterVolume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="space-y-2">
                <Label>Sound Effects: {Math.round(settings.sfxVolume * 100)}%</Label>
                <Slider
                  value={[settings.sfxVolume]}
                  onValueChange={([value]) => onSettingsChange({ sfxVolume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="space-y-2">
                <Label>Music: {Math.round(settings.musicVolume * 100)}%</Label>
                <Slider
                  value={[settings.musicVolume]}
                  onValueChange={([value]) => onSettingsChange({ musicVolume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Chat: {Math.round(settings.voiceVolume * 100)}%</Label>
                <Slider
                  value={[settings.voiceVolume]}
                  onValueChange={([value]) => onSettingsChange({ voiceVolume: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content & Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Content Settings
              </CardTitle>
              <CardDescription>
                Configure content display and intellectual property options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ip-safe">IP-Safe Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Use alternative spell names while keeping original pronunciation training
                  </p>
                </div>
                <Switch
                  id="ip-safe"
                  checked={settings.ipSafeMode}
                  onCheckedChange={(checked) => onSettingsChange({ ipSafeMode: checked })}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">IP-Safe Mode Disclaimer</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When enabled, spell names are displayed using generic fantasy terms while maintaining 
                  the original pronunciations for voice recognition training. This mode is designed to 
                  respect intellectual property while preserving the educational pronunciation aspects 
                  of the original content.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Display & Accessibility */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Display & Accessibility
              </CardTitle>
              <CardDescription>
                Visual and accessibility options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast">High Contrast Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Enhance contrast for better visibility
                  </p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => onSettingsChange({ highContrast: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Font Size: {settings.fontSize}%
                </Label>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={([value]) => onSettingsChange({ fontSize: value })}
                  min={80}
                  max={120}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Adjust text size for better readability
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reset Button */}
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            onClick={() => {
              onSettingsChange({
                srLanguage: 'en-US',
                sensitivity: 0.6,
                hotwordEnabled: false,
                ipSafeMode: false,
                minAccuracy: 0.25,
                alwaysCast: true,
                micSensitivity: 0.02,
                masterVolume: 0.8,
                sfxVolume: 0.8,
                musicVolume: 0.6,
                voiceVolume: 0.8,
                highContrast: false,
                fontSize: 100
              });
            }}
          >
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
};