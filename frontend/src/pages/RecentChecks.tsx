import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/Header';
import { getRecentChecks, CheckRecord } from '@/api/personal';
import { manageError } from '@/api/manageErrors';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Clock, Search, Building2, RefreshCw, LayoutGrid, List, 
  UserCheck, Calendar, Copy, Check, ShieldAlert, ArrowLeft,
  FileDown
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const RecentChecks: React.FC = () => {
  const { isLoggedIn } = useAuth();
  const [records, setRecords] = useState<CheckRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlantel, setSelectedPlantel] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isPolling, setIsPolling] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterTodayOnly, setFilterTodayOnly] = useState(false);

  const fetchRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await getRecentChecks();
      setRecords(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching recent checks:", error);
      if (!isSilent) {
        manageError(error);
      }
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  // Carga inicial al iniciar sesión
  useEffect(() => {
    if (isLoggedIn) {
      fetchRecords();
    }
  }, [isLoggedIn, fetchRecords]);

  // Polling automático
  useEffect(() => {
    if (!isLoggedIn || !isPolling) return;
    
    const interval = setInterval(() => {
      fetchRecords(true);
    }, 15000); // 15 segundos

    return () => clearInterval(interval);
  }, [isLoggedIn, isPolling, fetchRecords]);

  // Copiar ID de empleado
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`ID ${id} copiado al portapapeles`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Obtener planteles únicos para filtros
  const planteles = ['todos', ...Array.from(new Set(records.map(r => r.plantel).filter(Boolean)))];

  // Filtros
  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.clave_empleado.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlantel = selectedPlantel === 'todos' || record.plantel === selectedPlantel;

    let matchesToday = true;
    if (filterTodayOnly) {
      const checkDate = new Date(record.fecha_hora).toDateString();
      const today = new Date().toDateString();
      matchesToday = checkDate === today;
    }

    return matchesSearch && matchesPlantel && matchesToday;
  });

  // Exportar a PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título y Metadatos
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20); // Gris oscuro
      doc.text('Control de Asistencia - Accesos Recientes', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const generatedDate = new Date().toLocaleString();
      doc.text(`Reporte generado: ${generatedDate}`, 14, 27);
      
      // Resumen de filtros
      let filterSummary = 'Filtros aplicados: ';
      if (searchTerm) filterSummary += `Búsqueda: "${searchTerm}" | `;
      filterSummary += `Plantel: ${selectedPlantel === 'todos' ? 'Todos' : selectedPlantel} | `;
      filterSummary += `Fecha: ${filterTodayOnly ? 'Solo Hoy' : 'Todos los registros'}`;
      doc.text(filterSummary, 14, 33);
      
      // Definir columnas y filas
      const headers = [['Clave', 'Nombre Completo', 'Plantel', 'Fecha', 'Hora']];
      
      const rows = filteredRecords.map(record => {
        const checkTime = new Date(record.fecha_hora);
        const fecha = checkTime.toLocaleDateString();
        const hora = checkTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return [
          record.clave_empleado,
          record.nombre_completo,
          record.plantel,
          fecha,
          hora
        ];
      });
      
      // Generar tabla
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 38,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 25 }, // Clave
          1: { cellWidth: 70 }, // Nombre Completo
          2: { cellWidth: 40 }, // Plantel
          3: { cellWidth: 30 }, // Fecha
          4: { cellWidth: 25 }  // Hora
        }
      });
      
      // Guardar archivo
      const fileName = `reporte_asistencia_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success('Reporte PDF descargado con éxito');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Ocurrió un error al generar el PDF');
    }
  };

  // Estadísticas del día
  const totalToday = records.filter(r => {
    const checkDate = new Date(r.fecha_hora).toDateString();
    const today = new Date().toDateString();
    return checkDate === today;
  }).length;

  const activePlantelsCount = new Set(records.map(r => r.plantel).filter(Boolean)).size;

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Hace unos instantes';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header title="Control de Accesos" subtitle="Monitoreo de asistencia en tiempo real" />
        <main className="flex-1 container mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <Card className="max-w-md w-full border-dashed border-2 border-border/70 bg-card/45 backdrop-blur-md text-center p-8 shadow-xl">
            <CardHeader className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <CardTitle className="text-2xl font-bold">Acceso Restringido</CardTitle>
              <CardDescription className="text-base mt-2">
                Debes iniciar sesión con tu cuenta para visualizar el registro de asistencia reciente.
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-4">
              <p className="text-sm text-muted-foreground mb-6">
                Utiliza el botón de perfil en la esquina superior derecha para ingresar tus credenciales.
              </p>
              <Link to="/">
                <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header title="Control de Accesos" subtitle="Monitoreo de asistencia y personal en tiempo real" showBackLink />

      <main className="container mx-auto px-4 py-8 space-y-8">
        
        {/* Estadísticas Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card/45 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Checks Registrados Hoy</CardTitle>
              <UserCheck className="h-5 w-5 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-emerald-500">{totalToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Registrados en la fecha actual</p>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Planteles Activos</CardTitle>
              <Building2 className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-blue-500">{activePlantelsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Sedes con accesos registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-card/45 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all duration-300 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Última Actualización</CardTitle>
              <Clock className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mt-1">
                {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Actualizado automáticamente
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-card/30 border border-border/40 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 items-center flex-1">
            {/* Buscador */}
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Selector de Plantel */}
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">Plantel:</span>
                <div className="flex flex-wrap gap-1">
                  {planteles.slice(0, 5).map(plantel => (
                    <Badge
                      key={plantel}
                      variant={selectedPlantel === plantel ? 'default' : 'outline'}
                      className="cursor-pointer capitalize px-3 py-1 text-xs transition-colors hover:bg-primary/20"
                      onClick={() => setSelectedPlantel(plantel)}
                    >
                      {plantel === 'todos' ? 'Todos' : plantel}
                    </Badge>
                  ))}
                  {planteles.length > 5 && (
                    <select
                      value={selectedPlantel}
                      onChange={(e) => setSelectedPlantel(e.target.value)}
                      className="bg-transparent border border-border rounded-md px-2 py-0.5 text-xs focus:outline-none capitalize"
                    >
                      <option value="todos">Otros...</option>
                      {planteles.slice(5).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Filtro Solo Hoy */}
              <div className="flex items-center gap-2 border-l pl-4 border-border/40">
                <span className="text-sm text-muted-foreground hidden sm:inline whitespace-nowrap">Fecha:</span>
                <Badge
                  variant={filterTodayOnly ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1 text-xs transition-all duration-300 ${
                    filterTodayOnly 
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                      : 'hover:bg-primary/10 border-border'
                  }`}
                  onClick={() => setFilterTodayOnly(!filterTodayOnly)}
                >
                  Solo Hoy
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            {/* Botón Exportar PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="text-xs border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Exportar PDF
            </Button>

            {/* Auto-Refresh Toggle */}
            <Button
              variant={isPolling ? "default" : "outline"}
              size="sm"
              onClick={() => setIsPolling(!isPolling)}
              className="flex items-center gap-2 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin' : ''}`} />
              {isPolling ? 'Auto-Refresco Activo' : 'Auto-Refresco Inactivo'}
            </Button>

            {/* Botón Refrescar Manual */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRecords()}
              disabled={isLoading}
              className="text-xs"
            >
              Refrescar
            </Button>

            {/* Vista Toggle */}
            <div className="border border-border/80 rounded-lg p-0.5 flex bg-background/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8 rounded-md"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="w-8 h-8 rounded-md"
                onClick={() => setViewMode('table')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Feed de Resultados */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse bg-card/30 border-border/30 h-40">
                <CardContent className="h-full flex items-center space-x-4 p-6">
                  <div className="w-16 h-16 rounded-full bg-muted" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="text-center p-12 border-dashed border-2 border-border/80 bg-card/30">
            <CardHeader className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <Search className="w-6 h-6" />
              </div>
              <CardTitle>Sin Resultados</CardTitle>
              <CardDescription className="max-w-sm mt-2 mx-auto">
                No se encontraron registros de checks recientes que coincidan con la búsqueda o el plantel seleccionado.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecords.map((record) => {
              const checkTime = new Date(record.fecha_hora);
              return (
                <Card 
                  key={`${record.clave_empleado}-${record.fecha_hora}`}
                  className="bg-card/45 backdrop-blur-md border-border/50 hover:border-primary/40 hover:shadow-lg transition-all duration-300 rounded-xl overflow-hidden group"
                >
                  <CardContent className="p-6 flex items-start space-x-4">
                    {/* Foto o Iniciales del Empleado */}
                    <Avatar className="w-16 h-16 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300 object-cover">
                      {record.foto ? (
                        <AvatarImage src={record.foto} alt={record.nombre_completo} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                        {record.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>

                    {/* Información Principal */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h3 className="font-bold text-base text-foreground leading-tight truncate group-hover:text-primary transition-colors">
                        {record.nombre_completo}
                      </h3>
                      
                      <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
                        <span className="font-semibold">ID: {record.clave_empleado}</span>
                        <button 
                          onClick={() => handleCopyId(record.clave_empleado)}
                          className="hover:text-primary transition-colors"
                          title="Copiar ID"
                        >
                          {copiedId === record.clave_empleado ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500 animate-scale-up" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 text-blue-500/80" />
                        <span className="capitalize">{record.plantel}</span>
                      </div>

                      {/* Registro de Tiempo */}
                      <div className="pt-2 flex flex-col space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{checkTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatRelativeTime(record.fecha_hora)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                          <Calendar className="w-3 h-3" />
                          <span>{checkTime.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Vista de Tabla */
          <Card className="bg-card/45 backdrop-blur-md border border-border/50 rounded-xl overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-16">Foto</TableHead>
                  <TableHead>Personal</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Plantel</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora de Check</TableHead>
                  <TableHead className="text-right">Relativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                  const checkTime = new Date(record.fecha_hora);
                  return (
                    <TableRow key={`${record.clave_empleado}-${record.fecha_hora}`} className="group hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <Avatar className="w-10 h-10 object-cover">
                          {record.foto ? (
                            <AvatarImage src={record.foto} alt={record.nombre_completo} className="object-cover" />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-sm">
                            {record.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {record.nombre_completo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <code className="text-xs bg-muted border rounded px-1.5 py-0.5">{record.clave_empleado}</code>
                          <button 
                            onClick={() => handleCopyId(record.clave_empleado)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {copiedId === record.clave_empleado ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{record.plantel}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {checkTime.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-500">
                        {checkTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <span className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {formatRelativeTime(record.fecha_hora)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </main>
    </div>
  );
};

export default RecentChecks;
