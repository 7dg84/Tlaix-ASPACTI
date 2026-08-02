import React, { useEffect, useRef, useState } from 'react';
import { Header } from '@/components/Header';
import { verifyQR, VerificationData } from '@/api/personal';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  QrCode, UserCheck, ShieldCheck, Mail, GraduationCap, Building2, Copy, Check, Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const VerifyQR: React.FC = () => {
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scanInProgressRef = useRef(false);

  // Función para generar hash SHA-256 nativo en el navegador
  const generateSHA256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (scanInProgressRef.current) return;
    scanInProgressRef.current = true;
    setIsVerifying(true);

    try {
      // 1. Generar hash de la cadena del QR
      const hash = await generateSHA256(decodedText.trim());
      
      // 2. Realizar petición de verificación
      const data = await verifyQR(hash);
      
      // 3. Mostrar resultados
      setVerificationResult(data);
      setShowModal(true);
      toast.success('Código verificado con éxito');
    } catch (err: any) {
      console.error('Error verificando código:', err);
      if (err.response && err.response.status === 404) {
        toast.error('Código QR no registrado o tarjeta inválida');
      } else {
        toast.error('Error en la conexión con el servidor de validación');
      }
      // Si falla la verificación, volvemos a permitir escaneos
      scanInProgressRef.current = false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setVerificationResult(null);
    // Reiniciar bandera de escaneo para permitir volver a escanear
    scanInProgressRef.current = false;
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success(`ID ${id} copiado`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    // Inicializar escáner
    const scanner = new Html5QrcodeScanner(
      "qr-reader-container",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (text) => handleScanSuccess(text),
      (err) => {
        // Ignorar logs constantes de lectura fallida
      }
    );

    return () => {
      scanner.clear().catch((error) => {
        console.error("Error al apagar el escáner de QR:", error);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header title="Verificación de Tarjetas" subtitle="Valida las credenciales de personal usando códigos QR" showBackLink />

      <main className="container mx-auto px-4 py-8 flex flex-col items-center justify-center max-w-xl space-y-6">
        
        {/* Lector de QR */}
        <Card className="w-full bg-card/45 backdrop-blur-md border border-border/50 shadow-xl overflow-hidden rounded-2xl">
          <CardHeader className="text-center pb-4 border-b border-border/20">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
              <QrCode className="w-6 h-6 animate-pulse" />
            </div>
            <CardTitle>Escanear Credencial</CardTitle>
            <CardDescription>
              Apunta la cámara de tu dispositivo hacia el código QR de la tarjeta de personal.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center relative">
            
            {/* Lector HTML5 */}
            <div 
              id="qr-reader-container" 
              className="w-full max-w-md rounded-xl overflow-hidden border border-border/50 bg-background/50 shadow-inner"
            />

            {/* Spinner Overlay al Verificar */}
            {isVerifying && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20 space-y-3 rounded-2xl">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-semibold text-muted-foreground">Validando credencial...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Validación del Registro */}
        <Dialog open={showModal} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50 backdrop-blur-lg rounded-2xl">
            <DialogHeader className="flex flex-col items-center border-b border-border/20 pb-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <DialogTitle className="text-2xl font-bold text-center text-emerald-500">
                Credencial Válida
              </DialogTitle>
              <DialogDescription className="text-center text-xs text-muted-foreground mt-1">
                Datos verificados correctamente en el servidor
              </DialogDescription>
            </DialogHeader>

            {verificationResult && (
              <div className="space-y-6 py-4 flex flex-col items-center">
                {/* Foto / Avatar del Empleado */}
                <Avatar className="w-24 h-24 rounded-full ring-4 ring-emerald-500/20 object-cover shadow-md">
                  {verificationResult.foto ? (
                    <AvatarImage src={verificationResult.foto} alt={verificationResult.nombre_completo} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-2xl">
                    {verificationResult.nombre_completo.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </AvatarFallback>
                </Avatar>

                {/* Datos del Empleado */}
                <div className="w-full space-y-4">
                  <div className="text-center space-y-1">
                    <h3 className="text-xl font-bold text-foreground leading-tight px-2">
                      {verificationResult.nombre_completo}
                    </h3>
                    <Badge variant="secondary" className="capitalize mt-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border-emerald-500/20">
                      Personal Activo
                    </Badge>
                  </div>

                  <div className="space-y-3 border-t border-border/20 pt-4 text-sm">
                    {/* Clave de Empleado */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-medium">Clave Empleado:</span>
                      <div className="flex items-center space-x-1.5 font-bold">
                        <code>{verificationResult.clave_empleado}</code>
                        <button 
                          onClick={() => handleCopyId(verificationResult.clave_empleado)}
                          className="text-muted-foreground hover:text-primary transition-colors"
                          title="Copiar Clave"
                        >
                          {copiedId === verificationResult.clave_empleado ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Plantel */}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs font-medium">Plantel / Sede:</span>
                      <span className="font-semibold flex items-center gap-1 capitalize">
                        <Building2 className="w-3.5 h-3.5 text-blue-500" />
                        {verificationResult.plantel}
                      </span>
                    </div>

                    {/* Correo */}
                    {verificationResult.correo && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">Correo Electrónico:</span>
                        <span className="font-semibold flex items-center gap-1 text-xs text-foreground truncate max-w-[200px]">
                          <Mail className="w-3.5 h-3.5 text-purple-500" />
                          {verificationResult.correo}
                        </span>
                      </div>
                    )}

                    {/* Nivel Educativo */}
                    {verificationResult.nivel_educativo && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">Nivel Educativo:</span>
                        <span className="font-semibold flex items-center gap-1 text-xs">
                          <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                          {verificationResult.nivel_educativo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="w-full sm:justify-center border-t border-border/20 pt-4">
              <Button onClick={handleCloseModal} className="w-full py-6 text-base font-semibold rounded-xl">
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default VerifyQR;
