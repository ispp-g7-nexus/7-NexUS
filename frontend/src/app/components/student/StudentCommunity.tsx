import { useState } from "react";
import { Search, Heart, MapPin, Calendar, Check, X, Plus, Image as ImageIcon, Users, Tag, Edit, User, Music, Moon, Sun, Home, Coffee, Briefcase, Sparkles, Bell, Send, MessageCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toast } from "sonner";

export function StudentCommunity() {
  const [joinedEvents, setJoinedEvents] = useState<Set<string>>(new Set());
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMatches, setShowMatches] = useState(true);
  
  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    photo: "",
    dateTime: "",
    location: "",
    limit: "",
    labels: "",
    preRegistered: "", // Nuevos usuarios pre-confirmados (nombres separados por comas)
  });

  // User profile state
  const [userProfile, setUserProfile] = useState({
    name: "Carlos Ruiz",
    room: "305-A",
    photo: "",
    bio: "Estudiante de Ingeniería Informática. Me encanta el café, los videojuegos y conocer gente nueva. Siempre dispuesto a compartir una partida o una charla.",
    interests: ["Videojuegos", "Programación", "Café", "Cine", "Música"],
    sleepSchedule: "Nocturno",
    lifestyle: ["No fumador", "Sociable", "Tranquilo", "Respetuoso"],
    musicTaste: ["Rock", "Electrónica", "Indie"],
    studyHabits: "Estudioso",
  });

  const [editProfile, setEditProfile] = useState(userProfile);
  const [newInterest, setNewInterest] = useState("");

  // Chat state
  const [messages, setMessages] = useState([
    { id: 1, user: "Laura P.", avatar: "LP", message: "¡Hola a todos! ¿Alguien se apunta a hacer algo esta noche?", time: "18:30", isOwn: false },
    { id: 2, user: "David M.", avatar: "DM", message: "Yo estoy libre! Podríamos ir al cine o algo así", time: "18:32", isOwn: false },
    { id: 3, user: "Carlos Ruiz", avatar: "CR", message: "Me apunto! Prefiero algo tranquilo tipo una cerveza o café", time: "18:35", isOwn: true },
    { id: 4, user: "Ana S.", avatar: "AS", message: "Hay una exposición de arte genial cerca, podríamos ir", time: "18:40", isOwn: false },
    { id: 5, user: "María G.", avatar: "MG", message: "Yo también me uno! Me encanta el arte 🎨", time: "18:42", isOwn: false },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleJoinEvent = (eventTitle: string) => {
    setJoinedEvents(new Set([...joinedEvents, eventTitle]));
    toast.success("¡Te has apuntado!", {
      description: `Confirmado para ${eventTitle}. Te enviaremos un recordatorio antes del evento.`,
    });
  };

  const handleLeaveEvent = (eventTitle: string) => {
    const newJoinedEvents = new Set(joinedEvents);
    newJoinedEvents.delete(eventTitle);
    setJoinedEvents(newJoinedEvents);
    toast.info("Te has desapuntado", {
      description: `Has cancelado tu asistencia a ${eventTitle}.`,
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Evento creado con éxito", {
      description: "Tu evento ha sido publicado en la comunidad.",
    });
    setIsCreateEventOpen(false);
    setNewEvent({
      name: "",
      description: "",
      photo: "",
      dateTime: "",
      location: "",
      limit: "",
      labels: "",
      preRegistered: "",
    });
  };

  const handleSaveProfile = () => {
    setUserProfile(editProfile);
    setIsEditingProfile(false);
    toast.success("Perfil actualizado", {
      description: "Tus cambios han sido guardados correctamente.",
    });
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !editProfile.interests.includes(newInterest.trim())) {
      setEditProfile({
        ...editProfile,
        interests: [...editProfile.interests, newInterest.trim()],
      });
      setNewInterest("");
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setEditProfile({
      ...editProfile,
      interests: editProfile.interests.filter(i => i !== interest),
    });
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const newMessages = [
        ...messages,
        { id: messages.length + 1, user: "Carlos Ruiz", avatar: "CR", message: newMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isOwn: true },
      ];
      setMessages(newMessages);
      setNewMessage("");
    }
  };

  return (
    <div className="p-4">
      {/* Header Verde */}
      <div className="bg-[#1B5E20] -mx-4 -mt-4 mb-6 px-6 py-4 flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">Comunidad</h1>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20 rounded-full"
          onClick={() => {
            toast.info("Notificaciones", {
              description: "No tienes notificaciones nuevas",
            });
          }}
        >
          <Bell className="w-5 h-5" />
        </Button>
      </div>

      <Tabs defaultValue="events" className="w-full">
        <TabsList className="w-full bg-gray-100 p-1 mb-6 rounded-xl grid grid-cols-4">
          <TabsTrigger
            value="events"
            className="rounded-lg data-[state=active]:text-[#1B5E20]"
          >
            Eventos
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="rounded-lg data-[state=active]:text-[#1B5E20]"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="matching"
            className="rounded-lg data-[state=active]:text-[#1B5E20]"
          >
            Matches
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="rounded-lg data-[state=active]:text-[#1B5E20]"
          >
            Perfil
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-gray-900">
              Próximas Actividades
            </h2>
            <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-[#35C759] hover:bg-[#1B5E20] rounded-full gap-2">
                  <Plus className="w-4 h-4" />
                  Crear Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Nuevo Evento</DialogTitle>
                  <DialogDescription>
                    Organiza una actividad para compartir con otros residentes.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del evento</Label>
                    <Input 
                      id="name" 
                      placeholder="Ej: Tarde de Juegos" 
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Explica de qué trata el evento..." 
                      className="resize-none"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateTime">Fecha y hora</Label>
                      <Input 
                        id="dateTime" 
                        type="datetime-local" 
                        value={newEvent.dateTime}
                        onChange={(e) => setNewEvent({...newEvent, dateTime: e.target.value})}
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="limit">Límite de personas</Label>
                      <Input 
                        id="limit" 
                        type="number" 
                        placeholder="Sin límite" 
                        value={newEvent.limit}
                        onChange={(e) => setNewEvent({...newEvent, limit: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lugar</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        id="location" 
                        placeholder="Ej: Sala Común" 
                        className="pl-10" 
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo">URL de la foto</Label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        id="photo" 
                        placeholder="https://..." 
                        className="pl-10" 
                        value={newEvent.photo}
                        onChange={(e) => setNewEvent({...newEvent, photo: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="labels">Etiquetas (separadas por comas)</Label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        id="labels" 
                        placeholder="Ej: Juegos, Relax, Social" 
                        className="pl-10" 
                        value={newEvent.labels}
                        onChange={(e) => setNewEvent({...newEvent, labels: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preRegistered">Usuarios Pre-Confirmados (nombres separados por comas)</Label>
                    <Input 
                      id="preRegistered" 
                      placeholder="Ej: Juan, María, Pedro" 
                      value={newEvent.preRegistered}
                      onChange={(e) => setNewEvent({...newEvent, preRegistered: e.target.value})}
                    />
                  </div>
                  <DialogFooter className="pt-4">
                    <Button type="submit" className="w-full bg-[#35C759] hover:bg-[#1B5E20]">Publicar Evento</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <CommunityEvent
            title="Noche de Cine y Palomitas"
            date="Vie, 19 Feb • 20:00"
            attendees={24}
            image="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400"
            isJoined={joinedEvents.has("Noche de Cine y Palomitas")}
            onJoin={handleJoinEvent}
            onLeave={handleLeaveEvent}
          />
          <CommunityEvent
            title="Torneo de FIFA"
            date="Sab, 20 Feb • 16:00"
            attendees={12}
            image="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?auto=format&fit=crop&q=80&w=400"
            isJoined={joinedEvents.has("Torneo de FIFA")}
            onJoin={handleJoinEvent}
            onLeave={handleLeaveEvent}
          />
          <CommunityEvent
            title="Clase de Yoga Grupal"
            date="Dom, 21 Feb • 10:00"
            attendees={18}
            image="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400"
            isJoined={joinedEvents.has("Clase de Yoga Grupal")}
            onJoin={handleJoinEvent}
            onLeave={handleLeaveEvent}
          />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4 pb-20">
          <Card className="border-none bg-gradient-to-br from-[#1B5E20] to-[#35C759] text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">
                    Chat Común de Residentes
                  </h3>
                  <p className="text-white/80 text-xs leading-relaxed">
                    Conecta con todos los residentes en tiempo real. Todos los usuarios están automáticamente incluidos.
                  </p>
                  <Badge className="bg-white/20 text-white border-none mt-2 text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {messages.length + 45} residentes
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Chat Messages */}
          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.isOwn ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <Avatar className="w-10 h-10 border-2 border-gray-100 flex-shrink-0">
                      <AvatarFallback className={`text-sm font-bold ${
                        msg.isOwn ? "bg-[#35C759]/20 text-[#1B5E20]" : "bg-gray-100 text-gray-600"
                      }`}>
                        {msg.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${msg.isOwn ? "text-right" : "text-left"}`}>
                      <div className={`inline-block p-3 rounded-2xl max-w-[80%] ${
                        msg.isOwn 
                          ? "bg-[#35C759]/10 border border-[#35C759]/20" 
                          : "bg-gray-50 border border-gray-100"
                      }`}>
                        {!msg.isOwn && (
                          <p className="text-xs font-bold text-[#1B5E20] mb-1">{msg.user}</p>
                        )}
                        <p className="text-sm text-gray-900 leading-relaxed">
                          {msg.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Input Area */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 rounded-full border-gray-200 focus:border-[#35C759] focus:ring-[#35C759]"
                />
                <Button
                  size="icon"
                  className="bg-[#35C759] hover:bg-[#1B5E20] rounded-full flex-shrink-0 h-10 w-10"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 text-center">
                💬 Este chat es visible para todos los residentes. Mantén un ambiente respetuoso y amigable.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matching" className="space-y-4">
          <Card className="border-none bg-gradient-to-br from-[#1B5E20] to-[#35C759] text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-xl"></div>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">
                    NexUS AI Matching
                  </h3>
                  <p className="text-white/80 text-xs leading-relaxed">
                    Nuestro algoritmo analiza tus intereses, horarios y estilo de vida para encontrarte la mejor compañía en la residencia.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-4 bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-full h-8 px-4 text-xs"
                    onClick={() => {
                      setIsAnalyzing(true);
                      setTimeout(() => {
                        setIsAnalyzing(false);
                        toast.success("¡Análisis completado!", {
                          description: "Hemos actualizado tus matches según tu perfil actual.",
                        });
                      }, 2500);
                    }}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        Analizando...
                      </span>
                    ) : (
                      "Recalcular Matches"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAnalyzing ? (
            <div className="space-y-4 py-8 flex flex-col items-center justify-center text-gray-400">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-4 border-[#35C759]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-[#35C759] rounded-full animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-[#35C759] animate-pulse" />
              </div>
              <p className="text-sm font-medium animate-pulse">Buscando personas afines...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900">Tus Mejores Matches</h3>
                <Badge className="bg-[#35C759]/10 text-[#35C759] border-none font-bold">TOP 3</Badge>
              </div>

              <div className="space-y-4">
                <MatchProfile
                  name="Laura P."
                  match={95}
                  tags={["Madrugadora", "Estudiosa", "No fumadora"]}
                  image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200"
                  onViewProfile={() => setSelectedMatch({
                    name: "Laura P.",
                    room: "202-A",
                    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200",
                    bio: "Estudiante de Medicina. Me encanta el deporte, la naturaleza y leer. Busco un ambiente tranquilo para estudiar y compañeras con horarios similares.",
                    interests: ["Deporte", "Lectura", "Naturaleza", "Yoga", "Cocina saludable"],
                    sleepSchedule: "Madrugador",
                    lifestyle: ["No fumador", "Deportista", "Tranquilo", "Respetuoso"],
                    musicTaste: ["Pop", "Indie", "Jazz"],
                    studyHabits: "Muy Estudioso",
                    match: 95,
                  })}
                />
                <MatchProfile
                  name="David M."
                  match={82}
                  tags={["Gamer", "Nocturno", "Sociable"]}
                  image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200"
                  onViewProfile={() => setSelectedMatch({
                    name: "David M.",
                    room: "304-B",
                    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200",
                    bio: "Estudiante de Diseño Gráfico y streamer ocasional. Fan de los videojuegos, el anime y la tecnología. Siempre abierto a hacer nuevos amigos.",
                    interests: ["Videojuegos", "Anime", "Streaming", "Diseño", "Tecnología"],
                    sleepSchedule: "Nocturno",
                    lifestyle: ["No fumador", "Sociable", "Gamer", "Creativo"],
                    musicTaste: ["Electrónica", "Hip Hop", "Rock"],
                    studyHabits: "Equilibrado",
                    match: 82,
                  })}
                />
                <MatchProfile
                  name="Ana S."
                  match={78}
                  tags={["Creativa", "Música", "Sociable"]}
                  image="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200"
                  onViewProfile={() => setSelectedMatch({
                    name: "Ana S.",
                    room: "103-A",
                    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
                    bio: "Estudiante de Bellas Artes. Me apasiona la música, el arte y las actividades culturales. Me encanta organizar planes con amigos.",
                    interests: ["Arte", "Música", "Teatro", "Fotografía", "Viajes"],
                    sleepSchedule: "Flexible",
                    lifestyle: ["No fumador", "Sociable", "Creativo", "Fiestero"],
                    musicTaste: ["Indie", "Rock", "Pop"],
                    studyHabits: "Equilibrado",
                    match: 78,
                  })}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* MY PROFILE TAB */}
        <TabsContent value="profile" className="space-y-4 pb-20">
          <div className="bg-gradient-to-br from-[#1B5E20] via-[#35C759] to-[#7BD14F] p-6 rounded-2xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            
            <div className="relative flex items-start gap-4">
              <Avatar className="w-20 h-20 border-4 border-white/30 shadow-lg">
                {userProfile.photo ? (
                  <img src={userProfile.photo} alt={userProfile.name} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                    {userProfile.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{userProfile.name}</h2>
                <p className="text-white/80 text-sm mb-2">
                  <Home className="w-3.5 h-3.5 inline mr-1" />
                  Habitación {userProfile.room}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/20 border-white/40 text-white hover:bg-white/30 rounded-full h-8"
                  onClick={() => {
                    setEditProfile(userProfile);
                    setIsEditingProfile(true);
                  }}
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Editar Perfil
                </Button>
              </div>
            </div>
          </div>

          <Card className="border-gray-100 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-[#4A7C59]" />
                  Sobre mí
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {userProfile.bio}
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#4A7C59]" />
                  Intereses y Hobbies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.interests.map((interest) => (
                    <Badge
                      key={interest}
                      className="bg-[#4A7C59]/10 text-[#4A7C59] border-[#4A7C59]/20 hover:bg-[#4A7C59]/20"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Music className="w-4 h-4 text-[#4A7C59]" />
                  Gustos Musicales
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.musicTaste.map((genre) => (
                    <span
                      key={genre}
                      className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                    Horario
                  </p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    {userProfile.sleepSchedule === "Nocturno" ? (
                      <Moon className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    {userProfile.sleepSchedule}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                    Estudio
                  </p>
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                    <Briefcase className="w-4 h-4 text-blue-600" />
                    {userProfile.studyHabits}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
                  <Coffee className="w-4 h-4 text-[#4A7C59]" />
                  Estilo de Vida
                </h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.lifestyle.map((trait) => (
                    <span
                      key={trait}
                      className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-100 bg-blue-50 shadow-sm">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700 text-center">
                💡 Completa tu perfil para mejorar tus matches y conocer personas afines a ti
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu información para que otros residentes puedan conocerte mejor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-photo">URL de Foto de Perfil</Label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="edit-photo"
                  placeholder="https://..."
                  className="pl-10"
                  value={editProfile.photo}
                  onChange={(e) => setEditProfile({ ...editProfile, photo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bio">Sobre mí</Label>
              <Textarea
                id="edit-bio"
                placeholder="Cuéntale a otros sobre ti..."
                className="resize-none"
                rows={4}
                value={editProfile.bio}
                onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Intereses y Hobbies</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Añadir interés..."
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAddInterest}
                  className="bg-[#1B5E20] hover:bg-[#35C759] shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {editProfile.interests.map((interest) => (
                  <Badge
                    key={interest}
                    className="bg-[#35C759]/10 text-[#1B5E20] border-[#35C759]/20 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    onClick={() => handleRemoveInterest(interest)}
                  >
                    {interest}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-schedule">Horario de Sueño</Label>
              <select
                id="edit-schedule"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={editProfile.sleepSchedule}
                onChange={(e) => setEditProfile({ ...editProfile, sleepSchedule: e.target.value })}
              >
                <option value="Madrugador">Madrugador (me acuesto y levanto temprano)</option>
                <option value="Nocturno">Nocturno (prefiero la noche)</option>
                <option value="Flexible">Flexible (me adapto)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-study">Hábitos de Estudio</Label>
              <select
                id="edit-study"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                value={editProfile.studyHabits}
                onChange={(e) => setEditProfile({ ...editProfile, studyHabits: e.target.value })}
              >
                <option value="Muy Estudioso">Muy Estudioso</option>
                <option value="Estudioso">Estudioso</option>
                <option value="Equilibrado">Equilibrado</option>
                <option value="Relajado">Relajado</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Estilo de Vida</Label>
              <div className="grid grid-cols-2 gap-2">
                {["No fumador", "Fumador", "Sociable", "Tranquilo", "Mascotas", "Deportista", "Respetuoso", "Fiestero"].map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => {
                      if (editProfile.lifestyle.includes(trait)) {
                        setEditProfile({
                          ...editProfile,
                          lifestyle: editProfile.lifestyle.filter(t => t !== trait),
                        });
                      } else {
                        setEditProfile({
                          ...editProfile,
                          lifestyle: [...editProfile.lifestyle, trait],
                        });
                      }
                    }}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                      editProfile.lifestyle.includes(trait)
                        ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {editProfile.lifestyle.includes(trait) && <Check className="w-3 h-3 inline mr-1" />}
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Gustos Musicales</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Rock", "Pop", "Electrónica", "Hip Hop", "Indie", "Jazz", "Clásica", "Reggaeton"].map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      if (editProfile.musicTaste.includes(genre)) {
                        setEditProfile({
                          ...editProfile,
                          musicTaste: editProfile.musicTaste.filter(g => g !== genre),
                        });
                      } else {
                        setEditProfile({
                          ...editProfile,
                          musicTaste: [...editProfile.musicTaste, genre],
                        });
                      }
                    }}
                    className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                      editProfile.musicTaste.includes(genre)
                        ? "bg-purple-50 text-purple-700 border-purple-200 font-semibold"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {editProfile.musicTaste.includes(genre) && <Check className="w-3 h-3 inline mr-1" />}
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditingProfile(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveProfile}
              className="w-full sm:w-auto bg-[#1B5E20] hover:bg-[#35C759]"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Match Profile Dialog */}
      <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto rounded-2xl">
          {selectedMatch && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="w-16 h-16 border-2 border-[#35C759]/20">
                    {selectedMatch.photo ? (
                      <img src={selectedMatch.photo} alt={selectedMatch.name} className="w-full h-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-[#1B5E20]/10 text-[#1B5E20] text-xl font-bold">
                        {selectedMatch.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl">{selectedMatch.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      Habitación {selectedMatch.room}
                    </DialogDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-700 font-bold border-green-200">
                    {selectedMatch.match}% Match
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-sm">
                    <User className="w-4 h-4 text-[#1B5E20]" />
                    Sobre mí
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedMatch.bio}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-sm">
                    <Sparkles className="w-4 h-4 text-[#1B5E20]" />
                    Intereses y Hobbies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.interests.map((interest: string) => (
                      <Badge
                        key={interest}
                        className="bg-[#35C759]/10 text-[#1B5E20] border-[#35C759]/20"
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-sm">
                    <Music className="w-4 h-4 text-[#1B5E20]" />
                    Gustos Musicales
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.musicTaste.map((genre: string) => (
                      <span
                        key={genre}
                        className="text-xs bg-purple-50 text-purple-700 px-3 py-1 rounded-full border border-purple-200"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                      Horario
                    </p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      {selectedMatch.sleepSchedule === "Nocturno" ? (
                        <Moon className="w-4 h-4 text-indigo-600" />
                      ) : selectedMatch.sleepSchedule === "Madrugador" ? (
                        <Sun className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Sun className="w-4 h-4 text-blue-500" />
                      )}
                      {selectedMatch.sleepSchedule}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">
                      Estudio
                    </p>
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      {selectedMatch.studyHabits}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-sm">
                    <Coffee className="w-4 h-4 text-[#1B5E20]" />
                    Estilo de Vida
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.lifestyle.map((trait: string) => (
                      <span
                        key={trait}
                        className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200"
                      >
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  className="w-full bg-[#35C759] hover:bg-[#1B5E20]"
                  onClick={() => {
                    toast.success("Solicitud enviada", {
                      description: `${selectedMatch.name} recibirá tu solicitud de contacto.`,
                    });
                    setSelectedMatch(null);
                  }}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Conectar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommunityEvent({
  title,
  date,
  attendees,
  image,
  isJoined,
  onJoin,
  onLeave,
}: any) {
  return (
    <Card className="overflow-hidden border-none shadow-sm">
      <div className="h-32 bg-gray-200 relative">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold shadow-sm">
          Social
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" /> {date}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full border-2 border-white bg-gray-300 overflow-hidden"
              >
                <img 
                  src={`https://i.pravatar.cc/100?u=${i + (isJoined ? 10 : 0)}`} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            <span className="text-xs text-gray-500 pl-3 self-center">
              +{isJoined ? attendees + 1 : attendees} van
            </span>
          </div>
          {isJoined ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-green-600 h-8 px-4 rounded-full hover:bg-green-700"
                disabled
              >
                <Check className="w-4 h-4 mr-1" />
                Apuntado
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 rounded-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onLeave(title)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="bg-[#35C759] h-8 px-4 rounded-full hover:bg-[#1B5E20]"
              onClick={() => onJoin(title)}
            >
              Apuntarme
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MatchProfile({ name, match, tags, image, onViewProfile }: any) {
  return (
    <Card className="border-none shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={onViewProfile}>
      <CardContent className="p-4 flex gap-4 items-center">
        <Avatar className="w-14 h-14 border border-gray-100">
          <img src={image} alt={name} className="w-full h-full object-cover rounded-full" />
          <AvatarFallback className="bg-gray-100 text-gray-400 text-xl font-bold">
            {name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-900">{name}</h3>
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 font-bold border-green-200"
            >
              {match}% Match
            </Badge>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag: string) => (
              <span
                key={tag}
                className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full border border-gray-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            toast.success("¡Match guardado!", {
              description: `Has guardado el perfil de ${name} en tus favoritos.`,
            });
          }}
        >
          <Heart className="w-5 h-5" />
        </Button>
      </CardContent>
    </Card>
  );
}