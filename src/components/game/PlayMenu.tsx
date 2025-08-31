import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Code, Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayMenuProps {
  onBack: () => void;
  onStartMatch: (mode: 'quick' | 'create' | 'join' | 'bot', data?: any) => void;
  isConnected: boolean;
}

type PlayMode = 'menu' | 'quick' | 'invite' | 'bot' | 'lobby';

export const PlayMenu = ({ onBack, onStartMatch, isConnected }: PlayMenuProps) => {
  const [currentMode, setCurrentMode] = useState<PlayMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('Player');
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleQuickMatch = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for connection to game server.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConnecting(true);
    setCurrentMode('lobby');
    
    try {
      await onStartMatch('quick', { nick: playerName });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to game server. Starting bot match instead.",
        variant: "destructive",
      });
      setCurrentMode('menu');
      setIsConnecting(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for connection to game server.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConnecting(true);
    try {
      await onStartMatch('create', { nick: playerName });
    } catch (error) {
      toast({
        title: "Failed to Create Room",
        description: "Could not create room. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || roomCode.length !== 6) {
      toast({
        title: "Invalid Room Code",
        description: "Please enter a valid 6-character room code.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for connection to game server.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      await onStartMatch('join', { roomCode: roomCode.toUpperCase(), nick: playerName });
    } catch (error) {
      toast({
        title: "Failed to Join Room",
        description: "Room not found or is full. Please check the code.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleBotMatch = () => {
    onStartMatch('bot', { difficulty: botDifficulty, nick: playerName });
  };

  const renderMainMenu = () => (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Main Menu
          </Button>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Choose Your Battle
          </h1>
          <p className="text-lg text-muted-foreground">
            Test your voice casting skills against wizards around the world
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Quick Match */}
          <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Quick Match</CardTitle>
              <CardDescription>
                Join the queue and get matched with a random opponent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quickName">Your Name</Label>
                  <Input
                    id="quickName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your wizard name"
                    maxLength={20}
                  />
                </div>
                <Button 
                  onClick={handleQuickMatch}
                  className="w-full"
                  disabled={isConnecting || !isConnected}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    "Find Match"
                  )}
                </Button>
                <div className="flex justify-center">
                  <Badge variant="secondary">~30s wait time</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invite Friend */}
          <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-accent/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <Code className="w-8 h-8 text-accent-foreground" />
              </div>
              <CardTitle className="text-xl">Invite Friend</CardTitle>
              <CardDescription>
                Create or join a private room with a friend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="inviteName">Your Name</Label>
                  <Input
                    id="inviteName"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your wizard name"
                    maxLength={20}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={handleCreateRoom}
                    variant="outline"
                    disabled={isConnecting || !isConnected}
                  >
                    Create Room
                  </Button>
                  <Button 
                    onClick={() => setCurrentMode('invite')}
                    variant="outline"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Play vs Bot */}
          <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-secondary/50">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/20 flex items-center justify-center group-hover:bg-secondary/30 transition-colors">
                <Bot className="w-8 h-8 text-secondary-foreground" />
              </div>
              <CardTitle className="text-xl">Play vs Bot</CardTitle>
              <CardDescription>
                Practice against AI opponents of varying difficulty
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Difficulty</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['easy', 'medium', 'hard'] as const).map((diff) => (
                      <Button
                        key={diff}
                        variant={botDifficulty === diff ? "default" : "outline"}
                        size="sm"
                        onClick={() => setBotDifficulty(diff)}
                        className={cn(
                          "capitalize",
                          diff === 'easy' && "border-green-500 text-green-700",
                          diff === 'medium' && "border-yellow-500 text-yellow-700",
                          diff === 'hard' && "border-red-500 text-red-700"
                        )}
                      >
                        {diff}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleBotMatch}
                  className="w-full"
                >
                  Start Bot Match
                </Button>
                <div className="flex justify-center">
                  <Badge variant="outline">No internet required</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const renderJoinRoom = () => (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join Room</CardTitle>
          <CardDescription>
            Enter the 6-character room code shared by your friend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="text-center text-lg font-mono tracking-wider"
            />
          </div>
          <div>
            <Label htmlFor="joinName">Your Name</Label>
            <Input
              id="joinName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your wizard name"
              maxLength={20}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setCurrentMode('menu')}
              variant="outline"
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              onClick={handleJoinRoom}
              disabled={isConnecting || roomCode.length !== 6 || !isConnected}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Room"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderLobby = () => (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Finding Match...</CardTitle>
          <CardDescription>
            Searching for a worthy opponent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Estimated wait time: 30s</p>
            <div className="flex justify-center space-x-1">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          <Button 
            onClick={() => {
              setCurrentMode('menu');
              setIsConnecting(false);
            }}
            variant="outline"
            className="w-full"
          >
            Cancel Search
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  switch (currentMode) {
    case 'menu':
      return renderMainMenu();
    case 'invite':
      return renderJoinRoom();
    case 'lobby':
      return renderLobby();
    default:
      return renderMainMenu();
  }
};