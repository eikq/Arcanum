// NEW: Comprehensive casting debug panel
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bug, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CastDebugState {
  // Speech Recognition
  srSupported: boolean;
  srListening: boolean;
  srError?: string;
  srLanguage: string;
  
  // Audio
  rms: number;
  dbfs: number;
  
  // Transcription
  interim: string;
  final: string;
  
  // Spell Matching
  topGuesses: Array<{
    spellId: string;
    name: string;
    score: number;
  }>;
  
  // Cast Eligibility
  eligibility: {
    finalOK: boolean;
    rmsOK: boolean;
    cooldownOK: boolean;
    notDuplicate: boolean;
    hotwordOK: boolean;
  };
  
  // Block Reasons
  blockReason?: string;
  blockDetails?: string;
  
  // Settings
  hotwordEnabled: boolean;
  hotword: string;
  minRms: number;
  cooldownMs: number;
}

interface CastDebugPanelProps {
  state: CastDebugState;
  className?: string;
}

export const CastDebugPanel = ({ state, className }: CastDebugPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const StatusIcon = ({ ok }: { ok: boolean }) => (
    ok ? (
      <CheckCircle className="w-4 h-4 text-nature" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    )
  );

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="w-5 h-5" />
            Mic & Cast Debug
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Speech Recognition Status */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Speech Recognition</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.srSupported} />
                <span>Supported: {state.srSupported ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.srListening} />
                <span>Listening: {state.srListening ? 'Yes' : 'No'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Language: </span>
                <Badge variant="outline">{state.srLanguage}</Badge>
              </div>
              {state.srError && (
                <div className="col-span-2 text-destructive text-xs">
                  Error: {state.srError}
                </div>
              )}
            </div>
          </div>

          {/* Audio Levels */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Audio Levels</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">RMS</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-150",
                        state.rms >= state.minRms 
                          ? "bg-gradient-to-r from-nature to-light" 
                          : "bg-gradient-to-r from-destructive to-warning"
                      )}
                      style={{ width: `${Math.min(state.rms * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono min-w-[3ch]">
                    {(state.rms * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">dBFS</div>
                <div className="text-sm font-mono">
                  {Math.round(state.dbfs)} dB
                </div>
              </div>
            </div>
          </div>

          {/* Transcription */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Transcription</h4>
            <div className="space-y-1">
              <div>
                <span className="text-xs text-muted-foreground">Interim: </span>
                <span className="text-sm text-muted-foreground italic">
                  {state.interim || '…'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Final: </span>
                <span className="text-sm text-nature font-medium">
                  {state.final ? `✓ ${state.final}` : '(none)'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Spell Guesses */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Spell Guesses</h4>
            <ol className="space-y-1">
              {state.topGuesses.length > 0 ? (
                state.topGuesses.map((guess, idx) => (
                  <li key={guess.spellId} className="flex items-center justify-between text-sm">
                    <span>
                      {idx + 1}. {guess.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {(guess.score * 100).toFixed(0)}%
                    </Badge>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted-foreground italic">No matches</li>
              )}
            </ol>
          </div>

          {/* Cast Eligibility */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Cast Eligibility</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.eligibility.finalOK} />
                <span>Final Result</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.eligibility.rmsOK} />
                <span>Volume OK</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.eligibility.cooldownOK} />
                <span>Cooldown OK</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={state.eligibility.notDuplicate} />
                <span>Not Duplicate</span>
              </div>
              {state.hotwordEnabled && (
                <div className="flex items-center gap-2 col-span-2">
                  <StatusIcon ok={state.eligibility.hotwordOK} />
                  <span>Hotword: "{state.hotword}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Block Reason */}
          {state.blockReason && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Block Reason</h4>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">{state.blockReason}</Badge>
                {state.blockDetails && (
                  <span className="text-sm text-muted-foreground">
                    {state.blockDetails}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Settings</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>Min RMS: {(state.minRms * 100).toFixed(0)}%</div>
              <div>Cooldown: {state.cooldownMs}ms</div>
              <div>Hotword: {state.hotwordEnabled ? 'On' : 'Off'}</div>
              {state.hotwordEnabled && (
                <div>Trigger: "{state.hotword}"</div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};