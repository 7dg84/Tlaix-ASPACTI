import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { 
  getNewsItems, 
  createNewsItem, 
  deleteNewsItem, 
  voteInPoll, 
  getComments, 
  addComment, 
  deleteComment 
} from '../api/novedades';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Megaphone, 
  Vote, 
  MessageSquare, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Send, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  X,
  User
} from 'lucide-react';

const renderMarkdown = (text: string) => {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  // Encabezados
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-base font-bold mt-3 mb-1 text-card-foreground">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2 text-card-foreground">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-5 mb-3 text-card-foreground">$1</h1>');
  
  // Negrita
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Cursiva
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Código
  html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-muted text-destructive font-mono text-sm">$1</code>');
  
  // Enlaces
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>');

  // Listas
  html = html.replace(/^\s*-\s*(.*$)/gim, '<li class="ml-4 list-disc text-muted-foreground">$1</li>');

  // Saltos de línea
  html = html.split('\n').join('<br />');
  
  return html;
};

const Novedades = () => {
  const { isLoggedIn, user } = useAuth();
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Estados del Formulario de Creación
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState('announcement');
  const [newAllowComments, setNewAllowComments] = useState(true);
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Estados de Comentarios
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isCommentsLoading, setIsCommentsLoading] = useState<Record<string, boolean>>({});

  const loadNews = async () => {
    setIsLoading(true);
    try {
      const res = await getNewsItems();
      setNews(res.data);
    } catch (error) {
      console.error("Error al cargar novedades:", error);
      toast.error("No se pudieron cargar las novedades.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error("Por favor, completa el título y contenido.");
      return;
    }

    let optionsPayload: { text: string }[] = [];
    if (newType === 'poll') {
      const validOptions = pollOptions.filter(opt => opt.trim() !== '');
      if (validOptions.length < 2) {
        toast.error("Las encuestas deben tener al menos 2 opciones.");
        return;
      }
      optionsPayload = validOptions.map(opt => ({ text: opt.trim() }));
    }

    const payload = {
      title: newTitle.trim(),
      content: newContent.trim(),
      news_type: newType,
      allow_comments: newAllowComments,
      expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : null,
      poll_options: optionsPayload
    };

    try {
      await createNewsItem(payload);
      toast.success("Novedad publicada exitosamente.");
      setIsCreateOpen(false);
      // Reiniciar formulario
      setNewTitle('');
      setNewContent('');
      setNewType('announcement');
      setNewAllowComments(true);
      setNewExpiresAt('');
      setPollOptions(['', '']);
      loadNews();
    } catch (error: any) {
      console.error("Error al crear novedad:", error);
      toast.error(error.response?.data?.detail || "Error al crear novedad.");
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar esta publicación?")) return;
    try {
      await deleteNewsItem(id);
      toast.success("Publicación eliminada.");
      loadNews();
    } catch (error) {
      console.error("Error al eliminar novedad:", error);
      toast.error("No se pudo eliminar la novedad.");
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    try {
      await voteInPoll(postId, optionId);
      toast.success("¡Voto registrado!");
      loadNews();
    } catch (error: any) {
      console.error("Error al votar:", error);
      toast.error(error.response?.data?.detail || "No se pudo registrar el voto.");
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedComments[postId]) {
      setExpandedComments(prev => ({ ...prev, [postId]: false }));
    } else {
      setIsCommentsLoading(prev => ({ ...prev, [postId]: true }));
      try {
        const res = await getComments(postId);
        setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
        setExpandedComments(prev => ({ ...prev, [postId]: true }));
      } catch (error) {
        console.error("Error al cargar comentarios:", error);
        toast.error("No se pudieron cargar los comentarios.");
      } finally {
        setIsCommentsLoading(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      await addComment(postId, text);
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      // Recargar comentarios
      const res = await getComments(postId);
      setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
      // Actualizar conteo en el post principal
      loadNews();
      toast.success("Comentario publicado.");
    } catch (error: any) {
      console.error("Error al comentar:", error);
      toast.error(error.response?.data?.detail || "No se pudo publicar el comentario.");
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este comentario?")) return;
    try {
      await deleteComment(commentId);
      const res = await getComments(postId);
      setCommentsMap(prev => ({ ...prev, [postId]: res.data }));
      loadNews();
      toast.success("Comentario eliminado.");
    } catch (error) {
      console.error("Error al eliminar comentario:", error);
      toast.error("No se pudo eliminar el comentario.");
    }
  };

  const handleAddOption = () => {
    setPollOptions([...pollOptions, '']);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...pollOptions];
    updated[idx] = val;
    setPollOptions(updated);
  };

  const handleRemoveOption = (idx: number) => {
    if (pollOptions.length <= 2) return;
    setPollOptions(pollOptions.filter((_, i) => i !== idx));
  };

  const handlePresetYesNo = () => {
    setPollOptions(['Sí', 'No']);
  };

  const filteredNews = news.filter(item => {
    if (filter === 'all') return true;
    return item.news_type === filter;
  });

  const getNewsTypeConfig = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          icon: Megaphone,
          label: 'Anuncio',
          color: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20',
          gradient: 'from-blue-500/5 to-transparent'
        };
      case 'poll':
        return {
          icon: Vote,
          label: 'Encuesta',
          color: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20',
          gradient: 'from-emerald-500/5 to-transparent'
        };
      case 'feedback':
        return {
          icon: MessageSquare,
          label: 'Feedback',
          color: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20',
          gradient: 'from-purple-500/5 to-transparent'
        };
      default:
        return {
          icon: Megaphone,
          label: 'Novedad',
          color: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
          gradient: 'from-gray-500/5 to-transparent'
        };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Novedades y Actualizaciones" subtitle="Entérate de anuncios, responde encuestas y opina" showBackLink />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Cabecera del control */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          
          {/* Filtros */}
          <div className="flex items-center gap-1 bg-card border rounded-lg p-1 w-full sm:w-auto">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'announcement', label: 'Anuncios' },
              { id: 'poll', label: 'Encuestas' },
              { id: 'feedback', label: 'Feedback' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex-1 sm:flex-none ${
                  filter === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Botón Crear Novedad (Solo si el usuario tiene el permiso de adición en backend) */}
          {isLoggedIn && user?.can_add_news && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  Crear Novedad
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Publicar Nueva Novedad</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateNews} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                      id="title"
                      placeholder="Título de la publicación"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="news_type">Tipo de publicación</Label>
                      <Select value={newType} onValueChange={(val) => {
                        setNewType(val);
                        if (val === 'poll') {
                          setPollOptions(['', '']);
                        }
                      }}>
                        <SelectTrigger id="news_type">
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Anuncio</SelectItem>
                          <SelectItem value="poll">Encuesta</SelectItem>
                          <SelectItem value="feedback">Solicitud de Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expires_at">Fecha de Expiración (Opcional)</Label>
                      <Input
                        id="expires_at"
                        type="datetime-local"
                        value={newExpiresAt}
                        onChange={(e) => setNewExpiresAt(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido (Soporta Markdown)</Label>
                    <Textarea
                      id="content"
                      placeholder="Escribe el contenido aquí... Usa **negrita** para resaltar, *cursiva*, o - listas."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>

                  {/* Campos dinámicos para encuestas */}
                  {newType === 'poll' && (
                    <div className="border p-4 rounded-lg bg-muted/30 space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="font-semibold text-sm">Opciones de la Encuesta</Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={handlePresetYesNo}
                          className="h-8 text-primary hover:text-primary/80"
                        >
                          Usar Sí / No
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                        {pollOptions.map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                            <Input
                              placeholder={`Opción ${idx + 1}`}
                              value={option}
                              onChange={(e) => handleOptionChange(idx, e.target.value)}
                              required
                            />
                            {pollOptions.length > 2 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveOption(idx)}
                                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddOption}
                        className="w-full flex items-center gap-1 border-dashed mt-2"
                      >
                        <Plus className="w-4 h-4" /> Añadir Opción
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="allow_comments"
                      checked={newAllowComments}
                      onCheckedChange={(checked) => setNewAllowComments(!!checked)}
                    />
                    <Label htmlFor="allow_comments" className="cursor-pointer text-sm font-medium">
                      Habilitar sección de comentarios y retroalimentación
                    </Label>
                  </div>

                  <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      Publicar
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Listado de novedades */}
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse border-border/50">
                <div className="h-4 bg-muted w-1/3 m-6 rounded" />
                <div className="h-20 bg-muted mx-6 mb-6 rounded" />
              </Card>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2">
            <Megaphone className="w-12 h-12 mx-auto text-muted-foreground/60 mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">No hay novedades registradas</h3>
            <p className="text-sm text-muted-foreground mt-1">Vuelve más tarde para ver nuevos anuncios o encuestas.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredNews.map((item) => {
              const typeConfig = getNewsTypeConfig(item.news_type);
              const Icon = typeConfig.icon;
              const hasUserVoted = item.has_voted;
              const isExpired = item.is_expired;

              return (
                <Card 
                  key={item.id} 
                  className={`overflow-hidden border-border/50 hover:shadow-md transition-shadow relative bg-gradient-to-br ${typeConfig.gradient}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={`font-semibold capitalize flex items-center gap-1 ${typeConfig.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {typeConfig.label}
                          </Badge>
                          {isExpired && (
                            <Badge variant="destructive" className="font-semibold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expirado
                            </Badge>
                          )}
                          {!isExpired && item.expires_at && (
                            <Badge variant="secondary" className="font-normal text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Expira: {new Date(item.expires_at).toLocaleString()}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl font-bold pt-1">{item.title}</CardTitle>
                      </div>

                      {/* Botón de Borrar (Para el autor del post o usuarios con can_add_news) */}
                      {isLoggedIn && (user?.can_add_news || user?.id === item.author?.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteNews(item.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{item.author?.username || 'Administrador'}</span>
                      </div>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    <div 
                      className="text-muted-foreground text-sm leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
                    />

                    {/* Contenido particular para Encuestas */}
                    {item.news_type === 'poll' && (
                      <div className="mt-6 border-t pt-4 space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                          <Vote className="w-4 h-4 text-emerald-500" />
                          Resultados de la Encuesta:
                        </h4>

                        <div className="space-y-3">
                          {item.poll_options?.map((option: any) => {
                            const isVotedOption = option.id === item.user_vote_option_id;
                            const showResults = hasUserVoted || isExpired;

                            if (showResults) {
                              return (
                                <div key={option.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium flex items-center gap-1">
                                      {option.text}
                                      {isVotedOption && (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                                      )}
                                    </span>
                                    <span className="text-muted-foreground">
                                      {option.percentage}% ({option.votes_count} {option.votes_count === 1 ? 'voto' : 'votos'})
                                    </span>
                                  </div>
                                  <Progress value={option.percentage} className="h-2.5 bg-muted/60" />
                                </div>
                              );
                            } else {
                              return (
                                <Button
                                  key={option.id}
                                  variant="outline"
                                  onClick={() => handleVote(item.id, option.id)}
                                  disabled={!isLoggedIn}
                                  className="w-full text-left justify-start py-5 px-4 font-medium border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-sm"
                                >
                                  {option.text}
                                </Button>
                              );
                            }
                          })}
                        </div>

                        {item.news_type === 'poll' && (
                          <p className="text-xs text-muted-foreground">
                            {hasUserVoted 
                              ? "Ya has votado en esta encuesta. Los porcentajes se calculan en tiempo real." 
                              : isExpired 
                                ? "La votación está cerrada." 
                                : isLoggedIn 
                                  ? "Selecciona una opción para emitir tu voto." 
                                  : "Inicia sesión para poder participar en la encuesta."
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>

                  {/* Panel de Comentarios */}
                  {item.allow_comments && (
                    <CardFooter className="bg-card/40 border-t flex-col items-stretch p-4">
                      
                      {/* Botón Colapsable */}
                      <button
                        onClick={() => toggleComments(item.id)}
                        className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-4 h-4" />
                          Comentarios ({item.comments_count})
                        </span>
                        {expandedComments[item.id] ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {/* Sección de Comentarios Expandida */}
                      {expandedComments[item.id] && (
                        <div className="mt-4 space-y-4 pt-2 border-t">
                          
                          {/* Listado */}
                          {isCommentsLoading[item.id] ? (
                            <div className="text-center py-4 text-sm text-muted-foreground animate-pulse">
                              Cargando comentarios...
                            </div>
                          ) : !commentsMap[item.id] || commentsMap[item.id].length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No hay comentarios aún. ¡Sé el primero en opinar!
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                              {commentsMap[item.id].map((comment: any) => (
                                <div key={comment.id} className="bg-muted/40 p-3 rounded-lg border border-border/40 text-sm relative group">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                    <span className="font-semibold text-foreground">{comment.user?.username}</span>
                                    <div className="flex items-center gap-2">
                                      <span>{new Date(comment.created_at).toLocaleString()}</span>
                                      
                                      {/* Eliminar Comentario */}
                                      {isLoggedIn && (
                                        user?.is_superuser || 
                                        comment.user?.id === user?.id || 
                                        item.author?.id === user?.id
                                      ) && (
                                        <button
                                          onClick={() => handleDeleteComment(item.id, comment.id)}
                                          className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-muted-foreground">{comment.content}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Formulario para agregar */}
                          {isLoggedIn ? (
                            !isExpired ? (
                              <div className="flex items-center gap-2 pt-2">
                                <Input
                                  placeholder="Escribe un comentario..."
                                  value={commentInputs[item.id] || ''}
                                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddComment(item.id);
                                  }}
                                  className="flex-1"
                                />
                                <Button 
                                  size="icon" 
                                  onClick={() => handleAddComment(item.id)}
                                  disabled={!commentInputs[item.id]?.trim()}
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="text-center py-2 text-xs text-muted-foreground flex items-center justify-center gap-1 bg-muted/30 rounded border">
                                <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                                Publicación archivada. No se aceptan nuevos comentarios.
                              </div>
                            )
                          ) : (
                            <div className="text-center py-2 text-xs text-muted-foreground bg-muted/20 rounded">
                              Inicia sesión para participar en la retroalimentación.
                            </div>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Novedades;
