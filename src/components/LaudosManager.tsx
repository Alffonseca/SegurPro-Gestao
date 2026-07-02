import React, { useState, useMemo, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from '../firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  FileText, 
  Download, 
  Loader2, 
  Eye, 
  Calendar as CalendarIcon, 
  User as UserIcon, 
  ShieldAlert, 
  CheckCircle2, 
  LayoutGrid, 
  List, 
  AlertTriangle,
  Notebook,
  Building,
  Printer,
  ChevronRight,
  Upload
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface LaudoTecnico {
  id: string;
  number: number | string;
  clientId: string;
  clientName: string;
  visitId?: string;
  date: any;
  inspectorName: string;
  address?: string;
  status: 'Rascunho' | 'Finalizado';
  overview: string; // Relatório de Vistoria / Cenário Encontrado
  technicalAnalysis: string; // Análise Técnica / Diagnóstico
  recommendations: string; // Recomendações e Conclusões
  observations?: string;
  createdAt: any;
  photos?: string[]; // base64 images of the location
}

interface LaudosManagerProps {
  laudos: LaudoTecnico[];
  clients: any[];
  visits: any[];
  companyId: string;
  showList: boolean;
  logAction?: any;
  appSettings?: any;
}

const safeParseDate = (date: any): Date => {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (date && typeof date.toDate === 'function') return date.toDate();
  if (date && date.seconds !== undefined) return new Date(date.seconds * 1000);
  if (typeof date === 'string') {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
};

const formatRecordNumber = (number?: number | string) => {
  if (!number) return '---';
  return String(number).padStart(5, '0');
};

const DoubleScrollContainer = ({ children }: { children: React.ReactNode }) => {
  const topScrollRef = React.useRef<HTMLDivElement>(null);
  const bottomScrollRef = React.useRef<HTMLDivElement>(null);
  const isScrollingTop = React.useRef(false);
  const isScrollingBottom = React.useRef(false);
  const [showTopScroll, setShowTopScroll] = React.useState(false);
  const [scrollWidth, setScrollWidth] = React.useState(0);

  const handleTopScroll = () => {
    if (isScrollingBottom.current) return;
    if (topScrollRef.current && bottomScrollRef.current) {
      isScrollingTop.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
      setTimeout(() => { isScrollingTop.current = false; }, 50);
    }
  };

  const handleBottomScroll = (e: any) => {
    if (isScrollingTop.current) return;
    if (topScrollRef.current && e.target) {
      isScrollingBottom.current = true;
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
      setTimeout(() => { isScrollingBottom.current = false; }, 50);
    }
  };

  React.useEffect(() => {
    const bottomWrapper = bottomScrollRef.current;
    if (!bottomWrapper) return;

    const syncWidth = () => {
      if (bottomWrapper) {
        const contentWidth = bottomWrapper.scrollWidth;
        const containerWidth = bottomWrapper.clientWidth;
        
        setScrollWidth(contentWidth);
        const shouldShow = contentWidth > containerWidth + 5;
        setShowTopScroll(shouldShow);
      }
    };

    syncWidth();
    const t = setTimeout(syncWidth, 100);

    const resizeObserver = new ResizeObserver(() => {
      syncWidth();
    });
    resizeObserver.observe(bottomWrapper);

    let observedElement: Element | null = null;
    const updateObservation = () => {
      if (observedElement) {
        resizeObserver.unobserve(observedElement);
      }
      const newTarget = bottomWrapper.firstElementChild;
      if (newTarget) {
        resizeObserver.observe(newTarget);
        observedElement = newTarget;
      }
      syncWidth();
    };

    updateObservation();

    const mutationObserver = new MutationObserver(() => {
      updateObservation();
    });
    mutationObserver.observe(bottomWrapper, {
      childList: true,
      subtree: true,
      characterData: true
    });

    window.addEventListener('resize', syncWidth);
    const syncInterval = setInterval(syncWidth, 1000);

    return () => {
      clearTimeout(t);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener('resize', syncWidth);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <div className="flex flex-col w-full relative group/scroll" style={{ direction: 'ltr' }}>
      {scrollWidth > 0 && (
        <div 
          ref={topScrollRef} 
          onScroll={handleTopScroll}
          className="w-full overflow-x-auto overflow-y-hidden bg-[#0f1115] border-b border-[#2d3139]/30 rounded-t-lg transition-all hashScrollTop"
          style={{ 
            height: '14px', 
            display: showTopScroll ? 'block' : 'none',
            direction: 'ltr'
          }}
        >
          <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
        </div>
      )}

      <div 
        className="w-full overflow-y-auto overflow-x-hidden flex-1 scroll-left-container custom-scrollbar pr-0 rounded-b-xl border border-[#2d3139]/60 hashScrollBottom"
        style={{ direction: 'rtl', maxHeight: '550px' }}
      >
        <div 
          ref={bottomScrollRef} 
          onScroll={handleBottomScroll}
          className="w-full overflow-x-auto overflow-y-visible"
          style={{ direction: 'ltr' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale calculations
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG to make it lightweight
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
}

function PhotoUploader({ photos = [], onChange }: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setIsUploading(true);
    const newPhotos = [...photos];

    for (const file of files) {
      if (newPhotos.length >= 6) {
        toast.error("Limite máximo de 6 fotos atingido.");
        break;
      }

      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const rawBase64 = event.target?.result as string;
          try {
            const compressed = await compressImage(rawBase64);
            newPhotos.push(compressed);
          } catch (err) {
            newPhotos.push(rawBase64);
          }
          resolve();
        };
        reader.readAsDataURL(file as Blob);
      });
    }

    onChange(newPhotos);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="text-[#a0a0a0] text-[#a0a0a0] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
        <Upload size={14} className="text-[#3b82f6]" />
        Fotos do Local (Máx. 6)
      </Label>
      
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="relative group aspect-video rounded-lg overflow-hidden border border-[#2d3139] bg-[#0f1115]">
            <img src={photo} alt={`Foto do local ${index + 1}`} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
            <button
              type="button"
              onClick={() => handleRemovePhoto(index)}
              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              title="Excluir foto"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}

        {photos.length < 6 && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border border-dashed border-[#2d3139] hover:border-[#3b82f6]/50 bg-[#0f1115] hover:bg-[#2d3139]/20 transition-all rounded-lg aspect-video cursor-pointer text-center p-2 group"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-[#3b82f6] animate-spin" />
            ) : (
              <>
                <Plus size={18} className="text-[#71717a] group-hover:text-[#3b82f6] transition-colors" />
                <span className="text-[10px] text-[#71717a] group-hover:text-white mt-1 transition-colors font-bold uppercase tracking-widest">Adicionar</span>
              </>
            )}
          </div>
        )}
      </div>
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange} 
        multiple 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}

// INÍCIO DA ROTINA: COMPONENTE GERENCIADOR DE LAUDOS TÉCNICOS (LaudosManager.tsx)
// Esta rotina controla o cadastro, andamento, recomendações, diagnóstico técnico,
// registro fotográfico e geração de PDFs profissionais de Laudos Técnicos baseados em vistorias.
export function LaudosManager({ 
  laudos = [], 
  clients = [], 
  visits = [], 
  companyId, 
  showList, 
  logAction,
  appSettings
}: LaudosManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const [newLaudo, setNewLaudo] = useState<Partial<LaudoTecnico>>({
    status: 'Rascunho',
    inspectorName: '',
    overview: '',
    technicalAnalysis: '',
    recommendations: '',
    observations: '',
    address: '',
    clientId: '',
    clientName: '',
    visitId: '',
    photos: []
  });
  const [editingLaudo, setEditingLaudo] = useState<LaudoTecnico | null>(null);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [laudoToDelete, setLaudoToDelete] = useState<LaudoTecnico | null>(null);

  // Filtered lists
  const filteredLaudos = useMemo(() => {
    return (laudos || []).filter(l => 
      (l.clientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.inspectorName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (String(l.number) || '').includes(searchTerm)
    );
  }, [laudos, searchTerm]);

  // Handle client selection to autofill address
  const handleClientChange = (clientId: string, isEdit = false) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    if (isEdit && editingLaudo) {
      setEditingLaudo({
        ...editingLaudo,
        clientId,
        clientName: client.name || '',
        address: client.address || ''
      });
    } else {
      setNewLaudo({
        ...newLaudo,
        clientId,
        clientName: client.name || '',
        address: client.address || ''
      });
    }
  };

  // List of technical visits filtered by selected client
  const getClientVisits = (clientId?: string) => {
    if (!clientId) return [];
    return visits.filter(v => 
      v.clientId === clientId && v.status === 'Concluída'
    );
  };

  const handleAddLaudo = async () => {
    if (!newLaudo.clientId) {
      toast.error('O cliente é obrigatório.');
      return;
    }
    if (!newLaudo.inspectorName) {
      toast.error('O nome do inspetor/técnico é obrigatório.');
      return;
    }
    if (!newLaudo.overview) {
      toast.error('O relatório de vistoria é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const nextNumber = laudos.length > 0 
        ? Math.max(...laudos.map(l => Number(l.number) || 0)) + 1 
        : 1;

      const laudoData = {
        number: nextNumber,
        clientId: newLaudo.clientId,
        clientName: newLaudo.clientName || 'Cliente',
        visitId: newLaudo.visitId || '',
        date: newLaudo.date ? Timestamp.fromDate(new Date(newLaudo.date)) : Timestamp.now(),
        inspectorName: newLaudo.inspectorName,
        address: newLaudo.address || '',
        status: newLaudo.status || 'Rascunho',
        overview: newLaudo.overview,
        technicalAnalysis: newLaudo.technicalAnalysis || '',
        recommendations: newLaudo.recommendations || '',
        observations: newLaudo.observations || '',
        companyId,
        createdAt: Timestamp.now(),
        photos: newLaudo.photos || []
      };

      const docRef = await addDoc(collection(db, 'laudos'), laudoData);
      
      if (logAction) {
        await logAction('create', 'laudo', `Gerou o Laudo Técnico Nº ${formatRecordNumber(nextNumber)} para o cliente ${laudoData.clientName}`, docRef.id, laudoData.clientName);
      }

      setNewLaudo({
        status: 'Rascunho',
        inspectorName: '',
        overview: '',
        technicalAnalysis: '',
        recommendations: '',
        observations: '',
        address: '',
        clientId: '',
        clientName: '',
        visitId: '',
        photos: []
      });
      setIsAddOpen(false);
      toast.success('Laudo Técnico cadastrado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar o Laudo Técnico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLaudo = async () => {
    if (!editingLaudo) return;
    if (!editingLaudo.clientId) {
      toast.error('O cliente é obrigatório.');
      return;
    }
    if (!editingLaudo.inspectorName) {
      toast.error('O nome do inspetor é obrigatório.');
      return;
    }
    if (!editingLaudo.overview) {
      toast.error('O relatório de vistoria é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { id, ...data } = editingLaudo;
      const updatedData = {
        ...data,
        date: editingLaudo.date ? Timestamp.fromDate(new Date(editingLaudo.date)) : Timestamp.now(),
        photos: editingLaudo.photos || []
      };

      await updateDoc(doc(db, 'laudos', id), updatedData);

      if (logAction) {
        await logAction('update', 'laudo', `Atualizou o Laudo Técnico Nº ${formatRecordNumber(data.number)}`, id, data.clientName);
      }

      setEditingLaudo(null);
      setIsEditOpen(false);
      toast.success('Laudo Técnico atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar o Laudo Técnico.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLaudo = async () => {
    if (!laudoToDelete) return;
    try {
      await deleteDoc(doc(db, 'laudos', laudoToDelete.id));
      if (logAction) {
        await logAction('delete', 'laudo', `Excluiu o Laudo Técnico Nº ${formatRecordNumber(laudoToDelete.number)}`, laudoToDelete.id, laudoToDelete.clientName);
      }
      toast.success('Laudo Técnico excluído.');
      setLaudoToDelete(null);
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao excluir o laudo técnico.');
    }
  };

  const handlePrintLaudo = async (laudo: LaudoTecnico) => {
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Helper to load image
    const loadImage = (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            try {
              resolve(canvas.toDataURL('image/png'));
            } catch (e) {
              console.error("CORS Error loading image:", url);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const dateStr = format(safeParseDate(laudo.date), 'dd/MM/yyyy');
    const pageHeight = docPdf.internal.pageSize.getHeight();
    const pageWidth = docPdf.internal.pageSize.getWidth();
    const margin = 12; // Compact margins
    const contentWidth = pageWidth - (margin * 2);

    let currentY = 12;

    const drawLine = () => {
      docPdf.setDrawColor(200, 200, 200);
      docPdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 4;
    };

    const drawSectionTitle = (title: string) => {
      docPdf.setFillColor(240, 240, 240);
      docPdf.rect(margin, currentY, contentWidth, 6, 'F');
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(50, 50, 50);
      docPdf.text(title.toUpperCase(), margin + 2, currentY + 4.2);
      currentY += 8;
    };

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 10) {
        docPdf.addPage();
        currentY = 12;
        return true;
      }
      return false;
    };

    // Header Logo
    if (appSettings?.logoUrl) {
      try {
        const logoData = await loadImage(appSettings.logoUrl);
        if (logoData) {
          docPdf.addImage(logoData, 'PNG', margin, currentY, 16, 16);
        }
      } catch (e) {
        console.error("Erro ao adicionar logo ao PDF:", e);
      }
    }

    docPdf.setFontSize(13);
    docPdf.setFont('helvetica', 'bold');
    const laudoHeaderX = appSettings?.logoUrl ? margin + 20 : margin;
    docPdf.text(appSettings?.companyName || 'SEGURTEC-PRO', laudoHeaderX, currentY + 5);
    
    docPdf.setFontSize(10);
    docPdf.text(`LAUDO TÉCNICO DE INSPEÇÃO ${formatRecordNumber(laudo.number)}`, laudoHeaderX, currentY + 11);
    
    currentY += 18;
    drawLine();

    // 1. DADOS GERAIS
    drawSectionTitle('1. Dados Gerais');
    const boxWidth = (contentWidth / 2) - 3;
    const boxHeight = 22; // Compact box height
    const startY = currentY;
    
    // Draw Box for Client Data
    docPdf.setDrawColor(200, 200, 200);
    docPdf.rect(margin, currentY, boxWidth, boxHeight);
    
    docPdf.setFillColor(240, 240, 240);
    docPdf.rect(margin, currentY, boxWidth, 6, 'F');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(8.5);
    docPdf.text('DADOS DO CLIENTE', margin + 2, currentY + 4.2);

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(8);
    let clientY = currentY + 10;

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('CLIENTE:', margin + 2, clientY);
    docPdf.setFont('helvetica', 'normal');
    const clientNameSplitted = docPdf.splitTextToSize(laudo.clientName || 'Cliente Sem Nome', boxWidth - 18);
    docPdf.text(clientNameSplitted, margin + 15, clientY);
    clientY += (clientNameSplitted.length * 3.5);
    
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('ENDEREÇO:', margin + 2, clientY);
    docPdf.setFont('helvetica', 'normal');
    const addressLines = docPdf.splitTextToSize(laudo.address || 'N/A', boxWidth - 22);
    docPdf.text(addressLines, margin + 20, clientY);

    // Right Column: Inspection Data Box
    const rightColX = margin + boxWidth + 6;
    docPdf.rect(rightColX, startY, boxWidth, boxHeight);
    
    docPdf.setFillColor(240, 240, 240);
    docPdf.rect(rightColX, startY, boxWidth, 6, 'F');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(8.5);
    docPdf.text('DADOS DA INSPEÇÃO', rightColX + 2, startY + 4.2);

    let schedY = startY + 10;
    docPdf.setFontSize(8);
    
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('INSPETOR:', rightColX + 2, schedY);
    docPdf.setFont('helvetica', 'normal');
    const inspectorSplitted = docPdf.splitTextToSize(laudo.inspectorName || 'N/A', boxWidth - 22);
    docPdf.text(inspectorSplitted, rightColX + 20, schedY);
    
    schedY += 4.5;
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('DATA:', rightColX + 2, schedY);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(dateStr, rightColX + 24, schedY);

    schedY += 4.5;
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('LAUDO N°:', rightColX + 2, schedY);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(formatRecordNumber(laudo.number), rightColX + 24, schedY);

    currentY = startY + boxHeight + 4;
    
    docPdf.setDrawColor(200, 200, 200);
    docPdf.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;

    // Multi-line sections renderer
    const drawSection = (title: string, content: string) => {
      checkPageBreak(25);
      drawSectionTitle(title);
      
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(50, 50, 50);
      
      const splitLines = docPdf.splitTextToSize(content || 'Não informado.', contentWidth);
      splitLines.forEach((line: string) => {
        if (currentY > pageHeight - 15) {
          docPdf.addPage();
          currentY = 12;
        }
        docPdf.text(line, margin, currentY);
        currentY += 4;
      });
      currentY += 5;
    };

    drawSection('2. Constatações Gerais / Cenário Encontrado', laudo.overview);
    drawSection('3. Análise Técnica / Diagnóstico', laudo.technicalAnalysis);
    drawSection('4. Recomendações e Diretrizes de Solução', laudo.recommendations);
    
    if (laudo.observations) {
      drawSection('5. Informações Complementares', laudo.observations);
    }

    // Photographic record
    if (laudo.photos && laudo.photos.length > 0) {
      checkPageBreak(40);
      drawSectionTitle('MÓDULO FOTOGRÁFICO - REGISTRO DE INSPEÇÃO');
      
      let photoY = currentY;
      const colWidth = (contentWidth / 2) - 3;
      const photoHeight = 35; // height of image on PDF

      for (let index = 0; index < laudo.photos.length; index++) {
        const photo = laudo.photos[index];
        const isNewRow = index % 2 === 0;
        const xOffset = isNewRow ? margin : margin + colWidth + 6;
        
        if (isNewRow && (photoY + photoHeight + 10 > pageHeight - 15)) {
          docPdf.addPage();
          photoY = 12;
        }

        try {
          docPdf.addImage(photo, 'JPEG', xOffset, photoY, colWidth, photoHeight);
          docPdf.setDrawColor(200, 200, 200);
          docPdf.rect(xOffset, photoY, colWidth, photoHeight);
          
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(7.5);
          docPdf.setTextColor(100, 100, 100);
          docPdf.text(`Foto ${index + 1} - Registro da Visita`, xOffset + 2, photoY + photoHeight + 4);
        } catch (e) {
          console.error("Erro ao inserir foto no PDF:", e);
        }

        if (!isNewRow || index === laudo.photos.length - 1) {
          photoY += photoHeight + 8;
        }
      }
      currentY = photoY + 2;
    }

    // Signatures
    checkPageBreak(22);
    currentY += 4;
    
    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(8.5);
    const cityDate = appSettings?.city 
      ? `${appSettings.city}, ${dateStr}`
      : `Emissão em ${dateStr}`;
    docPdf.text(cityDate, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 12;
    
    docPdf.setLineWidth(0.25);
    docPdf.line(margin + 10, currentY, margin + 70, currentY);
    docPdf.line(pageWidth - margin - 70, currentY, pageWidth - margin - 10, currentY);
    
    docPdf.setFontSize(7.5);
    docPdf.text('Assinatura do Inspetor Responsável', margin + 40, currentY + 4, { align: 'center' });
    docPdf.text(laudo.inspectorName || 'N/A', margin + 40, currentY + 8, { align: 'center' });
    
    docPdf.text('Assinatura do Cliente / Representante', pageWidth - margin - 40, currentY + 4, { align: 'center' });
    docPdf.text(laudo.clientName || 'N/A', pageWidth - margin - 40, currentY + 8, { align: 'center' });

    // Save
    docPdf.save(`Laudo_Tecnico_${laudo.number}.pdf`);
    toast.success('PDF do Laudo gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 mb-6 border-b border-[#2d3139]/30 pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white uppercase tracking-widest text-[#3b82f6]">Laudos Técnicos</h2>
          <Badge className="bg-[#3b82f6]/20 text-[#3b82f6] border-[#3b82f6]/30 uppercase text-[10px]">Novo Módulo</Badge>
        </div>
        <p className="text-[#a0a0a0] text-sm">Elabore relatórios e vistorias detalhadas baseados em visitas técnicas com exportação em PDF estruturado.</p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" size={16} />
          <Input 
            className="pl-10 h-11 bg-[#1a1d23] border-[#2d3139] text-white focus:ring-[#3b82f6] transition-all rounded-xl shadow-inner shadow-black/20" 
            placeholder="Pesquisar laudos por cliente, número ou inspetor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 flex-1 md:flex-none">
          <div className="flex bg-[#1a1d23] p-1 rounded-lg border border-[#2d3139]">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                "h-9 px-3 rounded-md transition-all",
                viewMode === 'table' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
              )}
            >
              <List size={16} className="mr-2" />
              <span className="text-xs font-bold uppercase">Lista</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "h-9 px-3 rounded-md transition-all",
                viewMode === 'grid' ? "bg-[#3b82f6] text-white" : "text-[#71717a] hover:text-white"
              )}
            >
              <LayoutGrid size={16} className="mr-2" />
              <span className="text-xs font-bold uppercase">Grid</span>
            </Button>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white h-11 px-8 font-bold shadow-lg shadow-blue-500/10 whitespace-nowrap">
                <Plus size={18} />
                NOVO LAUDO TÉCNICO
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
              <DialogHeader className="p-6 pb-2 flex-shrink-0">
                <DialogTitle className="text-white flex items-center gap-2">
                  <Notebook className="text-[#3b82f6]" size={20} />
                  Elaborar Laudo Técnico de Inspeção
                </DialogTitle>
                <DialogDescription className="text-[#71717a]">Informe os dados da vistoria e observações verificadas no local para documentar o relatório oficial.</DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Selecione o Cliente</Label>
                    <Select value={newLaudo.clientId} onValueChange={(val) => handleClientChange(val)}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione um cliente...">
                          {newLaudo.clientId ? (clients.find(c => c.id === newLaudo.clientId)?.name || "Cliente Sem Nome") : "Selecione um cliente..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id} className="hover:bg-[#2d3139]">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Visita Técnica (Opcional)</Label>
                    <Select value={newLaudo.visitId} onValueChange={(val) => setNewLaudo({...newLaudo, visitId: val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione a visita..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="none">Nenhuma visita associada</SelectItem>
                        {getClientVisits(newLaudo.clientId).map(v => (
                          <SelectItem key={v.id} value={v.id} className="hover:bg-[#2d3139]">
                            {v.type} - {format(safeParseDate(v.date), 'dd/MM/yyyy')} 
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data da Inspeção</Label>
                    <Input 
                      type="date" 
                      value={newLaudo.date || ''} 
                      onChange={e => setNewLaudo({...newLaudo, date: e.target.value})} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Inspetor / Técnico Responsável</Label>
                    <Input 
                      value={newLaudo.inspectorName} 
                      onChange={e => setNewLaudo({...newLaudo, inspectorName: e.target.value})} 
                      placeholder="Ex: Alff Fonseca" 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Endereço da Vistoria</Label>
                  <Input 
                    value={newLaudo.address || ''} 
                    onChange={e => setNewLaudo({...newLaudo, address: e.target.value})} 
                    placeholder="Auto preenchido pelo cliente, ou edite aqui" 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <Building size={14} className="text-[#3b82f6]" />
                    2. Constatações Gerais / Cenário Encontrado (Obrigatório)
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    placeholder="Descreva minuciosamente em tópicos ou parágrafos tudo que foi verificado, as eventuais falhas nos equipamentos e a infraestrutura instalada..." 
                    value={newLaudo.overview} 
                    onChange={e => setNewLaudo({...newLaudo, overview: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <ShieldAlert size={14} className="text-[#3b82f6]" />
                    3. Análise Técnica / Diagnóstico
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    placeholder="Apresente as causas técnicas que levaram às falhas ou riscos constatados, as normas descumpridas ou as susceptibilidades físicas do ambiente..." 
                    value={newLaudo.technicalAnalysis} 
                    onChange={e => setNewLaudo({...newLaudo, technicalAnalysis: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    4. Recomendações e Diretrizes de Solução
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    placeholder="Escreva quais ações corretivas ou preventivas são imperativas, quais novos equipamentos ou remanejamentos são sugeridos..." 
                    value={newLaudo.recommendations} 
                    onChange={e => setNewLaudo({...newLaudo, recommendations: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Observações Extras</Label>
                  <Input 
                    value={newLaudo.observations || ''} 
                    onChange={e => setNewLaudo({...newLaudo, observations: e.target.value})} 
                    placeholder="Informações adicionais irrelevantes às seções acima." 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>

                <div className="space-y-2 border-t border-[#2d3139]/30 pt-4">
                  <PhotoUploader 
                    photos={newLaudo.photos || []} 
                    onChange={(photos) => setNewLaudo({...newLaudo, photos})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Status do Documento</Label>
                  <Select value={newLaudo.status} onValueChange={(val: 'Rascunho' | 'Finalizado') => setNewLaudo({...newLaudo, status: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Rascunho" className="hover:bg-[#2d3139]">Rascunho</SelectItem>
                      <SelectItem value="Finalizado" className="hover:bg-[#2d3139]">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
                <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
                <Button onClick={handleAddLaudo} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Gerar Laudo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showList ? (
        viewMode === 'table' ? (
          <div className="bg-[#1a1d23] border border-[#2d3139] rounded-xl overflow-y-auto max-h-[600px] custom-scrollbar scroll-left-container shadow-xl">
            <DoubleScrollContainer>
              <Table className="min-w-[1100px]">
              <TableHeader className="bg-[#16191f]/50 border-b border-[#2d3139]">
                <TableRow>
                  <TableHead className="text-white text-xs font-bold font-mono tracking-wider w-[120px]">LAUDO #</TableHead>
                  <TableHead className="text-white text-xs font-bold tracking-wider">CLIENTE</TableHead>
                  <TableHead className="text-white text-xs font-bold tracking-wider">INSPETOR</TableHead>
                  <TableHead className="text-white text-xs font-bold tracking-wider">DATA VISTORIA</TableHead>
                  <TableHead className="text-white text-xs font-bold tracking-wider">STATUS</TableHead>
                  <TableHead className="text-white text-xs font-bold tracking-wider text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#2d3139]/30">
                {filteredLaudos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 font-bold text-[#71717a]">
                      Nenhum laudo técnico encontrado de acordo com os filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLaudos.map((laudo) => (
                    <TableRow key={laudo.id} className="hover:bg-[#2d3139]/20 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-[#3b82f6]">
                        #{formatRecordNumber(laudo.number)}
                      </TableCell>
                      <TableCell className="text-white font-medium text-sm">
                        {laudo.clientName}
                      </TableCell>
                      <TableCell className="text-[#a0a0a0] text-sm">
                        {laudo.inspectorName}
                      </TableCell>
                      <TableCell className="text-[#a0a0a0] text-sm">
                        {format(safeParseDate(laudo.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          "text-[10px] uppercase font-bold",
                          laudo.status === 'Finalizado' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-yellow-500 border-yellow-500/20 bg-yellow-500/5"
                        )}>
                          {laudo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]"
                            title="Gerar PDF"
                            onClick={() => handlePrintLaudo(laudo)}
                          >
                            <Download size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-[#a0a0a0] hover:text-white hover:bg-[#2d3139]"
                            title="Editar"
                            onClick={() => {
                              setEditingLaudo({
                                ...laudo,
                                date: laudo.date ? format(safeParseDate(laudo.date), "yyyy-MM-dd") : '',
                                photos: laudo.photos || []
                              });
                              setIsEditOpen(true);
                            }}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/15"
                            title="Excluir"
                            onClick={() => {
                              setLaudoToDelete(laudo);
                              setIsDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </DoubleScrollContainer>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[700px] overflow-y-auto custom-scrollbar p-1">
            {filteredLaudos.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-[#1a1d23] border border-dashed border-[#2d3139] rounded-xl font-bold">
                Nenhum laudo encontrado.
              </div>
            ) : (
              filteredLaudos.map((laudo) => (
                <Card key={laudo.id} className="bg-[#1a1d23] border border-[#2d3139] overflow-hidden hover:border-[#3b82f6]/50 transition-all p-4 flex flex-col gap-3 relative group shadow-lg">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#3b82f6] font-bold">#{formatRecordNumber(laudo.number)}</span>
                      <span className="text-[9px] text-[#71717a] font-normal">{format(safeParseDate(laudo.date), 'dd/MM/yyyy')}</span>
                    </div>
                    <h3 className="font-bold text-white text-sm truncate pr-16" title={laudo.clientName}>{laudo.clientName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn(
                        "text-[9px] uppercase border-[#2d3139] px-1 h-4",
                        laudo.status === 'Finalizado' ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5" : "text-yellow-500 border-yellow-500/20 bg-yellow-500/5"
                      )}>
                        {laudo.status}
                      </Badge>
                      <span className="text-[10px] text-[#71717a]">Insp: {laudo.inspectorName}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#2d3139]/40 mt-1 flex flex-col gap-1.5 flex-grow">
                    <p className="text-[11px] text-[#71717a] italic line-clamp-2">
                      &quot;{laudo.overview}&quot;
                    </p>
                  </div>

                  <div className="mt-auto pt-3 border-t border-[#2d3139]/40 flex justify-between gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handlePrintLaudo(laudo)}
                      className="text-white bg-[#0f1115] hover:bg-[#2d3139] text-xs py-1 h-8 px-2 flex-grow flex items-center justify-center gap-1.5"
                    >
                      <Download size={12} />
                      Baixar PDF
                    </Button>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-[#a0a0a0] hover:text-white bg-[#0f1115]"
                        onClick={() => {
                          setEditingLaudo({
                            ...laudo,
                            date: laudo.date ? format(safeParseDate(laudo.date), "yyyy-MM-dd") : '',
                            photos: laudo.photos || []
                          });
                          setIsEditOpen(true);
                        }}
                      >
                        <Pencil size={11} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-[#ef4444] hover:bg-[#ef4444]/15 bg-[#0f1115]"
                        onClick={() => {
                          setLaudoToDelete(laudo);
                          setIsDeleteConfirmOpen(true);
                        }}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )
      ) : (
        <div className="p-8 text-center bg-[#1a1d23] border border-[#2d3139] rounded-xl font-bold">
           Acesso Restrito à listagem de laudos técnicos.
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white max-h-[85vh] overflow-hidden flex flex-col p-0 sm:max-w-[700px] shadow-2xl">
          <DialogHeader className="p-6 pb-2 flex-shrink-0">
            <DialogTitle className="text-white flex items-center gap-2">
              <Pencil className="text-[#3b82f6]" size={20} />
              Editar Laudo Técnico
            </DialogTitle>
            <DialogDescription className="text-[#71717a]">Ajuste os dados e constatações registradas para o Laudo Técnico Nº #{editingLaudo && formatRecordNumber(editingLaudo.number)}.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-2 custom-scrollbar">
            {editingLaudo && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Selecione o Cliente</Label>
                    <Select value={editingLaudo.clientId} onValueChange={(val) => handleClientChange(val, true)}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione um cliente...">
                          {editingLaudo.clientId ? (clients.find(c => c.id === editingLaudo.clientId)?.name || "Cliente Sem Nome") : "Selecione um cliente..."}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id} className="hover:bg-[#2d3139]">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Visita Técnica (Opcional)</Label>
                    <Select value={editingLaudo.visitId || 'none'} onValueChange={(val) => setEditingLaudo({...editingLaudo, visitId: val === 'none' ? '' : val})}>
                      <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                        <SelectValue placeholder="Selecione a visita..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                        <SelectItem value="none">Nenhuma visita associada</SelectItem>
                        {getClientVisits(editingLaudo.clientId).map(v => (
                          <SelectItem key={v.id} value={v.id} className="hover:bg-[#2d3139]">
                            {v.type} - {format(safeParseDate(v.date), 'dd/MM/yyyy')} 
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Data da Inspeção</Label>
                    <Input 
                      type="date" 
                      value={editingLaudo.date || ''} 
                      onChange={e => setEditingLaudo({...editingLaudo, date: e.target.value})} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[#a0a0a0]">Inspetor / Técnico Responsável</Label>
                    <Input 
                      value={editingLaudo.inspectorName} 
                      onChange={e => setEditingLaudo({...editingLaudo, inspectorName: e.target.value})} 
                      className="bg-[#0f1115] border-[#2d3139] text-white" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Endereço da Vistoria</Label>
                  <Input 
                    value={editingLaudo.address || ''} 
                    onChange={e => setEditingLaudo({...editingLaudo, address: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <Building size={14} className="text-[#3b82f6]" />
                    2. Constatações Gerais / Cenário Encontrado (Obrigatório)
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    value={editingLaudo.overview} 
                    onChange={e => setEditingLaudo({...editingLaudo, overview: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <ShieldAlert size={14} className="text-[#3b82f6]" />
                    3. Análise Técnica / Diagnóstico
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    value={editingLaudo.technicalAnalysis} 
                    onChange={e => setEditingLaudo({...editingLaudo, technicalAnalysis: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0] flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    4. Recomendações e Diretrizes de Solução
                  </Label>
                  <textarea 
                    className="min-h-[90px] bg-[#0f1115] border border-[#2d3139] text-white rounded-md p-3 w-full text-sm focus:ring-[#3b82f6] outline-none" 
                    value={editingLaudo.recommendations} 
                    onChange={e => setEditingLaudo({...editingLaudo, recommendations: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Observações Extras</Label>
                  <Input 
                    value={editingLaudo.observations || ''} 
                    onChange={e => setEditingLaudo({...editingLaudo, observations: e.target.value})} 
                    className="bg-[#0f1115] border-[#2d3139] text-white" 
                  />
                </div>

                <div className="space-y-2 border-t border-[#2d3139]/30 pt-4">
                  <PhotoUploader 
                    photos={editingLaudo.photos || []} 
                    onChange={(photos) => setEditingLaudo({...editingLaudo, photos})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[#a0a0a0]">Status do Documento</Label>
                  <Select value={editingLaudo.status} onValueChange={(val: 'Rascunho' | 'Finalizado') => setEditingLaudo({...editingLaudo, status: val})}>
                    <SelectTrigger className="bg-[#0f1115] border-[#2d3139] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d23] border-[#2d3139] text-white">
                      <SelectItem value="Rascunho" className="hover:bg-[#2d3139]">Rascunho</SelectItem>
                      <SelectItem value="Finalizado" className="hover:bg-[#2d3139]">Finalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-2 flex-shrink-0 m-0 border-t border-[#2d3139]/50 bg-[#1a1d23]">
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting} className="border-[#2d3139] text-[#a0a0a0] hover:bg-[#2d3139] hover:text-white">Cancelar</Button>
            <Button onClick={handleUpdateLaudo} disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb] text-white">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-[#1a1d23] border-[#2d3139] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={18} />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription className="text-[#a0a0a0]">O Laudo Técnico Nº #{laudoToDelete && formatRecordNumber(laudoToDelete.number)} será excluído permanentemente. Esta ação não poderá ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} className="border-[#2d3139] text-white hover:bg-[#2d3139]">Cancelar</Button>
            <Button onClick={handleDeleteLaudo} className="bg-red-600 hover:bg-red-700 text-white font-bold">Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
// FIM DA ROTINA: COMPONENTE GERENCIADOR DE LAUDOS TÉCNICOS (LaudosManager.tsx)

