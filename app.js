// Inicializar Iconos de Lucide
lucide.createIcons();

// ==========================================
// ESTADO Y ALMACENAMIENTO (LocalStorage)
// ==========================================
const Storage = {
    getUsers: () => JSON.parse(localStorage.getItem('np_users')) || [],
    saveUsers: (users) => localStorage.setItem('np_users', JSON.stringify(users)),
    getSession: () => JSON.parse(localStorage.getItem('np_session')) || null,
    saveSession: (user) => localStorage.setItem('np_session', JSON.stringify(user)),
    removeSession: () => localStorage.removeItem('np_session'),
    getNotes: (email) => JSON.parse(localStorage.getItem(`np_notes_${email}`)) || [],
    saveNotes: (email, notes) => localStorage.setItem(`np_notes_${email}`, JSON.stringify(notes))
};

let currentUser = Storage.getSession();
let notes = currentUser ? Storage.getNotes(currentUser.email) : [];
let currentFilter = 'all';
let editingNoteId = null;

// ==========================================
// ELEMENTOS DEL DOM
// ==========================================
const elements = {
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    authForm: document.getElementById('auth-form'),
    authTitle: document.getElementById('auth-subtitle'),
    toggleAuthBtn: document.getElementById('toggle-auth-btn'),
    authToggleText: document.getElementById('auth-toggle-text'),
    registerFields: document.getElementById('register-fields'),
    
    // Contenedores App
    userNameDisplay: document.getElementById('user-display-name'),
    notesContainer: document.getElementById('notes-container'),
    searchInput: document.getElementById('search-input'),
    navButtons: document.querySelectorAll('.nav-btn'),
    
    // Estadísticas
    statTotal: document.getElementById('stat-total'),
    statImportant: document.getElementById('stat-important'),
    
    // Botones Globales
    logoutBtn: document.getElementById('logout-btn'),
    newNoteBtn: document.getElementById('new-note-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    sidebar: document.getElementById('sidebar'),
    openSidebarBtn: document.getElementById('open-sidebar-btn'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    
    // Modal Notas
    noteModal: document.getElementById('note-modal'),
    noteModalContent: document.getElementById('note-modal-content'),
    cancelNoteBtn: document.getElementById('cancel-note-btn'),
    saveNoteBtn: document.getElementById('save-note-btn'),
    exportNoteBtn: document.getElementById('export-note-btn'),
    noteTitleInput: document.getElementById('note-title'),
    noteContentInput: document.getElementById('note-content'),
    noteCategorySelect: document.getElementById('note-category'),
    noteDateInput: document.getElementById('note-date'),
    togglePinBtn: document.getElementById('toggle-pin-btn'),
    toggleStarBtn: document.getElementById('toggle-star-btn'),
    pinIcon: document.getElementById('pin-icon'),
    starIcon: document.getElementById('star-icon'),
    noteTimestamp: document.getElementById('note-timestamp'),

    // Modal Ajustes
    settingsBtn: document.getElementById('settings-btn'),
    settingsModal: document.getElementById('settings-modal'),
    closeSettingsBtn: document.getElementById('close-settings-btn'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    settingsNameInput: document.getElementById('settings-name'),
    colorSelector: document.getElementById('color-selector')
};

// Variables Temporales del Modal
let tempIsPinned = false;
let tempIsImportant = false;

// ==========================================
// INICIALIZACIÓN
// ==========================================
function init() {
    applyTheme();
    if (currentUser) {
        applyUserColor(currentUser.color);
        showApp();
    } else {
        showAuth();
    }
    setupEventListeners();
}

// ==========================================
// AUTENTICACIÓN
// ==========================================
let isLoginMode = true;

function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    elements.registerFields.classList.toggle('hidden', isLoginMode);
    elements.authTitle.textContent = isLoginMode ? "Inicia sesión en tu cuenta" : "Crea una nueva cuenta";
    elements.authToggleText.textContent = isLoginMode ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?";
    elements.toggleAuthBtn.textContent = isLoginMode ? "Regístrate" : "Inicia Sesión";
    document.getElementById('auth-name').required = !isLoginMode;
}

function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value.trim();
    const users = Storage.getUsers();

    if (isLoginMode) {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            currentUser = user;
            Storage.saveSession(user);
            showApp();
        } else {
            alert("Credenciales incorrectas.");
        }
    } else {
        if (users.some(u => u.email === email)) {
            return alert("El correo ya está registrado.");
        }
        const newUser = { email, password, name: name || "Usuario", color: '#800020' };
        users.push(newUser);
        Storage.saveUsers(users);
        currentUser = newUser;
        Storage.saveSession(newUser);
        showApp();
    }
}

function logout() {
    Storage.removeSession();
    currentUser = null;
    notes = [];
    document.getElementById('auth-form').reset();
    showAuth();
}

function showAuth() {
    elements.appView.classList.add('hidden');
    elements.authView.classList.remove('hidden');
}

function showApp() {
    elements.authView.classList.add('hidden');
    elements.appView.classList.remove('hidden');
    elements.userNameDisplay.textContent = currentUser.name;
    applyUserColor(currentUser.color);
    notes = Storage.getNotes(currentUser.email);
    renderNotes();
    updateDashboard();
}

// ==========================================
// GESTIÓN DE NOTAS (CRUD)
// ==========================================
function renderNotes() {
    elements.notesContainer.innerHTML = '';
    const searchTerm = elements.searchInput.value.toLowerCase();
    
    let filteredNotes = notes.filter(note => {
        const matchesSearch = note.title.toLowerCase().includes(searchTerm) || note.content.toLowerCase().includes(searchTerm);
        const matchesFilter = currentFilter === 'all' || 
                              (currentFilter === 'important' && note.isImportant) ||
                              note.category === currentFilter;
        return matchesSearch && matchesFilter;
    });

    // Ordenar: Fijadas primero, luego por fecha más reciente
    filteredNotes.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (filteredNotes.length === 0) {
        elements.notesContainer.innerHTML = `
            <div class="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                <i data-lucide="inbox" class="w-16 h-16 mx-auto mb-4 opacity-50"></i>
                <p>No se encontraron notas.</p>
            </div>`;
        lucide.createIcons();
        return;
    }

    filteredNotes.forEach(note => {
        const card = document.createElement('div');
        card.className = `bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all cursor-pointer group note-card-enter flex flex-col h-64 ${note.isPinned ? 'ring-2 ring-primary ring-opacity-50' : ''}`;
        
        const dateStr = new Date(note.createdAt).toLocaleDateString();
        const dueBadge = note.dueDate ? `<span class="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded border border-red-200 dark:border-red-800"><i data-lucide="clock" class="w-3 h-3 inline"></i> ${new Date(note.dueDate).toLocaleDateString()}</span>` : '';
        const starClass = note.isImportant ? 'text-yellow-500 fill-current' : 'text-gray-300 dark:text-gray-600';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-bold text-lg truncate flex-1 pr-2">${note.title || 'Sin título'}</h3>
                <i data-lucide="star" class="w-5 h-5 ${starClass} flex-shrink-0"></i>
            </div>
            <div class="flex gap-2 mb-3">
                <span class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${note.category}</span>
                ${dueBadge}
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm flex-1 overflow-hidden relative">
                ${note.content}
                <span class="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent"></span>
            </p>
            <div class="mt-4 flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                <span>${dateStr}</span>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button class="hover:text-red-500 p-1 delete-note-btn" data-id="${note.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-note-btn')) openNoteModal(note);
        });

        const deleteBtn = card.querySelector('.delete-note-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
                card.classList.replace('note-card-enter', 'note-card-exit');
                setTimeout(() => deleteNote(note.id), 200);
            }
        });

        elements.notesContainer.appendChild(card);
    });
    lucide.createIcons();
}

function openNoteModal(note = null) {
    editingNoteId = note ? note.id : null;
    tempIsPinned = note ? note.isPinned : false;
    tempIsImportant = note ? note.isImportant : false;

    elements.noteTitleInput.value = note ? note.title : '';
    elements.noteContentInput.value = note ? note.content : '';
    elements.noteCategorySelect.value = note ? note.category : 'Personal';
    elements.noteDateInput.value = note && note.dueDate ? note.dueDate : '';
    elements.noteTimestamp.textContent = note ? `Última edición: ${new Date(note.updatedAt || note.createdAt).toLocaleString()}` : 'Nueva Nota';
    
    updateModalIcons();

    elements.noteModal.classList.remove('hidden');
    setTimeout(() => {
        elements.noteModal.classList.remove('opacity-0');
        elements.noteModalContent.classList.remove('scale-95');
    }, 10);
}

function closeNoteModal() {
    elements.noteModal.classList.add('opacity-0');
    elements.noteModalContent.classList.add('scale-95');
    setTimeout(() => {
        elements.noteModal.classList.add('hidden');
        editingNoteId = null;
    }, 300);
}

function saveNote() {
    const title = elements.noteTitleInput.value.trim();
    const content = elements.noteContentInput.value.trim();
    if (!title && !content) return closeNoteModal();

    const timestamp = new Date().toISOString();
    const noteData = {
        title: title || 'Sin título',
        content,
        category: elements.noteCategorySelect.value,
        dueDate: elements.noteDateInput.value,
        isPinned: tempIsPinned,
        isImportant: tempIsImportant,
        updatedAt: timestamp
    };

    if (editingNoteId) {
        const index = notes.findIndex(n => n.id === editingNoteId);
        if (index !== -1) notes[index] = { ...notes[index], ...noteData };
    } else {
        notes.push({ id: Date.now().toString(), createdAt: timestamp, ...noteData });
    }

    Storage.saveNotes(currentUser.email, notes);
    renderNotes();
    updateDashboard();
    closeNoteModal();
}

function deleteNote(id) {
    notes = notes.filter(n => n.id !== id);
    Storage.saveNotes(currentUser.email, notes);
    renderNotes();
    updateDashboard();
}

function exportToTXT() {
    const title = elements.noteTitleInput.value || 'Nota_Sin_Titulo';
    const content = elements.noteContentInput.value;
    const blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// UTILIDADES Y UI
// ==========================================
function updateDashboard() {
    elements.statTotal.textContent = notes.length;
    elements.statImportant.textContent = notes.filter(n => n.isImportant).length;
}

function updateModalIcons() {
    elements.pinIcon.classList.toggle('text-primary', tempIsPinned);
    elements.pinIcon.classList.toggle('fill-current', tempIsPinned);
    elements.starIcon.classList.toggle('text-yellow-500', tempIsImportant);
    elements.starIcon.classList.toggle('fill-current', tempIsImportant);
}

function applyTheme() {
    const isDark = localStorage.getItem('np_theme') === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    elements.themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('np_theme', isDark ? 'dark' : 'light');
    elements.themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}

function applyUserColor(hex) {
    document.documentElement.style.setProperty('--color-primary', hex);
    currentUser.color = hex;
    Storage.saveSession(currentUser);
    
    // Actualizar usuarios en BD local
    const users = Storage.getUsers();
    const index = users.findIndex(u => u.email === currentUser.email);
    if(index !== -1) {
        users[index].color = hex;
        Storage.saveUsers(users);
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    // Auth
    elements.toggleAuthBtn.addEventListener('click', toggleAuthMode);
    elements.authForm.addEventListener('submit', handleAuth);
    elements.logoutBtn.addEventListener('click', logout);

    // Sidebar & Filtros
    elements.openSidebarBtn.addEventListener('click', () => elements.sidebar.classList.remove('-translate-x-full'));
    elements.closeSidebarBtn.addEventListener('click', () => elements.sidebar.classList.add('-translate-x-full'));
    
    elements.navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            elements.navButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            renderNotes();
            if (window.innerWidth < 768) elements.sidebar.classList.add('-translate-x-full'); // Cierra en móviles
        });
    });

    // UI Principal
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.searchInput.addEventListener('input', renderNotes);
    elements.newNoteBtn.addEventListener('click', () => openNoteModal());

    // Modal de Notas
    elements.cancelNoteBtn.addEventListener('click', closeNoteModal);
    elements.saveNoteBtn.addEventListener('click', saveNote);
    elements.exportNoteBtn.addEventListener('click', exportToTXT);
    
    elements.togglePinBtn.addEventListener('click', () => {
        tempIsPinned = !tempIsPinned;
        updateModalIcons();
    });
    elements.toggleStarBtn.addEventListener('click', () => {
        tempIsImportant = !tempIsImportant;
        updateModalIcons();
    });

    // Ajustes
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsNameInput.value = currentUser.name;
        elements.settingsModal.classList.remove('hidden');
        setTimeout(() => elements.settingsModal.classList.remove('opacity-0'), 10);
    });
    
    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('opacity-0');
        setTimeout(() => elements.settingsModal.classList.add('hidden'), 300);
    });

    elements.saveSettingsBtn.addEventListener('click', () => {
        currentUser.name = elements.settingsNameInput.value.trim() || currentUser.name;
        Storage.saveSession(currentUser);
        const users = Storage.getUsers();
        const index = users.findIndex(u => u.email === currentUser.email);
        if(index !== -1) { users[index].name = currentUser.name; Storage.saveUsers(users); }
        
        elements.userNameDisplay.textContent = currentUser.name;
        elements.closeSettingsBtn.click();
    });

    elements.colorSelector.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            applyUserColor(e.target.dataset.color);
        }
    });
}

// Arrancar App
init();