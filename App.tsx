import React, { useState, useEffect } from 'react';
import { User, Book as BookType } from './types';
import { MOCK_USERS, MOCK_BOOKS } from './constants';
import { BookEditor } from './components/BookEditor';
import { LandingPage } from './components/LandingPage';
import { auth, storage, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  deleteUser
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { 
  BookOpen, 
  Users as UsersIcon, 
  LayoutDashboard, 
  LogOut, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle,
  Settings,
  MessageSquare,
  ChevronRight,
  Upload,
  Image,
  Activity,
  ListTodo,
  XCircle,
  User as UserIcon,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX
} from './components/Icons';

type View = 'landing' | 'login' | 'customer-dash' | 'employee-dash' | 'editor' | 'settings' | 'authors';

// --- Helper: Clean Data for Firestore (Remove undefined) ---
const cleanDataForFirestore = (data: any): any => {
    if (data === null || data === undefined) return null;
    if (Array.isArray(data)) {
        return data.map(item => cleanDataForFirestore(item));
    }
    if (typeof data === 'object') {
        const cleaned: any = {};
        for (const key in data) {
            const value = data[key];
            if (value !== undefined) {
                cleaned[key] = cleanDataForFirestore(value);
            } else {
                cleaned[key] = null; // Convert undefined to null for Firestore
            }
        }
        return cleaned;
    }
    return data;
};

// --- Helper: Sanitize Username for File Paths ---
const getSafeUserName = (name: string) => {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
};

const formatTime = (seconds?: number) => {
    if (!seconds) return "0 Std 0 Min";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} Std ${minutes} Min`;
};

const getPendingTasks = (books: BookType[]) => {
    const tasks: { 
      bookId: string; 
      bookTitle: string; 
      chapterTitle: string; 
      pageId: string; 
      pageTitle: string; 
      commentUser: string; 
      commentDate: string; 
      commentText: string; 
    }[] = [];

    books.forEach(book => {
      book.chapters.forEach(chap => {
        chap.pages.forEach(page => {
          page.comments.forEach(comment => {
            if (comment.status === 'pending') {
              tasks.push({
                bookId: book.id,
                bookTitle: book.title,
                chapterTitle: chap.title,
                pageId: page.id,
                pageTitle: page.title,
                commentUser: comment.userName,
                commentDate: comment.createdAt,
                commentText: comment.text
              });
            }
          });
        });
      });
    });

    return tasks;
};

// --- Sub-Components ---

const TaskModal = ({ show, onClose, allTasks, openBook }: { show: boolean, onClose: () => void, allTasks: any[], openBook: (bid: string, pid?: string) => void }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center">
                            <ListTodo className="mr-2 text-blue-600" /> 
                            Aufgabenliste ({allTasks.length})
                        </h3>
                        <p className="text-sm text-slate-500">Alle ausstehenden Kommentare der Autoren</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <XCircle size={24} />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 space-y-4">
                    {allTasks.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <CheckCircle size={48} className="mx-auto mb-3 text-green-200" />
                            <p>Alles erledigt! Keine offenen Aufgaben.</p>
                        </div>
                    ) : (
                        allTasks.map((task: any, idx: number) => (
                            <div 
                              key={idx} 
                              onClick={() => openBook(task.bookId, task.pageId)}
                              className="bg-white border border-slate-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group shadow-sm"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-white bg-blue-500 px-2 py-0.5 rounded">{task.bookTitle}</span>
                                    <span className="text-xs text-slate-400">{new Date(task.commentDate).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm mb-1">{task.chapterTitle} &rsaquo; {task.pageTitle}</h4>
                                <div className="flex items-start bg-slate-50 p-3 rounded text-sm text-slate-600 italic border border-slate-100 group-hover:bg-white">
                                    <MessageSquare size={14} className="mr-2 mt-1 text-slate-400" />
                                    "{task.commentText}"
                                </div>
                                <div className="mt-2 text-right text-xs font-semibold text-blue-600 flex justify-end items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    Bearbeiten <ChevronRight size={14} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl text-right">
                    <button 
                      onClick={onClose}
                      className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium transition-colors"
                    >
                        Schließen
                    </button>
                </div>
            </div>
        </div>
    );
};

const DashboardLayout: React.FC<{ children: React.ReactNode, currentUser: User | null, currentView: View, setCurrentView: (v: View) => void, handleLogout: () => void }> = ({ children, currentUser, currentView, setCurrentView, handleLogout }) => (
  <div className="min-h-screen bg-slate-50 flex">
    {/* Sidebar */}
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full z-10">
      <div className="p-6">
        <h2 className="text-xl font-bold text-white tracking-tight">meinbuch24.de</h2>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <button 
          onClick={() => setCurrentView(currentUser?.role === 'customer' ? 'customer-dash' : 'employee-dash')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${['customer-dash', 'employee-dash'].includes(currentView) ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </button>
        {currentUser?.role === 'employee' && (
           <button 
             onClick={() => setCurrentView('authors')}
             className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'authors' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
           >
           <UsersIcon size={20} />
           <span>Autoren</span>
         </button>
        )}
        <button 
          onClick={() => setCurrentView('settings')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'settings' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}
        >
          <Settings size={20} />
          <span>Einstellungen</span>
        </button>
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-3 mb-4">
          {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full bg-slate-700 object-cover" />
          ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white">
                  <UserIcon size={14} />
              </div>
          )}
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-500 capitalize truncate">{currentUser?.role === 'customer' ? 'Autor' : 'Mitarbeiter'}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="w-full flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
          <LogOut size={16} />
          <span>Abmelden</span>
        </button>
      </div>
    </aside>

    {/* Main Content */}
    <main className="flex-1 p-8 ml-64 overflow-y-auto min-h-screen">
      {children}
    </main>
  </div>
);

const SettingsView = ({ currentUser, setCurrentUser, currentView, setCurrentView, handleLogout }: any) => {
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (currentUser) setEditName(currentUser.name);
    }, [currentUser]);

    const handleUpdateProfile = async () => {
        if (!auth.currentUser || !currentUser) return;
        try {
            await updateProfile(auth.currentUser, { displayName: editName });
            const userRef = doc(db, "users", currentUser.id);
            await updateDoc(userRef, { name: editName });
            setCurrentUser((prev: User | null) => prev ? ({ ...prev, name: editName }) : null);
            alert("Profil aktualisiert!");
        } catch (err) {
            console.error("Update failed", err);
            alert("Fehler beim Aktualisieren.");
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Bist du sicher? Dein Account und alle Daten werden unwiderruflich gelöscht.")) return;
        setIsDeleting(true);
        try {
            const user = auth.currentUser;
            if (user) {
                try {
                   await deleteDoc(doc(db, "users", user.uid));
                } catch (e) { console.warn("DB delete fail", e); }
                await deleteUser(user);
            }
        } catch (err: any) {
            console.error("Delete error", err);
            if (err.code === 'auth/requires-recent-login') {
                alert("Bitte melde dich erneut an, um dein Konto zu löschen.");
            } else {
                alert("Fehler beim Löschen des Kontos.");
            }
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <DashboardLayout currentUser={currentUser} currentView={currentView} setCurrentView={setCurrentView} handleLogout={handleLogout}>
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Einstellungen</h1>
            <p className="text-slate-500 mb-8">Verwalte dein Profil und deine Präferenzen.</p>
            
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-slate-800">Profil Informationen</h2>
                <p className="text-sm text-slate-500">Diese Informationen sind für andere Nutzer sichtbar.</p>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail Adresse</label>
                    <input 
                      type="email" 
                      defaultValue={currentUser?.email} 
                      disabled
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                    />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Profilbild</label>
                     <div className="flex items-center space-x-4">
                         {currentUser?.avatarUrl ? (
                             <img src={currentUser.avatarUrl} alt="Profilbild" className="w-12 h-12 rounded-full object-cover" />
                         ) : (
                             <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                                 <UserIcon size={20} />
                             </div>
                         )}
                         <label className="cursor-pointer bg-white border border-slate-300 text-slate-600 px-3 py-1.5 rounded text-sm hover:bg-slate-50 transition-colors">
                             Bild ändern
                             <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !currentUser || !auth.currentUser) return;
                                    try {
                                        const safeName = getSafeUserName(currentUser.name);
                                        const storageRef = ref(storage, `user_uploads/${currentUser.id}/${safeName}_profile_image`);
                                        await uploadBytes(storageRef, file);
                                        const url = await getDownloadURL(storageRef);
                                        
                                        await updateProfile(auth.currentUser, { photoURL: url });
                                        await updateDoc(doc(db, "users", currentUser.id), { photoURL: url });
                                        
                                        setCurrentUser((prev: User | null) => prev ? ({ ...prev, avatarUrl: url }) : null);
                                        alert("Profilbild aktualisiert!");
                                    } catch (err) {
                                        console.error("Upload error", err);
                                        alert("Fehler beim Hochladen.");
                                    }
                                }}
                             />
                         </label>
                     </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">Benachrichtigungen</h2>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">E-Mail bei neuen Kommentaren</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="checkbox" defaultChecked className="h-4 w-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500" />
                    <span className="text-sm text-slate-700">E-Mail bei Statusänderungen des Buches</span>
                  </label>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                 <button 
                   onClick={handleDeleteAccount}
                   disabled={isDeleting}
                   className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                 >
                    <Trash2 size={16} className="mr-2" />
                    {isDeleting ? 'Lösche...' : 'Konto löschen'}
                 </button>
                 <button 
                   onClick={handleUpdateProfile}
                   className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700 transition-colors"
                 >
                   Änderungen speichern
                 </button>
              </div>
            </div>
          </div>
        </DashboardLayout>
    );
};

const AuthorsView = ({ currentUser, currentView, setCurrentView, handleLogout }: any) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "users"));
                const usersList: User[] = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    usersList.push({
                        id: doc.id,
                        email: data.email,
                        name: data.name,
                        role: data.role || 'customer',
                        avatarUrl: data.photoURL,
                        joinedAt: data.joinedAt,
                        bookCount: data.bookCount || 0,
                        isApproved: data.isApproved
                    });
                });
                setAllUsers(usersList);
            } catch (error: any) {
                console.error("Error fetching users:", error);
                if (error.code === 'permission-denied') {
                    setError("Zugriff verweigert. Du hast keine Berechtigung, die Benutzerliste zu sehen.");
                } else {
                    setError("Ein Fehler ist aufgetreten.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const toggleRole = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert("Du kannst deine eigene Rolle nicht ändern.");
            return;
        }
        const newRole = user.role === 'customer' ? 'employee' : 'customer';
        const confirmMsg = newRole === 'employee' 
            ? `Soll ${user.name} wirklich zum Mitarbeiter befördert werden?` 
            : `Soll ${user.name} wieder zum Autor (Kunde) herabgestuft werden?`;
        
        if (!window.confirm(confirmMsg)) return;

        // Optimistic Update
        setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));

        try {
            await updateDoc(doc(db, "users", user.id), { role: newRole });
        } catch (error: any) {
            console.error("Failed to update role", error);
            // Revert
            setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: user.role } : u));
            if (error.code === 'permission-denied') {
                 alert("Keine Berechtigung: Nur Administratoren dürfen Rollen ändern.");
            } else {
                 alert("Fehler beim Speichern: " + error.message);
            }
        }
    };

    const toggleApproval = async (user: User) => {
        const newStatus = !user.isApproved;
        
        // Optimistic Update
        setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, isApproved: newStatus } : u));

        try {
            await updateDoc(doc(db, "users", user.id), { isApproved: newStatus });
        } catch (error: any) {
            console.error("Failed to update approval", error);
            // Revert
            setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, isApproved: user.isApproved } : u));
            if (error.code === 'permission-denied') {
                 alert("Keine Berechtigung: Nur Administratoren dürfen diesen Status ändern.");
            } else {
                 alert("Fehler beim Speichern: " + error.message);
            }
        }
    };

    return (
      <DashboardLayout currentUser={currentUser} currentView={currentView} setCurrentView={setCurrentView} handleLogout={handleLogout}>
         <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Autoren</h1>
          <p className="text-slate-500">Übersicht aller registrierten Autoren.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
           {loading ? (
             <div className="p-10 text-center text-slate-400">Lade Benutzer...</div>
           ) : error ? (
             <div className="p-10 text-center text-red-500">{error}</div>
           ) : (
             <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-4 rounded-l-lg">Name</th>
                  <th className="px-6 py-4">Bücher</th>
                  <th className="px-6 py-4">Dabei seit</th>
                  <th className="px-6 py-4 rounded-r-lg text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {allUsers.map(user => (
                   <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center space-x-4">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover bg-slate-200 shadow-sm" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shadow-sm">
                                    <UserIcon size={24} />
                                </div>
                            )}
                            <div>
                                <div className="font-semibold text-slate-800 text-base">{user.name}</div>
                                <div className="text-sm text-slate-500">{user.email}</div>
                                <div className="mt-1 flex space-x-2">
                                    {user.role === 'employee' && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                                            Mitarbeiter
                                        </span>
                                    )}
                                    {!user.isApproved && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
                                            Wartet auf Freigabe
                                        </span>
                                    )}
                                </div>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                         {user.bookCount}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                         {user.joinedAt || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <div className="flex items-center justify-end space-x-3">
                             {/* Role Toggle Button */}
                             <button 
                                onClick={() => toggleRole(user)}
                                className={`text-sm font-medium transition-colors ${user.role === 'employee' ? 'text-purple-600 hover:text-purple-800' : 'text-slate-400 hover:text-purple-600'}`}
                                title={user.role === 'employee' ? "Zum Autor machen" : "Zum Mitarbeiter befördern"}
                             >
                                 {user.role === 'employee' ? 'Degradieren' : 'Befördern'}
                             </button>
                             
                             <span className="text-slate-200">|</span>

                             {/* Approval Toggle Button */}
                             <button 
                                onClick={() => toggleApproval(user)}
                                className={`text-sm font-medium transition-colors ${
                                    user.isApproved
                                    ? 'text-blue-500 hover:text-red-600' 
                                    : 'text-green-600 hover:text-green-700'
                                }`}
                                title={user.isApproved ? "Benutzer sperren" : "Benutzer freigeben"}
                             >
                                 {user.isApproved ? 'Sperren' : 'Freigeben'}
                             </button>
                         </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
             </table>
             </div>
           )}
        </div>
      </DashboardLayout>
    );
};

const CustomerDashboard = ({ currentUser, currentView, setCurrentView, handleLogout, books, onCreateBook, onOpenBook, onCoverUpload }: any) => {
    const userTasks = getPendingTasks(books).filter(t => 
      books.find((b: any) => b.id === t.bookId)?.userId === currentUser?.id
    );
    const myBook = books.find((b: any) => b.userId === currentUser?.id);

    return (
    <DashboardLayout currentUser={currentUser} currentView={currentView} setCurrentView={setCurrentView} handleLogout={handleLogout}>
      
      {/* Approval Warning Banner */}
      {currentUser?.isApproved === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start">
              <ShieldAlert className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                  <h3 className="font-bold text-amber-800">Account noch nicht freigeschaltet</h3>
                  <p className="text-sm text-amber-700 mt-1">
                      Ein Administrator muss deinen Account noch prüfen und freigeben, bevor du ein neues Buchprojekt starten kannst. 
                      Bitte habe etwas Geduld.
                  </p>
              </div>
          </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meine Bücher</h1>
          <p className="text-slate-500">Verwalte deine Projekte und Schreibfortschritte</p>
        </div>
        <button 
          onClick={onCreateBook}
          className={`px-4 py-2 rounded-lg font-medium flex items-center space-x-2 shadow-sm transition-all ${
              currentUser?.isApproved === false 
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-brand-600 text-white hover:bg-brand-700'
          }`}
        >
          <Plus size={20} />
          <span>Neues Buch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {books.filter((b: any) => b.userId === currentUser?.id).map((book: any) => (
                <div key={book.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="h-40 bg-slate-100 relative overflow-hidden group/image">
                    {book.coverUrl ? (
                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Image size={48} />
                        </div>
                    )}
                    
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/image:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white">
                        <Upload size={24} className="mb-2" />
                        <span className="text-xs font-semibold">Cover ändern</span>
                        <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => onCoverUpload(e, book.id)}
                        />
                    </label>

                    <div className="absolute top-3 right-3 pointer-events-none">
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                        book.status === 'published' ? 'bg-green-100 text-green-700' : 
                        book.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' : 
                        'bg-slate-200 text-slate-600'
                        }`}>
                        {book.status === 'pending_approval' ? 'In Prüfung' : book.status}
                        </span>
                    </div>
                    </div>
                    <div className="p-5">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">{book.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{book.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                        <span className="text-xs text-slate-400">Zuletzt: {new Date(book.updatedAt).toLocaleDateString()}</span>
                        <button 
                        onClick={() => onOpenBook(book.id)}
                        className="text-brand-600 text-sm font-medium hover:text-brand-800 flex items-center group-hover:translate-x-1 transition-transform"
                        >
                        Öffnen <BookOpen size={16} className="ml-1" />
                        </button>
                    </div>
                    </div>
                </div>
                ))}
                {books.filter((b: any) => b.userId === currentUser?.id).length === 0 && (
                  <div 
                    onClick={onCreateBook}
                    className={`border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-8 transition-colors h-full min-h-[250px] ${
                        currentUser?.isApproved === false 
                        ? 'opacity-50 cursor-not-allowed bg-slate-50' 
                        : 'cursor-pointer hover:border-brand-300 hover:bg-brand-50 text-slate-400'
                    }`}
                  >
                     {currentUser?.isApproved === false ? <ShieldAlert size={32} className="mb-2 text-slate-400" /> : <Plus size={32} className="mb-2" />}
                     <span className="font-medium">Erstes Projekt starten</span>
                  </div>
                )}
             </div>

             {userTasks.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
                    <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h3 className="font-semibold text-slate-700 flex items-center">
                        <MessageSquare size={16} className="mr-2 text-blue-500" />
                        Offene Anmerkungen vom Lektorat
                    </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                    {userTasks.map((task, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between">
                            <div>
                            <div className="text-sm font-medium text-slate-800 mb-1">{task.chapterTitle} / {task.pageTitle}</div>
                            <p className="text-sm text-slate-500 italic mb-2">"{task.commentText}"</p>
                            <div className="flex items-center text-xs text-slate-400 space-x-2">
                                <span>{task.commentUser}</span>
                                <span>•</span>
                                <span>{new Date(task.commentDate).toLocaleDateString()}</span>
                            </div>
                            </div>
                            <button 
                            onClick={() => onOpenBook(task.bookId, task.pageId)}
                            className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                            >
                            Ansehen
                            </button>
                        </div>
                    ))}
                    </div>
                </div>
             )}
        </div>

        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <Clock size={20} />
                    </div>
                    <h3 className="font-bold text-slate-700">Gesamtzeit</h3>
                </div>
                <div className="text-3xl font-bold text-slate-800 mb-1">
                    {formatTime(myBook?.timeSpentSeconds || 0)}
                </div>
                <p className="text-xs text-slate-400">Produktive Schreibzeit in {myBook?.title || 'deinem Buch'}</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
                    <Activity size={16} className="text-slate-500" />
                    <h3 className="font-semibold text-slate-700 text-sm">Aktivitäten</h3>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">
                    {myBook?.activityLog?.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="relative pl-4 border-l-2 border-slate-200 last:border-0 pb-0">
                            <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-300"></div>
                            <div className="text-xs text-slate-400 mb-0.5">{new Date(log.timestamp).toLocaleString()}</div>
                            <div className="text-sm font-medium text-slate-700">{log.action}</div>
                            <div className="text-xs text-slate-500">{log.details}</div>
                        </div>
                    ))}
                    {(!myBook?.activityLog || myBook.activityLog.length === 0) && (
                        <p className="text-sm text-slate-400 text-center py-4">Noch keine Aktivitäten.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const EmployeeDashboard = ({ currentUser, currentView, setCurrentView, handleLogout, books, onOpenBook, showTaskModal, setShowTaskModal }: any) => {
    const pendingBooks = books.filter((b: any) => b.status === 'pending_approval');
    const allPendingTasks = getPendingTasks(books);
    
    return (
      <DashboardLayout currentUser={currentUser} currentView={currentView} setCurrentView={setCurrentView} handleLogout={handleLogout}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Mitarbeiter Dashboard</h1>
          <p className="text-slate-500">Übersicht über Freigaben und Aufgaben</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Ausstehende Freigaben</h3>
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Clock size={20} /></div>
            </div>
            <p className="text-3xl font-bold text-slate-800">{pendingBooks.length}</p>
          </div>
          
          <div 
            onClick={() => setShowTaskModal(true)}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
          >
             <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700 group-hover:text-blue-600">Offene Tasks</h3>
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><ListTodo size={20} /></div>
            </div>
            <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-slate-800">{allPendingTasks.length}</p>
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">Alle anzeigen &rarr;</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-semibold text-slate-700">Freigabe-Warteschlange</h3>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                    <th className="px-6 py-3">Buch Titel</th>
                    <th className="px-6 py-3">Autor</th>
                    <th className="px-6 py-3 text-right">Aktion</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {pendingBooks.map((book: any) => (
                    <tr key={book.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                        {book.title}
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{new Date(book.updatedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">{book.authorName}</td>
                    <td className="px-6 py-4 text-right">
                        <button 
                        onClick={() => onOpenBook(book.id)}
                        className="text-brand-600 hover:text-brand-800 font-medium"
                        >
                        Prüfen
                        </button>
                    </td>
                    </tr>
                ))}
                {pendingBooks.length === 0 && (
                    <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-400">Keine ausstehenden Freigaben.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700">Letzte Aktivitäten (Systemweit)</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                    {books.flatMap((b: any) => b.activityLog || []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((log: any, idx: number) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-slate-700">{log.action}</span>
                                <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>
                             <div className="text-sm text-slate-600">{log.details}</div>
                             <div className="text-xs text-slate-400 mt-1">User: {log.userId}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        {showTaskModal && (
            <TaskModal 
                show={showTaskModal} 
                onClose={() => setShowTaskModal(false)} 
                allTasks={allPendingTasks} 
                openBook={onOpenBook} 
            />
        )}
      </DashboardLayout>
    );
};

const LoginView = ({ authMode, setAuthMode, email, setEmail, password, setPassword, fullName, setFullName, profileImage, setProfileImage, authError, setAuthError, handleAuth, isLoadingAuth, onBackToLanding }: any) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-500 to-indigo-600">
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
      <button onClick={onBackToLanding} className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 text-sm">
        &larr; Zurück
      </button>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">meinbuch24.de</h1>
        <p className="text-slate-500">Dein Weg zum Bestseller</p>
      </div>

      <form onSubmit={handleAuth} className="space-y-4">
        
        {authMode === 'register' && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Voller Name</label>
              <input 
                type="text" 
                required 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Profilbild</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => setProfileImage(e.target.files?.[0] || null)}
                  />
                  {profileImage ? (
                    <div className="flex items-center justify-center text-green-600">
                       <CheckCircle size={20} className="mr-2" />
                       <span className="text-sm truncate">{profileImage.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                       <Upload size={24} className="mb-1" />
                       <span className="text-sm">Bild hochladen</span>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-Mail Adresse</label>
          <input 
            type="email" 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Passwort</label>
          <input 
            type="password" 
            required 
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {authError && (
           <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200">
             {authError}
           </div>
        )}

        <button 
          type="submit"
          disabled={isLoadingAuth}
          className="w-full bg-brand-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-brand-700 transition-colors flex items-center justify-center disabled:opacity-70"
        >
          {isLoadingAuth ? 'Lade...' : (authMode === 'login' ? 'Anmelden' : 'Registrieren')}
        </button>
      </form>

      <div className="mt-6 text-center">
        {authMode === 'login' ? (
           <p className="text-sm text-slate-500">
             Noch kein Konto?{' '}
             <button onClick={() => { setAuthMode('register'); setAuthError(''); }} className="text-brand-600 font-semibold hover:underline">
               Jetzt registrieren
             </button>
           </p>
        ) : (
          <p className="text-sm text-slate-500">
            Bereits ein Konto?{' '}
            <button onClick={() => { setAuthMode('login'); setAuthError(''); }} className="text-brand-600 font-semibold hover:underline">
              Zur Anmeldung
            </button>
          </p>
        )}
      </div>
    </div>
  </div>
);

// --- Main App Component ---

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [books, setBooks] = useState<BookType[]>([]); 
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | undefined>(undefined);
  
  // Auth State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [authError, setAuthError] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  // Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);

  // --- Real-time Books Listener (onSnapshot) ---
  useEffect(() => {
    if (!currentUser) {
        setBooks([]);
        return;
    }

    let unsubscribe: () => void;

    // Helper to setup listener
    const setupListener = async () => {
        try {
            if (currentUser.role === 'employee') {
                 fetchBooksForEmployee();
            } else {
                 const projectsRef = collection(db, "Buecher", currentUser.id, "projects");
                 unsubscribe = onSnapshot(projectsRef, (snapshot) => {
                     const loadedBooks: BookType[] = [];
                     snapshot.forEach(doc => {
                         loadedBooks.push(doc.data() as BookType);
                     });
                     loadedBooks.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                     setBooks(loadedBooks);
                 }, (error) => {
                     if (error.code === 'permission-denied') {
                         console.warn("Firestore Read Permission Denied - Offline Mode");
                     } else {
                         console.error("Book listener error", error);
                     }
                 });
            }
        } catch (err) {
            console.error("Setup listener error", err);
        }
    };

    setupListener();

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const fetchBooksForEmployee = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        let allBooks: BookType[] = [];
        
        for (const uDoc of usersSnap.docs) {
            try {
                const projectsRef = collection(db, "Buecher", uDoc.id, "projects");
                const booksSnap = await getDocs(projectsRef);
                booksSnap.forEach(bDoc => {
                    allBooks.push(bDoc.data() as BookType);
                });
            } catch (e) {}
        }
        setBooks(allBooks);
      } catch (err: any) {
          if (err.code === 'permission-denied') {
             console.warn("Employee fetch permission denied.");
          } else {
             console.error("Employee fetch error", err);
          }
      }
  };


  // --- Auth Listener & Sync ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoadingAuth(true);
        const userRef = doc(db, "users", user.uid);
        
        try {
            let appUser: User;
            let userSnap;
            try { userSnap = await getDoc(userRef); } catch (e) {}

            if (userSnap && userSnap.exists()) {
                const data = userSnap.data();
                
                if (user.email === 'a.aydin1444@gmail.com' && data.role !== 'employee') {
                    try {
                        await setDoc(userRef, { role: 'employee', isApproved: true }, { merge: true });
                        data.role = 'employee';
                        data.isApproved = true;
                    } catch (e) {}
                }

                appUser = {
                    id: user.uid,
                    email: user.email || '',
                    name: data.name || user.displayName || 'Unbenannt',
                    role: data.role || 'customer',
                    avatarUrl: data.photoURL || user.photoURL || undefined,
                    joinedAt: data.joinedAt,
                    bookCount: data.bookCount || 0,
                    isApproved: data.isApproved
                };
            } else {
                const isEditor = user.email?.toLowerCase().includes('editor') || user.email === 'a.aydin1444@gmail.com';
                const role = isEditor ? 'employee' : 'customer';
                const isApproved = isEditor;
                const photoURL = user.photoURL || '';
                
                const newUser = {
                    name: user.displayName || 'User',
                    email: user.email || '',
                    photoURL: photoURL,
                    role: role,
                    joinedAt: new Date().toISOString().split('T')[0],
                    bookCount: 0,
                    isApproved: isApproved
                };
                
                try { await setDoc(userRef, newUser, { merge: true }); } catch (e) {}
                
                appUser = {
                    id: user.uid,
                    role: role,
                    name: newUser.name,
                    email: newUser.email,
                    avatarUrl: newUser.photoURL,
                    joinedAt: newUser.joinedAt,
                    bookCount: 0,
                    isApproved: isApproved
                };
            }
            
            setCurrentUser(appUser);
            setCurrentView(appUser.role === 'customer' ? 'customer-dash' : 'employee-dash');
        } catch (err) {
            console.error("Sync user error:", err);
            const fallbackRole = (user.email?.toLowerCase().includes('editor') || user.email === 'a.aydin1444@gmail.com') ? 'employee' : 'customer';
            setCurrentUser({
                id: user.uid,
                email: user.email || '',
                name: user.displayName || 'User',
                role: fallbackRole,
                avatarUrl: user.photoURL || undefined,
                isApproved: false
            });
             setCurrentView(fallbackRole === 'customer' ? 'customer-dash' : 'employee-dash');
        } finally {
            setIsLoadingAuth(false);
        }

      } else {
        setCurrentUser(null);
        setBooks([]); 
        setIsLoadingAuth(false);
        setCurrentView(prev => prev === 'login' ? 'login' : 'landing');
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Auth Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoadingAuth(true);

    const cleanEmail = email.trim(); 
    const cleanPassword = password; 

    if (!cleanEmail || !cleanPassword) {
         setAuthError('Bitte E-Mail und Passwort eingeben.');
         setIsLoadingAuth(false);
         return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        const user = userCredential.user;
        let photoURL = '';

        if (profileImage) {
          const safeName = getSafeUserName(fullName);
          const storageRef = ref(storage, `user_uploads/${user.uid}/${safeName}_profile_image`);
          await uploadBytes(storageRef, profileImage);
          photoURL = await getDownloadURL(storageRef);
        }

        await updateProfile(user, { displayName: fullName, photoURL: photoURL });

        const isEmployeeEmail = cleanEmail === 'a.aydin1444@gmail.com';
        const role = isEmployeeEmail ? 'employee' : 'customer';

        try {
            await setDoc(doc(db, "users", user.uid), {
                name: fullName,
                email: cleanEmail,
                photoURL: photoURL,
                photoFileName: profileImage ? profileImage.name : null, 
                role: role, 
                joinedAt: new Date().toISOString().split('T')[0],
                bookCount: 0,
                isApproved: isEmployeeEmail
            });
        } catch (e) {}
      }
    } catch (error: any) {
      // Suppress console error for known operational errors to avoid confusion
      const errorCode = error.code;
      const expectedErrors = [
          'auth/invalid-credential', 
          'auth/user-not-found', 
          'auth/wrong-password', 
          'auth/email-already-in-use', 
          'auth/weak-password', 
          'auth/invalid-email'
      ];

      if (!expectedErrors.includes(errorCode)) {
          console.error("Auth error:", error);
      }

      // Friendly Error Messages
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
        setAuthError('Zugangsdaten ungültig. Falls du ein Demo-Konto nutzen wolltest: Diese existieren nur in der Vorschau. Bitte registriere dich neu.');
      } else if (errorCode === 'auth/email-already-in-use') {
        setAuthError('Diese E-Mail wird bereits verwendet. Bitte logge dich ein.');
      } else if (errorCode === 'auth/weak-password') {
        setAuthError('Das Passwort ist zu schwach (min. 6 Zeichen).');
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError('Bitte gib eine gültige E-Mail-Adresse ein.');
      } else if (errorCode === 'auth/too-many-requests') {
        setAuthError('Zu viele Versuche. Bitte warte einen Moment oder setze dein Passwort zurück.');
      } else if (errorCode === 'auth/user-disabled') {
        setAuthError('Dieses Konto wurde deaktiviert. Bitte kontaktiere den Support.');
      } else {
        setAuthError('Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.');
      }
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSelectedBookId(null);
    setSelectedPageId(undefined);
    setEmail('');
    setPassword('');
    setFullName('');
    setProfileImage(null);
    setCurrentView('landing');
  };

  // --- Helper Functions ---

  const handleCreateBook = async () => {
    if (!currentUser) return;
    if (currentUser.isApproved === false) {
        alert("Dein Account wurde noch nicht von einem Administrator freigeschaltet.");
        return;
    }

    const newBookId = `book-${Date.now()}`;
    const newBook: BookType = {
        id: newBookId,
        userId: currentUser.id,
        authorName: currentUser.name,
        title: 'Neues Buch',
        description: 'Eine kurze Beschreibung deines Buches...',
        status: 'draft',
        coverUrl: '', 
        chapters: [],
        updatedAt: new Date().toISOString(),
        timeSpentSeconds: 0,
        activityLog: [{
            id: `log-${Date.now()}`,
            action: 'Buch erstellt',
            details: 'Neues Projekt gestartet',
            timestamp: new Date().toISOString(),
            userId: currentUser.id
        }]
    };
    
    setBooks(prev => [...prev, newBook]);
    openBook(newBook.id);

    try {
        const bookRef = doc(db, "Buecher", currentUser.id, "projects", newBookId);
        const cleanedBook = cleanDataForFirestore(newBook);
        await setDoc(bookRef, cleanedBook);
    } catch (err: any) {
        if (err.code === 'permission-denied') {
            console.warn("Firestore permissions denied.");
        } else {
            console.error("Error creating book in DB:", err);
        }
    }
  };

  const openBook = (bookId: string, pageId?: string) => {
    setSelectedBookId(bookId);
    setSelectedPageId(pageId); 
    setCurrentView('editor');
    setShowTaskModal(false); 
  };

  const updateBook = async (updatedBook: BookType) => {
    setBooks(prev => prev.map(b => b.id === updatedBook.id ? updatedBook : b));
    try {
        const bookRef = doc(db, "Buecher", updatedBook.userId, "projects", updatedBook.id);
        const cleanedBook = cleanDataForFirestore(updatedBook);
        await setDoc(bookRef, cleanedBook, { merge: true });
    } catch (err: any) {
        if (err.code === 'permission-denied') {
             console.warn("Save failed: Permissions denied.");
        } else {
             console.error("Error saving book:", err);
        }
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>, bookId: string) => {
    const file = e.target.files?.[0];
    if (file && currentUser) {
      const localUrl = URL.createObjectURL(file);
      const bookToUpdate = books.find(b => b.id === bookId);
      
      if (bookToUpdate) {
        const optimisticBook = { ...bookToUpdate, coverUrl: localUrl, updatedAt: new Date().toISOString() };
        setBooks(prev => prev.map(b => b.id === bookId ? optimisticBook : b));

        try {
            const safeName = getSafeUserName(currentUser.name);
            const storageRef = ref(storage, `user_uploads/${currentUser.id}/${safeName}_profile_image`);
            await uploadBytes(storageRef, file);
            const imageUrl = await getDownloadURL(storageRef);
            
            const finalBook = { ...bookToUpdate, coverUrl: imageUrl, updatedAt: new Date().toISOString() };
            await updateBook(finalBook);
        } catch (err: any) {
            if (err.code === 'storage/unauthorized') {
                console.warn("Cover upload permission denied.");
                await updateBook(optimisticBook);
            } else {
                console.error("Cover upload failed:", err);
            }
        }
      }
    }
  };

  // --- Main Render Switch ---

  if (currentView === 'landing') return (
    <LandingPage 
        onLogin={() => {
            setAuthMode('login');
            setCurrentView('login');
        }}
        onRegister={() => {
            setAuthMode('register');
            setCurrentView('login');
        }}
    />
  );

  if (currentView === 'login') return (
    <LoginView 
        authMode={authMode} 
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        fullName={fullName}
        setFullName={setFullName}
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        authError={authError}
        setAuthError={setAuthError}
        handleAuth={handleAuth}
        isLoadingAuth={isLoadingAuth}
        onBackToLanding={() => setCurrentView('landing')}
    />
  );

  if (currentView === 'settings') return (
    <SettingsView 
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        handleLogout={handleLogout}
    />
  );

  if (currentView === 'authors') return (
    <AuthorsView 
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        handleLogout={handleLogout}
    />
  );

  if (currentView === 'editor' && selectedBookId) {
    const book = books.find(b => b.id === selectedBookId);
    if (!book) return <div>Book not found</div>;
    
    return (
      <BookEditor 
        book={book} 
        initialPageId={selectedPageId}
        onSave={updateBook} 
        onBack={() => {
            setSelectedBookId(null);
            setSelectedPageId(undefined);
            setCurrentView(currentUser?.role === 'customer' ? 'customer-dash' : 'employee-dash');
        }}
        currentUserRole={currentUser?.role || 'customer'}
      />
    );
  }

  if (currentView === 'employee-dash') return (
    <EmployeeDashboard 
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        handleLogout={handleLogout}
        books={books}
        onOpenBook={openBook}
        showTaskModal={showTaskModal}
        setShowTaskModal={setShowTaskModal}
    />
  );

  return (
    <CustomerDashboard 
        currentUser={currentUser}
        currentView={currentView}
        setCurrentView={setCurrentView}
        handleLogout={handleLogout}
        books={books}
        onCreateBook={handleCreateBook}
        onOpenBook={openBook}
        onCoverUpload={handleCoverUpload}
    />
  );
}

export default App;