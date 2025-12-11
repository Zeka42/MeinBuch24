
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Book as BookType, Chapter, Page, Comment, ActivityEntry } from '../types';
import { 
  ChevronDown, 
  ChevronUp,
  ChevronRight, 
  FileText, 
  Plus, 
  Sparkles, 
  Mic, 
  Send, 
  MessageSquare, 
  CheckCircle,
  Save,
  User,
  Pencil,
  Trash2,
  X,
  PlayCircle,
  GripVertical,
  Undo,
  Redo,
  ArrowUpRight,
  BookOpen,
  Activity,
  Eye,
  XCircle
} from './Icons';

interface BookEditorProps {
  book: BookType;
  initialPageId?: string;
  onSave: (updatedBook: BookType) => void;
  onBack: () => void;
  currentUserRole: 'customer' | 'employee';
}

interface PageHistory {
    past: string[];
    future: string[];
}

export const BookEditor: React.FC<BookEditorProps> = ({ book, initialPageId, onSave, onBack, currentUserRole }) => {
  const [localBook, setLocalBook] = useState<BookType>(book);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  
  // UI State
  const [activeTab, setActiveTab] = useState<'ai' | 'comments'>('ai');
  const [showPreview, setShowPreview] = useState(false);

  // Renaming State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [vectorContextEnabled, setVectorContextEnabled] = useState(true);
  const [isRecordingAi, setIsRecordingAi] = useState(false);
  
  // New AI Settings
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [aiFillPage, setAiFillPage] = useState(false);

  // Content & History State
  const [currentContent, setCurrentContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedTextContext, setSelectedTextContext] = useState('');
  
  // History: Map pageId to history object
  const [historyStore, setHistoryStore] = useState<Record<string, PageHistory>>({});
  const historyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Time Tracking State
  const timeTrackingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Comments State
  const [newCommentText, setNewCommentText] = useState('');
  const [isRecordingComment, setIsRecordingComment] = useState(false);
  const [commentAudioBlob, setCommentAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Drag & Drop State
  const [draggedItem, setDraggedItem] = useState<{ type: 'CHAPTER' | 'PAGE', id: string, index: number, parentId?: string } | null>(null);

  // --- Helper to find page ---
  const findPage = useCallback((pageId: string, bookToSearch = localBook): Page | null => {
    for (const chap of bookToSearch.chapters) {
      const page = chap.pages.find(p => p.id === pageId);
      if (page) return page;
    }
    return null;
  }, [localBook]);

  // --- Calculate Global Page Number ---
  const globalPageNumber = useMemo(() => {
    if (!activePageId) return 0;
    let count = 0;
    for (const chap of localBook.chapters) {
        for (const p of chap.pages) {
            count++;
            if (p.id === activePageId) return count;
        }
    }
    return 0;
  }, [localBook, activePageId]);

  // --- LIVE STATISTICS CALCULATION ---
  const stats = useMemo(() => {
    let totalWords = 0;
    let totalPagesCount = 0;
    const totalChapters = localBook.chapters.length;

    localBook.chapters.forEach(chap => {
      totalPagesCount += chap.pages.length;
      chap.pages.forEach(p => {
        // Use currentContent if this is the active page for immediate updates, otherwise stored content
        const content = (p.id === activePageId) ? currentContent : (p.content || '');
        if (content.trim()) {
          // Basic word count
          const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
          totalWords += words;
        }
      });
    });

    // Estimate A4 pages: ~300 words per page standard formatting
    const estimatedA4 = totalWords > 0 ? Math.ceil(totalWords / 300) : 0;
    // Format large numbers
    const formattedWords = new Intl.NumberFormat('de-DE').format(totalWords);

    return { totalChapters, totalPagesCount, formattedWords, estimatedA4 };
  }, [localBook, currentContent, activePageId]);


  // --- Initialization ---
  useEffect(() => {
    // Only set initial state if we haven't selected a page yet
    if (!activePageId) {
        setLocalBook(book); 
        
        if (initialPageId) {
            const chapter = book.chapters.find(c => c.pages.some(p => p.id === initialPageId));
            if (chapter) {
                setExpandedChapters(new Set([chapter.id]));
                setActivePageId(initialPageId);
                setActiveTab('comments');
            }
        } else if (book.chapters.length > 0) {
            if (book.chapters[0].pages.length > 0) {
                setExpandedChapters(new Set([book.chapters[0].id]));
                setActivePageId(book.chapters[0].pages[0].id);
            }
        }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, initialPageId]); 

  // --- Time Tracking ---
  useEffect(() => {
    // Increment timeSpentSeconds every minute (60000ms) or 30s
    // Using 30 seconds for smoother updates in UI if we were observing it live
    timeTrackingIntervalRef.current = setInterval(() => {
        setLocalBook(prevBook => {
            const updatedBook = {
                ...prevBook,
                timeSpentSeconds: (prevBook.timeSpentSeconds || 0) + 30
            };
            onSave(updatedBook); 
            return updatedBook;
        });
    }, 30000);

    return () => {
        if (timeTrackingIntervalRef.current) clearInterval(timeTrackingIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Content Loading on Page Switch ---
  useEffect(() => {
    if (activePageId) {
        const page = findPage(activePageId);
        if (page) {
            setCurrentContent(page.content);
            // Initialize history for this page if not exists
            if (!historyStore[activePageId]) {
                setHistoryStore(prev => ({
                    ...prev,
                    [activePageId]: { past: [], future: [] }
                }));
            }
        }
        
        // Reset inputs
        setNewCommentText('');
        setCommentAudioBlob(null);
        setSelectedTextContext('');
        setSaveStatus('saved');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  // --- Helper to Add Activity Log ---
  const logActivity = (bookToUpdate: BookType, action: string, details: string): BookType => {
      const newLog: ActivityEntry = {
          id: `log-${Date.now()}`,
          action,
          details,
          timestamp: new Date().toISOString(),
          userId: currentUserRole === 'employee' ? 'emp-1' : bookToUpdate.userId // Simple assumption
      };
      
      // Keep log size manageable (last 50 entries)
      const updatedLog = [newLog, ...(bookToUpdate.activityLog || [])].slice(0, 50);
      
      return {
          ...bookToUpdate,
          activityLog: updatedLog
      };
  };

  // --- INTELLIGENT VERSIONING ---
  const calculateVersion = (bookToCalc: BookType): string => {
      // Logic: v{Major}.{Minor}.{Patch}
      // Major: Every 5 chapters (Milestone)
      // Minor: Total Pages
      // Patch: Activity Count (Edits)
      
      const major = Math.floor(bookToCalc.chapters.length / 5) + 1;
      const minor = bookToCalc.chapters.reduce((acc, chap) => acc + chap.pages.length, 0);
      const patch = (bookToCalc.activityLog || []).length;
      
      return `v${major}.${minor}.${patch}`;
  };

  // --- AUTO SAVE & UPDATE LOGIC ---

  const updateBookState = (content: string, pageId: string) => {
    const updatedChapters = localBook.chapters.map(chap => ({
        ...chap,
        pages: chap.pages.map(p => 
            p.id === pageId ? { ...p, content: content } : p
        )
    }));
    // Use existing activity log length for version calculation base or just let it update on next activity
    return { ...localBook, chapters: updatedChapters, updatedAt: new Date().toISOString() };
  };

  // Safe Page Switch: Forces a save of the current content before switching
  const handlePageSwitch = (newPageId: string) => {
    if (activePageId && activePageId !== newPageId) {
        // 1. Update the local book state immediately with current buffer
        const updatedBook = updateBookState(currentContent, activePageId);
        setLocalBook(updatedBook);
        onSave(updatedBook); // Sync to parent
    }
    setActivePageId(newPageId);
  };

  // Textarea Change Handler (Auto-Save + History)
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setCurrentContent(newText);
    setSaveStatus('unsaved');

    if (!activePageId) return;

    // 1. Debounced Auto-Save
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    
    autoSaveTimeoutRef.current = setTimeout(() => {
        setSaveStatus('saving');
        let updatedBook = updateBookState(newText, activePageId);
        
        setLocalBook(updatedBook);
        onSave(updatedBook);
        
        setTimeout(() => setSaveStatus('saved'), 500); // Visual feedback delay
    }, 1000); // Auto-save after 1 second of inactivity

    // 2. Debounced History Snapshot
    if (historyTimeoutRef.current) clearTimeout(historyTimeoutRef.current);
    
    historyTimeoutRef.current = setTimeout(() => {
        setHistoryStore(prev => {
            const pageHistory = prev[activePageId] || { past: [], future: [] };
            const newPast = [...pageHistory.past, currentContent];
            
            // Limit to 10 steps
            if (newPast.length > 10) newPast.shift();

            return {
                ...prev,
                [activePageId]: {
                    past: newPast,
                    future: [] // Clear future on new input
                }
            };
        });
    }, 500); // Snapshot history after 500ms pause
  };

  // --- UNDO / REDO ---

  const handleUndo = () => {
    if (!activePageId) return;
    const pageHistory = historyStore[activePageId];
    if (!pageHistory || pageHistory.past.length === 0) return;

    const previous = pageHistory.past[pageHistory.past.length - 1];
    const newPast = pageHistory.past.slice(0, -1);

    setHistoryStore(prev => ({
        ...prev,
        [activePageId]: {
            past: newPast,
            future: [currentContent, ...pageHistory.future]
        }
    }));

    setCurrentContent(previous);
    
    // Trigger save for the undo
    const updatedBook = updateBookState(previous, activePageId);
    setLocalBook(updatedBook);
    onSave(updatedBook);
  };

  const handleRedo = () => {
    if (!activePageId) return;
    const pageHistory = historyStore[activePageId];
    if (!pageHistory || pageHistory.future.length === 0) return;

    const next = pageHistory.future[0];
    const newFuture = pageHistory.future.slice(1);

    setHistoryStore(prev => ({
        ...prev,
        [activePageId]: {
            past: [...pageHistory.past, currentContent],
            future: newFuture
        }
    }));

    setCurrentContent(next);

    // Trigger save for the redo
    const updatedBook = updateBookState(next, activePageId);
    setLocalBook(updatedBook);
    onSave(updatedBook);
  };

  const canUndo = activePageId ? (historyStore[activePageId]?.past.length > 0) : false;
  const canRedo = activePageId ? (historyStore[activePageId]?.future.length > 0) : false;


  // --- Helper Logic (Manual Save, Toggle, etc) ---

  const toggleChapter = (chapId: string) => {
    const newSet = new Set(expandedChapters);
    if (newSet.has(chapId)) newSet.delete(chapId);
    else newSet.add(chapId);
    setExpandedChapters(newSet);
  };

  // --- Renaming Logic ---

  const startRenaming = (e: React.MouseEvent, id: string, currentTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (currentUserRole !== 'customer') return;
    setEditingItemId(id);
    setRenameValue(currentTitle);
  };

  const saveRename = () => {
    if (!editingItemId) return;

    let updatedChapters = [...localBook.chapters];
    let itemName = '';
    
    // Check if it's a chapter
    const chapterIndex = updatedChapters.findIndex(c => c.id === editingItemId);
    if (chapterIndex !== -1) {
        updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], title: renameValue };
        itemName = `Kapitel ${updatedChapters[chapterIndex].number}`;
    } else {
        // Check if it's a page
        updatedChapters = updatedChapters.map(chap => ({
            ...chap,
            pages: chap.pages.map(p => {
                if (p.id === editingItemId) {
                    itemName = `Seite ${p.number}`;
                    return { ...p, title: renameValue };
                }
                return p;
            })
        }));
    }

    let updatedBook = { ...localBook, chapters: updatedChapters };
    updatedBook = logActivity(updatedBook, 'Umbenannt', `${itemName} zu "${renameValue}"`);
    
    setLocalBook(updatedBook);
    onSave(updatedBook);
    setEditingItemId(null);
    setRenameValue('');
  };

  const handleKeyDownRename = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveRename();
    if (e.key === 'Escape') setEditingItemId(null);
  };

  // --- Add Chapter/Page ---

  const handleAddChapter = () => {
    const newChapterNumber = localBook.chapters.length + 1;
    const newChapter: Chapter = {
        id: `chap-${Date.now()}`,
        bookId: localBook.id,
        number: newChapterNumber,
        title: 'Neues Kapitel',
        pages: []
    };
    let updatedBook = {
        ...localBook,
        chapters: [...localBook.chapters, newChapter]
    };
    
    updatedBook = logActivity(updatedBook, 'Kapitel erstellt', `Kapitel ${newChapterNumber}`);

    setLocalBook(updatedBook);
    onSave(updatedBook);
    
    // Expand the new chapter
    const newExpanded = new Set(expandedChapters);
    newExpanded.add(newChapter.id);
    setExpandedChapters(newExpanded);
  };

  const handleAddPage = (e: React.MouseEvent, chapterId: string) => {
    e.stopPropagation(); 
    
    setLocalBook(prevBook => {
        // 1. Snapshot current content before adding
        let updatedChapters = [...prevBook.chapters];
        if (activePageId) {
            updatedChapters = updatedChapters.map(chap => ({
                ...chap,
                pages: chap.pages.map(p => 
                    p.id === activePageId ? { ...p, content: currentContent } : p
                )
            }));
        }

        const chapterIndex = updatedChapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return prevBook;

        const chapter = updatedChapters[chapterIndex];
        const pageCount = chapter.pages.length;
        const newPageNumber = `${chapter.number}.${pageCount + 1}`;
        const uniqueId = `page-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const newPage: Page = {
            id: uniqueId,
            chapterId: chapter.id,
            number: newPageNumber,
            title: 'Neue Seite',
            content: '',
            comments: []
        };

        updatedChapters[chapterIndex] = {
            ...chapter,
            pages: [...chapter.pages, newPage]
        };
        
        // Log Logic
        const newLog: ActivityEntry = {
            id: `log-${Date.now()}`,
            action: 'Seite erstellt',
            details: `Seite ${newPageNumber} in ${chapter.title}`,
            timestamp: new Date().toISOString(),
            userId: currentUserRole === 'employee' ? 'emp-1' : prevBook.userId
        };

        const updatedBook = { 
            ...prevBook, 
            chapters: updatedChapters,
            activityLog: [newLog, ...(prevBook.activityLog || [])].slice(0, 50),
            updatedAt: new Date().toISOString()
        };

        // Side Effects in setTimeout to allow state to settle
        setTimeout(() => {
             // Expand chapter
            setExpandedChapters(prev => {
                const next = new Set(prev);
                next.add(chapterId);
                return next;
            });

            // Switch to new page
            setActivePageId(newPage.id);
            setCurrentContent(''); 
            setSaveStatus('saved');
            setHistoryStore(prevHist => ({ ...prevHist, [newPage.id]: { past: [], future: [] } }));
            
            // Sync to parent/DB
            onSave(updatedBook);
        }, 0);

        return updatedBook;
    });
  };

  // --- Drag & Drop Logic (Chapters Only) ---

  const handleDragStart = (e: React.DragEvent, type: 'CHAPTER' | 'PAGE', id: string, index: number, parentId?: string) => {
    e.stopPropagation();
    setDraggedItem({ type, id, index, parentId });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number, type: 'CHAPTER' | 'PAGE', parentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;
    
    if (draggedItem.type !== type) return;
    if (type === 'PAGE' && draggedItem.parentId !== parentId) return; // Prevent dragging pages between chapters for now

    if (draggedItem.index === index) return;
    
    // Only reorder state locally while dragging for visual feedback? 
    // Or do full reorder. Doing full reorder on dragover can be jittery.
    // Let's stick to the current implementation but ensure it's robust.

    if (type === 'CHAPTER') {
      const items = [...localBook.chapters];
      const [reorderedItem] = items.splice(draggedItem.index, 1);
      
      if (!reorderedItem) return;

      items.splice(index, 0, reorderedItem);

      // Re-number chapters immediately to keep UI consistent
      const reindexedItems = items.map((chap, idx) => ({
          ...chap,
          number: idx + 1,
          pages: chap.pages.map(p => ({ ...p, number: `${idx + 1}.${p.number.split('.')[1]}` })) 
      }));
      
      const updatedBook = { ...localBook, chapters: reindexedItems };
      setLocalBook(updatedBook);
      setDraggedItem({ ...draggedItem, index });
    } 
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem) {
        // Save final order
        let updatedBook = logActivity(localBook, 'Sortierung geändert', `${draggedItem.type === 'CHAPTER' ? 'Kapitel' : 'Seiten'} neu angeordnet`);
        setLocalBook(updatedBook);
        onSave(updatedBook); 
        setDraggedItem(null);
    }
  };

  // --- Page Move Logic (Arrows) ---
  const movePage = (e: React.MouseEvent, chapterId: string, pageIndex: number, direction: -1 | 1) => {
    e.stopPropagation();
    
    const chapIndex = localBook.chapters.findIndex(c => c.id === chapterId);
    if (chapIndex === -1) return;
    
    const chapter = localBook.chapters[chapIndex];
    const newPages = [...chapter.pages];
    
    // Check bounds
    if (direction === -1 && pageIndex === 0) return;
    if (direction === 1 && pageIndex === newPages.length - 1) return;
    
    // Swap
    const temp = newPages[pageIndex];
    newPages[pageIndex] = newPages[pageIndex + direction];
    newPages[pageIndex + direction] = temp;
    
    // Renumber
    const reindexedPages = newPages.map((p, idx) => ({
        ...p,
        number: `${chapter.number}.${idx + 1}`
    }));
    
    const updatedChapters = [...localBook.chapters];
    updatedChapters[chapIndex] = { ...chapter, pages: reindexedPages };
    
    let updatedBook = { ...localBook, chapters: updatedChapters };
    updatedBook = logActivity(updatedBook, 'Sortierung geändert', `Seite in ${chapter.title} verschoben`);
    
    setLocalBook(updatedBook);
    onSave(updatedBook);
  };


  // --- AI Logic ---

  const handleAiGenerate = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    
    setTimeout(() => {
        let generatedText = '';
        
        // Mock generation logic based on length and full page setting
        const shortText = "Der Nebel lag noch tief über der Stadt, als der Elefant seinen ersten Schritt auf den kühlen Asphalt setzte.";
        const mediumText = "Der Nebel lag noch tief über der Stadt, als der Elefant seinen ersten Schritt auf den kühlen Asphalt setzte. Es war kein gewöhnlicher Morgen; die Stille schien fast greifbar, nur unterbrochen vom leisen Klappern seiner schweren Schritte. Grau in grau verschmolz seine Silhouette mit den Häuserschluchten, ein Riese in einer Welt, die für ihn viel zu klein geworden war.";
        const longText = "Der Nebel lag noch tief über der Stadt, als der Elefant seinen ersten Schritt auf den kühlen Asphalt setzte. Es war kein gewöhnlicher Morgen; die Stille schien fast greifbar, nur unterbrochen vom leisen Klappern seiner schweren Schritte.\n\nGrau in grau verschmolz seine Silhouette mit den Häuserschluchten, ein Riese in einer Welt, die für ihn viel zu klein geworden war. Er bewegte sich mit einer Eleganz, die man einem Wesen seiner Größe kaum zugetraut hätte, fast so, als wollte er den Schlaf der Menschen nicht stören.\n\nNiemand sah ihn kommen, und niemand würde ihn gehen sehen, denn sein Ziel lag fernab der belebten Straßen, dort wo die Stadt endete und das Unbekannte begann.";
        
        const fullPageText = "Kapitel 1: Der Aufbruch\n\nEs war eine Zeit des Wandels. Die alten Strukturen brachen auf, und etwas Neues begann sich zu formen, langsam aber unaufhaltsam wie die Gezeiten. In mitten dieses Chaos stand er, der Elefant, ruhig und unerschütterlich. Seine Haut erzählte Geschichten von tausend Jahren, Falten wie Landkarten vergangener Ären.\n\nDer Morgen graute bereits, als er sich in Bewegung setzte. Die Stadt schlief noch, eingehüllt in einen Mantel aus Schweigen. Nur das ferne Rauschen des Flusses war zu hören, ein ständiger Begleiter auf seiner langen Reise. Er wusste nicht genau, wohin sein Weg ihn führen würde, aber er spürte, dass es richtig war, einfach loszugehen.\n\nSchritt für Schritt ließ er die vertraute Umgebung hinter sich. Die Gebäude wurden kleiner, die Straßen schmaler, bis schließlich nur noch der weite Horizont vor ihm lag. Ein Gefühl der Freiheit durchströmte ihn, gemischt mit einer Prise Melancholie über das, was er zurückließ.\n\nDie Sonne brach nun endgültig durch die Wolkendecke und tauchte die Welt in ein goldenes Licht. Es war der Beginn eines neuen Tages, eines neuen Kapitels in seinem Leben. Und während er so dahinschritt, wusste er tief in seinem Inneren, dass dies erst der Anfang war.";

        if (aiFillPage) {
            generatedText = fullPageText;
        } else {
            switch (aiLength) {
                case 'short': generatedText = shortText; break;
                case 'long': generatedText = longText; break;
                default: generatedText = mediumText;
            }
        }

        setAiResponse(generatedText);
        setIsAiLoading(false);
    }, 1500);
  };

  const handleVoiceInputAi = () => {
    startDictation(
        (transcript) => setAiPrompt(prev => prev + (prev ? ' ' : '') + transcript),
        isRecordingAi,
        setIsRecordingAi
    );
  };

  const insertAiText = () => {
    setCurrentContent(prev => prev + '\n\n' + aiResponse);
    setSaveStatus('unsaved'); // Trigger save on next debounce
    
    // Log AI usage
    const updatedBook = logActivity(localBook, 'AI genutzt', 'Text generiert und eingefügt');
    setLocalBook(updatedBook);
    
    setAiResponse('');
    setAiPrompt('');
  };

  // --- Generic Voice Dictation ---
  const startDictation = (onResult: (text: string) => void, isRecording: boolean, setRecordingState: (state: boolean) => void) => {
    if (isRecording) {
        setRecordingState(false);
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Spracherkennung wird von diesem Browser nicht unterstützt.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setRecordingState(true);
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setRecordingState(false);
    };
    recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
            console.error("Speech error", event.error);
        }
        setRecordingState(false);
    };
    recognition.onend = () => setRecordingState(false);
    recognition.start();
  };

  // --- Comment Logic ---

  const handleTextSelect = () => {
    if (textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        if (start !== end) {
            const selectedText = textareaRef.current.value.substring(start, end);
            setSelectedTextContext(selectedText);
        }
    }
  };

  const handleJumpToContext = (textContext: string) => {
    if (!textareaRef.current || !textContext) return;
    
    const text = textareaRef.current.value;
    const startIndex = text.indexOf(textContext);
    
    if (startIndex !== -1) {
        const endIndex = startIndex + textContext.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(startIndex, endIndex);
    } else {
        alert("Textstelle konnte nicht gefunden werden (möglicherweise wurde der Text bearbeitet).");
    }
  };

  const startAudioCommentRecording = async () => {
    if (isRecordingComment) {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
        }
        setIsRecordingComment(false);
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const audioChunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            setCommentAudioBlob(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecordingComment(true);
    } catch (err) {
        console.error("Error accessing microphone", err);
        alert("Mikrofonzugriff verweigert oder nicht verfügbar.");
    }
  };

  const handleAddComment = () => {
    if ((!newCommentText.trim() && !commentAudioBlob) || !activePageId) return;

    let audioUrl = undefined;
    if (commentAudioBlob) {
        audioUrl = URL.createObjectURL(commentAudioBlob);
    }

    const newComment: Comment = {
      id: `c-${Date.now()}`,
      pageId: activePageId,
      userId: currentUserRole === 'employee' ? 'emp-1' : 'user-1',
      userName: currentUserRole === 'employee' ? 'Max Lektor' : 'Sophie Autorin',
      text: newCommentText,
      audioUrl: audioUrl,
      selectedText: selectedTextContext || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updatedChapters = localBook.chapters.map(chap => ({
        ...chap,
        pages: chap.pages.map(p => 
            p.id === activePageId ? { ...p, comments: [...p.comments, newComment] } : p
        )
    }));

    const page = findPage(activePageId);
    let updatedBook = { ...localBook, chapters: updatedChapters, updatedAt: new Date().toISOString() };
    updatedBook = logActivity(updatedBook, 'Kommentar erstellt', `Seite ${page?.number}: "${newCommentText.substring(0, 20)}..."`);
    
    setLocalBook(updatedBook);
    onSave(updatedBook);
    
    setNewCommentText('');
    setCommentAudioBlob(null);
    setSelectedTextContext('');
  };

  const discardAudio = () => {
    setCommentAudioBlob(null);
  };

  // --- PREVIEW MODAL ---
  const BookPreviewModal = () => {
    // Flatten book structure for linear navigation in preview
    const previewPages = useMemo(() => {
        const pgs: { type: 'cover' | 'page', data?: Page, chapterTitle?: string }[] = [];
        pgs.push({ type: 'cover' });
        localBook.chapters.forEach(c => {
            c.pages.forEach(p => {
                pgs.push({ type: 'page', data: p, chapterTitle: c.title });
            });
        });
        return pgs;
    }, []);

    const [currentPageIdx, setCurrentPageIdx] = useState(0);

    const nextPage = () => {
        if (currentPageIdx < previewPages.length - 1) setCurrentPageIdx(prev => prev + 1);
    };

    const prevPage = () => {
        if (currentPageIdx > 0) setCurrentPageIdx(prev => prev - 1);
    };

    const jumpToEdit = (pageId: string) => {
        handlePageSwitch(pageId);
        setShowPreview(false);
    };

    const currentPageData = previewPages[currentPageIdx];
    const nextPageData = currentPageIdx + 1 < previewPages.length ? previewPages[currentPageIdx + 1] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
            <button 
                onClick={() => setShowPreview(false)} 
                className="absolute top-4 right-4 text-white hover:text-red-400 z-50"
            >
                <XCircle size={32} />
            </button>

            <div className="relative flex items-center">
                <button 
                    onClick={prevPage} 
                    disabled={currentPageIdx === 0}
                    className="absolute -left-16 text-white disabled:opacity-20 hover:scale-110 transition-transform"
                >
                    <ChevronDown size={48} className="rotate-90" />
                </button>

                {/* 3D BOOK CONTAINER */}
                <div className="flex w-[900px] h-[600px] bg-[#fdfbf7] rounded-r-lg shadow-2xl relative overflow-hidden perspective-1000">
                     {/* Left Page (Previous Page or Cover Back) */}
                     <div className="w-1/2 h-full border-r border-slate-300 bg-[#f8f5f0] p-8 shadow-inner relative flex flex-col">
                        {currentPageIdx > 0 && (
                             <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent to-black pointer-events-none"></div>
                        )}
                        {currentPageIdx === 0 ? (
                            // Inside Front Cover
                            <div className="flex-1 flex items-center justify-center bg-slate-100 opacity-50">
                            </div>
                        ) : (
                            // Left Page Content (Current)
                            <div className="flex-1 overflow-hidden font-serif">
                                {currentPageData.type === 'page' && currentPageData.data ? (
                                    <>
                                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 text-center">{currentPageData.chapterTitle}</div>
                                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center font-serif">{currentPageData.data.title}</h2>
                                        <div className="text-sm leading-loose text-slate-700 text-justify">
                                            {currentPageData.data.content || <span className="italic text-slate-400">Leere Seite...</span>}
                                        </div>
                                        <div className="mt-auto text-center text-xs text-slate-400 pt-4">- {currentPageIdx} -</div>
                                        
                                        <button 
                                            onClick={() => jumpToEdit(currentPageData.data!.id)}
                                            className="absolute bottom-4 left-4 bg-blue-600 text-white px-3 py-1 text-xs rounded opacity-0 hover:opacity-100 transition-opacity"
                                        >
                                            Seite bearbeiten
                                        </button>
                                    </>
                                ) : (
                                    // Should be cover if idx was 0, but we handle that above
                                    <div>Cover</div>
                                )}
                            </div>
                        )}
                     </div>

                     {/* Right Page (Next Page) */}
                     <div className="w-1/2 h-full bg-[#fffcf5] p-8 shadow-md relative flex flex-col">
                        <div className="absolute inset-0 opacity-5 bg-gradient-to-l from-transparent to-black pointer-events-none"></div>
                        
                        {currentPageIdx === 0 ? (
                            // Front Cover
                            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800 text-white p-10 relative overflow-hidden">
                                {localBook.coverUrl && (
                                    <img src={localBook.coverUrl} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="Cover" />
                                )}
                                <div className="relative z-10 text-center border-4 border-double border-white/30 p-8">
                                    <h1 className="text-4xl font-serif font-bold mb-4 tracking-wide">{localBook.title}</h1>
                                    <p className="text-lg font-light opacity-80">{localBook.authorName}</p>
                                </div>
                            </div>
                        ) : (
                            // Right Page Content (Next)
                             <div className="flex-1 overflow-hidden font-serif">
                                {nextPageData ? (
                                    <>
                                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-4 text-center">{nextPageData.chapterTitle}</div>
                                        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center font-serif">{nextPageData.data!.title}</h2>
                                        <div className="text-sm leading-loose text-slate-700 text-justify">
                                            {nextPageData.data!.content || <span className="italic text-slate-400">Leere Seite...</span>}
                                        </div>
                                        <div className="mt-auto text-center text-xs text-slate-400 pt-4">- {currentPageIdx + 1} -</div>

                                        <button 
                                            onClick={() => jumpToEdit(nextPageData.data!.id)}
                                            className="absolute bottom-4 right-4 bg-blue-600 text-white px-3 py-1 text-xs rounded opacity-0 hover:opacity-100 transition-opacity"
                                        >
                                            Seite bearbeiten
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-300 italic">Ende des Buches</div>
                                )}
                             </div>
                        )}
                     </div>
                     
                     {/* Spine Center */}
                     <div className="absolute left-1/2 top-0 bottom-0 w-8 -ml-4 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 opacity-20 pointer-events-none"></div>
                </div>

                <button 
                    onClick={nextPage} 
                    disabled={currentPageIdx >= previewPages.length - 1}
                    className="absolute -right-16 text-white disabled:opacity-20 hover:scale-110 transition-transform"
                >
                    <ChevronDown size={48} className="-rotate-90" />
                </button>
            </div>
            <div className="absolute bottom-10 text-slate-400 text-sm">
                Blättern mit Pfeilen • 'Bearbeiten' erscheint beim Hover über Seite
            </div>
        </div>
    );
  };


  const activePage = activePageId ? findPage(activePageId) : null;
  const currentVersion = calculateVersion(localBook);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm font-medium">← Zurück</button>
                <div className="flex flex-col items-end">
                    <div className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded uppercase tracking-wider mb-1">{localBook.status}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{currentVersion}</div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-700">Inhaltsverzeichnis</h3>
                    <div className="flex space-x-1">
                        <button 
                            onClick={() => setShowPreview(true)}
                            className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors"
                            title="Buchvorschau (Lesemodus)"
                        >
                            <Eye size={18} />
                        </button>
                        {currentUserRole === 'customer' && (
                            <button 
                                onClick={handleAddChapter}
                                className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                title="Neues Kapitel"
                            >
                                <Plus size={18} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    {localBook.chapters.map((chapter, index) => (
                        <div 
                            key={chapter.id}
                            draggable={currentUserRole === 'customer'}
                            onDragStart={(e) => handleDragStart(e, 'CHAPTER', chapter.id, index)}
                            onDragOver={(e) => handleDragOver(e, index, 'CHAPTER')}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                            className={`rounded ${draggedItem?.id === chapter.id ? 'opacity-50 border-2 border-dashed border-blue-300' : ''}`}
                        >
                            <div 
                                className="flex items-center p-2 hover:bg-slate-50 rounded cursor-pointer group relative"
                                onClick={() => toggleChapter(chapter.id)}
                            >
                                {currentUserRole === 'customer' && (
                                    <div className="mr-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                        <GripVertical size={12} />
                                    </div>
                                )}

                                {expandedChapters.has(chapter.id) ? <ChevronDown size={14} className="text-slate-400 mr-1" /> : <ChevronRight size={14} className="text-slate-400 mr-1" />}
                                
                                {editingItemId === chapter.id ? (
                                    <input 
                                        type="text"
                                        value={renameValue}
                                        onChange={(e) => setRenameValue(e.target.value)}
                                        onBlur={saveRename}
                                        onKeyDown={handleKeyDownRename}
                                        className="flex-1 text-sm border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-slate-700 flex-1 truncate select-none">
                                        Kapitel {chapter.number}: {chapter.title}
                                    </span>
                                )}

                                {currentUserRole === 'customer' && editingItemId !== chapter.id && (
                                    <div className="flex space-x-1 ml-1"> 
                                        <button 
                                            onClick={(e) => startRenaming(e, chapter.id, chapter.title)}
                                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded p-0.5"
                                            title="Kapitel umbenennen"
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleAddPage(e, chapter.id)}
                                            className="text-blue-500 hover:bg-blue-50 rounded p-0.5"
                                            title="Neue Seite hinzufügen"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                            
                            {expandedChapters.has(chapter.id) && (
                                <div className="ml-6 space-y-1 border-l-2 border-slate-100 pl-2">
                                    {chapter.pages.map((page, pageIndex) => (
                                        <div 
                                            key={page.id}
                                            onClick={() => handlePageSwitch(page.id)}
                                            onDoubleClick={(e) => startRenaming(e, page.id, page.title)}
                                            className={`text-sm px-2 py-1.5 rounded cursor-pointer flex items-center justify-between group 
                                                ${activePageId === page.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}
                                            `}
                                        >
                                            <div className="flex items-center overflow-hidden w-full">
                                                {currentUserRole === 'customer' && (
                                                    <div className="flex flex-col mr-2 -ml-1">
                                                        <button 
                                                            onClick={(e) => movePage(e, chapter.id, pageIndex, -1)} 
                                                            disabled={pageIndex === 0}
                                                            className="text-slate-300 hover:text-blue-600 disabled:opacity-0 p-0.5"
                                                            title="Seite nach oben verschieben"
                                                        >
                                                            <ChevronUp size={10} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => movePage(e, chapter.id, pageIndex, 1)} 
                                                            disabled={pageIndex === chapter.pages.length - 1}
                                                            className="text-slate-300 hover:text-blue-600 disabled:opacity-0 p-0.5"
                                                            title="Seite nach unten verschieben"
                                                        >
                                                            <ChevronDown size={10} />
                                                        </button>
                                                    </div>
                                                )}
                                                <FileText size={12} className="mr-2 flex-shrink-0" />
                                                <div className="flex items-center w-full">
                                                    <span className="text-slate-400 font-normal mr-1.5 text-xs select-none">{page.number}</span>
                                                    
                                                    {editingItemId === page.id ? (
                                                        <input 
                                                            type="text"
                                                            value={renameValue}
                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                            onBlur={saveRename}
                                                            onKeyDown={handleKeyDownRename}
                                                            className="flex-1 min-w-0 text-sm border border-blue-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span className="truncate select-none" title="Doppelklick zum Umbenennen">{page.title}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {page.comments.some(c => c.status === 'pending') && (
                                                <div className="w-2 h-2 bg-red-500 rounded-full ml-2 flex-shrink-0"></div>
                                            )}
                                        </div>
                                    ))}
                                    {/* Full Width Button to Add Page */}
                                    {currentUserRole === 'customer' && (
                                        <button 
                                            onClick={(e) => handleAddPage(e, chapter.id)}
                                            className="w-full text-xs text-left text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-2 rounded mt-1 flex items-center transition-colors"
                                        >
                                            <Plus size={12} className="mr-1" /> Seite hinzufügen
                                        </button>
                                    )}
                                    {chapter.pages.length === 0 && currentUserRole !== 'customer' && (
                                        <div className="text-xs text-slate-400 px-2 italic">Keine Seiten</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full relative">
            {/* Toolbar - Redesigned to include Stats */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
                <div className="flex items-center space-x-6">
                    <div>
                        <span className="text-slate-400 text-xs uppercase tracking-wide font-medium block mb-0.5">
                            {activePage ? `Kapitel ${findPage(activePageId!)?.number.split('.')[0]}` : 'Editor'}
                        </span>
                        <h2 className="font-bold text-slate-800 text-lg leading-tight truncate max-w-[200px] xl:max-w-[400px]">
                            {activePage?.title || 'Keine Auswahl'}
                        </h2>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    {/* Live Statistics Card */}
                    <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-4 py-1.5 space-x-5">
                        <div className="flex flex-col items-start" title="Gesamtwörter">
                             <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                 <Activity size={10} className="mr-1" /> Wörter
                             </div>
                             <span className="text-sm font-semibold text-slate-700">{stats.formattedWords}</span>
                        </div>
                        
                        <div className="w-px h-6 bg-slate-200"></div>

                        <div className="flex flex-col items-start" title="Gesamtanzahl Seiten">
                             <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                 <FileText size={10} className="mr-1" /> Seiten
                             </div>
                             <span className="text-sm font-semibold text-slate-700">{stats.totalPagesCount}</span>
                        </div>

                        <div className="w-px h-6 bg-slate-200"></div>

                        <div className="flex flex-col items-start" title="Kapitel">
                             <div className="flex items-center text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                 <BookOpen size={10} className="mr-1" /> Kapitel
                             </div>
                             <span className="text-sm font-semibold text-slate-700">{stats.totalChapters}</span>
                        </div>
                    </div>
                </div>

                <div className="flex space-x-3 items-center">
                    
                    {/* Status Indicator */}
                    <div className="mr-4 text-xs font-medium hidden sm:block">
                        {saveStatus === 'saving' && <span className="text-slate-400 flex items-center"><span className="animate-spin mr-1">⟳</span> Speichert...</span>}
                        {saveStatus === 'saved' && <span className="text-green-600 flex items-center"><CheckCircle size={12} className="mr-1"/> Gespeichert</span>}
                        {saveStatus === 'unsaved' && <span className="text-amber-500">Ungespeichert</span>}
                    </div>

                    {/* Undo / Redo */}
                    <div className="flex bg-slate-100 rounded-md p-0.5">
                        <button 
                            onClick={handleUndo} 
                            disabled={!canUndo}
                            className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all"
                            title="Rückgängig"
                        >
                            <Undo size={16} />
                        </button>
                        <div className="w-px bg-slate-300 my-1 mx-0.5"></div>
                        <button 
                            onClick={handleRedo} 
                            disabled={!canRedo}
                            className="p-1.5 rounded hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent text-slate-600 transition-all"
                            title="Wiederholen"
                        >
                            <Redo size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex justify-center">
                {activePage ? (
                    <div className="w-full max-w-3xl bg-white shadow-sm border border-slate-200 min-h-[800px] flex flex-col relative">
                        <textarea
                            ref={textareaRef}
                            className="flex-1 w-full resize-none outline-none text-lg leading-relaxed text-slate-800 font-serif placeholder:text-slate-300 selection:bg-yellow-200 selection:text-slate-900 p-12 mb-8"
                            placeholder="Beginne hier zu schreiben..."
                            value={currentContent}
                            onChange={handleContentChange}
                            onSelect={handleTextSelect}
                            onMouseUp={handleTextSelect}
                        />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
                            <span className="text-slate-400 text-sm font-serif">- {globalPageNumber} -</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                        <FileText size={48} className="mb-4 opacity-20" />
                        <p>Wähle eine Seite links aus, um zu bearbeiten.</p>
                        {currentUserRole === 'customer' && localBook.chapters.length > 0 && (
                             <p className="text-sm mt-2">Doppelklicke auf eine Seite in der Liste, um sie umzubenennen.</p>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Tools Sidebar (AI & Comments) */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col h-full">
            <div className="flex border-b border-slate-200">
                <div 
                  className={`flex-1 p-3 text-center border-b-2 font-medium text-sm cursor-pointer transition-colors ${activeTab === 'ai' ? 'border-purple-500 text-purple-700 bg-purple-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('ai')}
                >
                    <Sparkles size={14} className="inline mr-1" /> AI Assistent
                </div>
                <div 
                  className={`flex-1 p-3 text-center border-b-2 font-medium text-sm cursor-pointer transition-colors ${activeTab === 'comments' ? 'border-blue-500 text-blue-700 bg-blue-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                  onClick={() => setActiveTab('comments')}
                >
                    <MessageSquare size={14} className="inline mr-1" /> Kommentare
                </div>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                
                {/* AI Panel */}
                {activeTab === 'ai' && (
                  <>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-purple-800 uppercase tracking-wide">AI Prompt</label>
                            <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${vectorContextEnabled ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                <span className="text-[10px] text-slate-500">Vector Context</span>
                            </div>
                        </div>
                        <textarea 
                            className="w-full text-sm p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-300 focus:outline-none mb-3"
                            rows={3}
                            placeholder="Was soll ich für dich schreiben?"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                        ></textarea>

                        {/* Length Settings */}
                        <div className="flex space-x-2 mb-3">
                            <select 
                                value={aiLength}
                                onChange={(e) => setAiLength(e.target.value as any)}
                                className="w-full text-xs p-1.5 border border-purple-200 rounded text-slate-600 bg-white focus:outline-none"
                            >
                                <option value="short">Wenig Text</option>
                                <option value="medium">Mitteltext</option>
                                <option value="long">Viel Text</option>
                            </select>
                        </div>

                        {/* Full Page Checkbox */}
                        <label className="flex items-start space-x-2 mb-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={aiFillPage}
                                onChange={(e) => setAiFillPage(e.target.checked)}
                                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500" 
                            />
                            <span className="text-xs text-slate-600 leading-tight">Schreibe mir Text für die ganze Seite</span>
                        </label>
                        
                        <div className="flex space-x-2">
                            <button 
                                className="flex-1 bg-purple-600 text-white text-xs font-bold py-2 rounded hover:bg-purple-700 transition-colors flex items-center justify-center"
                                onClick={handleAiGenerate}
                                disabled={isAiLoading}
                            >
                                {isAiLoading ? 'Denke nach...' : <><Sparkles size={12} className="mr-1" /> Generieren</>}
                            </button>
                            <button 
                                className={`border border-purple-200 text-purple-600 p-2 rounded hover:bg-purple-50 transition-all ${isRecordingAi ? 'bg-red-50 text-red-600 border-red-200 ring-2 ring-red-100' : 'bg-white'}`}
                                onClick={handleVoiceInputAi}
                                title="Spracheingabe"
                            >
                                <Mic size={16} className={isRecordingAi ? 'animate-pulse' : ''} />
                            </button>
                        </div>
                        {isRecordingAi && (
                            <div className="text-xs text-red-500 mt-2 text-center animate-pulse font-medium">
                                Höre zu...
                            </div>
                        )}
                    </div>

                    {aiResponse && (
                        <div className="flex-1 flex flex-col">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Vorschlag</h4>
                            <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm text-slate-700 leading-relaxed flex-1 overflow-y-auto mb-3 whitespace-pre-wrap">
                                {aiResponse}
                            </div>
                            <button 
                                onClick={insertAiText}
                                className="w-full border border-slate-300 text-slate-600 text-xs font-bold py-2 rounded hover:bg-slate-100 flex items-center justify-center"
                            >
                                <Plus size={12} className="mr-1" /> Einfügen
                            </button>
                        </div>
                    )}
                    
                    {!aiResponse && (
                        <div className="text-center mt-10">
                            <div className="inline-block p-3 bg-purple-50 rounded-full mb-3">
                                <Sparkles className="text-purple-300" size={24} />
                            </div>
                            <p className="text-xs text-slate-400 px-6">
                                Nutze den AI Assistenten um Text zu generieren, Ideen zu finden oder deinen Stil zu verbessern.
                            </p>
                        </div>
                    )}
                  </>
                )}

                {/* Comments Panel */}
                {activeTab === 'comments' && (
                  <>
                    {!activePage ? (
                        <div className="text-center mt-10 text-slate-400">
                          <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Wähle eine Seite aus, um Kommentare zu sehen.</p>
                        </div>
                    ) : (
                      <div className="flex flex-col h-full">
                         <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                            {activePage.comments.length === 0 ? (
                                <div className="text-center mt-10 text-slate-400">
                                    <p className="text-sm">Keine Kommentare auf dieser Seite.</p>
                                </div>
                            ) : (
                                activePage.comments.map(comment => (
                                    <div key={comment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-xs text-slate-800">{comment.userName}</span>
                                            <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        
                                        {/* Highlighted Text Context - Updated Styling */}
                                        {comment.selectedText && (
                                            <div className="mb-2 p-2 bg-yellow-50 border-2 border-dashed border-blue-400 rounded text-xs italic text-slate-700 relative group">
                                                <div className="pr-5">"{comment.selectedText}"</div>
                                                <button 
                                                    onClick={() => handleJumpToContext(comment.selectedText!)}
                                                    className="absolute top-1 right-1 p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                                                    title="Zur Textstelle springen"
                                                >
                                                    <ArrowUpRight size={12} />
                                                </button>
                                            </div>
                                        )}

                                        {/* Text Content */}
                                        {comment.text && <p className="text-sm text-slate-600 mb-2">{comment.text}</p>}

                                        {/* Audio Content */}
                                        {comment.audioUrl && (
                                            <div className="mt-1">
                                                <audio controls src={comment.audioUrl} className="w-full h-8" />
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                         </div>
                         
                         <div className="mt-auto bg-slate-50 p-2 rounded-lg border border-slate-200">
                             {/* Context Indicator */}
                             {selectedTextContext && (
                                 <div className="flex items-center justify-between text-xs bg-yellow-100 text-yellow-800 p-1.5 rounded mb-2 border border-yellow-200">
                                     <span className="truncate flex-1 italic">"{selectedTextContext}"</span>
                                     <button onClick={() => setSelectedTextContext('')} className="ml-2 hover:text-red-500"><X size={12} /></button>
                                 </div>
                             )}

                            <textarea
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-300 focus:outline-none mb-2 bg-white"
                                placeholder="Kommentar schreiben..."
                                rows={2}
                            />
                            
                            {/* Audio Preview */}
                            {commentAudioBlob && (
                                <div className="flex items-center justify-between bg-white border border-slate-200 rounded p-2 mb-2">
                                    <div className="flex items-center text-xs text-slate-600">
                                        <Mic size={12} className="mr-1 text-red-500" /> Audioaufnahme bereit
                                    </div>
                                    <button onClick={discardAudio} className="text-slate-400 hover:text-red-500">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex space-x-2">
                                <button
                                    onClick={startAudioCommentRecording}
                                    className={`p-2 rounded border transition-colors ${isRecordingComment ? 'bg-red-500 text-white border-red-600 animate-pulse' : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-50'}`}
                                    title={isRecordingComment ? "Aufnahme stoppen" : "Audio aufnehmen"}
                                >
                                    <Mic size={16} />
                                </button>
                                <button
                                    onClick={handleAddComment}
                                    disabled={(!newCommentText.trim() && !commentAudioBlob)}
                                    className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    <Send size={12} className="mr-1" /> Senden
                                </button>
                            </div>
                         </div>
                      </div>
                    )}
                  </>
                )}
            </div>
            
            {activeTab === 'ai' && (
                <div className="p-3 border-t border-slate-200 bg-slate-50">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={vectorContextEnabled}
                            onChange={(e) => setVectorContextEnabled(e.target.checked)}
                            className="rounded text-purple-600 focus:ring-purple-500" 
                        />
                        <span className="text-xs text-slate-600">Nutze persönliches Wissen (Vector Store)</span>
                    </label>
                </div>
            )}
        </div>
        
        {/* Render Preview Modal */}
        {showPreview && <BookPreviewModal />}
    </div>
  );
};
