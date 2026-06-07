// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN DE FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    deleteDoc, 
    doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCnjiptOkDG2n2ceCs8_x79Jw_SVBpisGM",
  authDomain: "blocdenotaspro.firebaseapp.com",
  projectId: "blocdenotaspro",
  storageBucket: "blocdenotaspro.firebasestorage.app",
  messagingSenderId: "105098071742",
  appId: "1:105098071742:web:f74d1b6bad9bd4754898ef",
  measurementId: "G-JBL743B7VS"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables de estado de la aplicación
let usuarioActual = null;
let modoRegistro = false;
let filtroActual = "all";
let notasGlobales = []; // Guarda las notas bajadas de Firebase para el buscador
let notaEsImportante = false;

// ==========================================
// 2. CAPTURA DE ELEMENTOS DEL DOM
// ==========================================
// Vistas principales
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const sidebar = document.getElementById("sidebar");

// Autenticación
const authForm = document.getElementById("auth-form");
const registerFields = document.getElementById("register-fields");
const authSubtitle = document.getElementById("auth-subtitle");
const authToggleText = document.getElementById("auth-toggle-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const submitBtn = authForm.querySelector("button[type='submit']");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const userDisplayName = document.getElementById("user-display-name");
const logoutBtn = document.getElementById("logout-btn");

// Panel de Notas y Estadísticas
const notesContainer = document.getElementById("notes-container");
const statTotal = document.getElementById("stat-total");
const statImportant = document.getElementById("stat-important");
const searchInput = document.getElementById("search-input");

// Botones de control de la Barra Lateral
const openSidebarBtn = document.getElementById("open-sidebar-btn");
const closeSidebarBtn = document.getElementById("close-sidebar-btn");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

// Modales
const noteModal = document.getElementById("note-modal");
const newNoteBtn = document.getElementById("new-note-btn");
const cancelNoteBtn = document.getElementById("cancel-note-btn");
const saveNoteBtn = document.getElementById("save-note-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsBtn = document.getElementById("settings-btn");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const saveSettingsBtn = document.getElementById("save-settings-btn");

// Inputs internos del Modal de Notas
const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");
const noteCategory = document.getElementById("note-category");
const noteDate = document.getElementById("note-date");
const toggleStarBtn = document.getElementById("toggle-star-btn");
const starIcon = document.getElementById("star-icon");

// Inputs de Configuración
const settingsName = document.getElementById("settings-name");

// ==========================================
// 3. INTERFAZ RESPONSIVA Y MODOS (MENÚ ☰ Y NOCHE)
// ==========================================

// Abrir Menú Lateral (3 líneas) en celular
if (openSidebarBtn) {
    openSidebarBtn.addEventListener("click", () => {
        sidebar.classList.remove("-translate-x-full");
    });
}

// Cerrar Menú Lateral (X) en celular
if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", () => {
        sidebar.classList.add("-translate-x-full");
    });
}

// Cambiar entre Modo Claro y Oscuro (Luna/Sol)
if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark");
        if (document.documentElement.classList.contains("dark")) {
            themeIcon.setAttribute("data-lucide", "sun");
        } else {
            themeIcon.setAttribute("data-lucide", "moon");
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
}

// ==========================================
// 4. PERSONALIZACIÓN DE TEMAS DE COLORES (PRO)
// ==========================================
const colorButtons = document.querySelectorAll("#color-selector button");
colorButtons.forEach(button => {
    button.addEventListener("click", (e) => {
        const colorSeleccionado = e.target.getAttribute("data-color");
        // Cambiar la variable CSS primaria dinámicamente en tiempo real
        document.documentElement.style.setProperty('--color-primary', colorSeleccionado);
        
        // Marcar visualmente cuál botón está activo
        colorButtons.forEach(b => b.classList.remove("ring-black", "dark:ring-white"));
        e.target.classList.add("ring-black", "dark:ring-white");
    });
});

// Abrir y Cerrar Ventana de Configuración
if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
        if (usuarioActual) settingsName.value = usuarioActual.displayName || "";
        settingsModal.classList.remove("hidden");
        setTimeout(() => settingsModal.classList.remove("opacity-0"), 10);
    });
}
if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
        settingsModal.classList.add("opacity-0");
        setTimeout(() => settingsModal.classList.add("hidden"), 300);
    });
}

// Guardar los cambios de perfil (Nombre)
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", async () => {
        const nuevoNombre = settingsName.value.trim();
        if (nuevoNombre && usuarioActual) {
            try {
                await updateProfile(usuarioActual, { displayName: nuevoNombre });
                userDisplayName.textContent = nuevoNombre;
                alert("Configuración guardada correctamente.");
                closeSettingsBtn.click();
            } catch (err) {
                alert("Error al actualizar perfil: " + err.message);
            }
        }
    });
}

// ==========================================
// 5. SISTEMA DE AUTENTICACIÓN (LOGIN/REGISTRO)
// ==========================================
if (toggleAuthBtn) {
    toggleAuthBtn.addEventListener("click", (e) => {
        e.preventDefault();
        modoRegistro = !modoRegistro;
        if (modoRegistro) {
            registerFields.classList.remove("hidden");
            authSubtitle.textContent = "Crea una cuenta totalmente gratis";
            authToggleText.textContent = "¿Ya tienes cuenta?";
            toggleAuthBtn.textContent = "Inicia sesión";
            submitBtn.textContent = "Registrarse";
        } else {
            registerFields.classList.add("hidden");
            authSubtitle.textContent = "Inicia sesión en tu cuenta";
            authToggleText.textContent = "¿No tienes cuenta?";
            toggleAuthBtn.textContent = "Regístrate";
            submitBtn.textContent = "Entrar";
        }
    });
}

authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();
    const nombre = authName.value.trim();

    if (modoRegistro) {
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(res.user, { displayName: nombre || "Usuario" });
            alert("¡Cuenta registrada con éxito!");
            authForm.reset();
        } catch (error) {
            alert("Error al registrar: " + error.message);
        }
    } else {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            authForm.reset();
        } catch (error) {
            alert("Credenciales incorrectas.");
        }
    }
});

logoutBtn.addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        userDisplayName.textContent = user.displayName || "Usuario";
        authView.classList.add("hidden");
        appView.classList.remove("hidden");
        // Cargar por defecto el color azul rey al iniciar
        document.documentElement.style.setProperty('--color-primary', '#3b82f6');
        cargarNotasDesdeNube();
    } else {
        usuarioActual = null;
        appView.classList.add("hidden");
        authView.classList.remove("hidden");
        notesContainer.innerHTML = "";
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// ==========================================
// 6. GESTIÓN DE NOTAS (MODAL Y FIRESTORE)
// ==========================================
if (newNoteBtn) {
    newNoteBtn.addEventListener("click", () => {
        noteTitle.value = "";
        noteContent.value = "";
        noteCategory.value = "Personal";
        noteDate.value = new Date().toISOString().split('T')[0];
        notaEsImportante = false;
        starIcon.classList.replace("text-yellow-500", "text-gray-400");
        
        noteModal.classList.remove("hidden");
        setTimeout(() => noteModal.classList.remove("opacity-0"), 10);
    });
}

if (cancelNoteBtn) {
    cancelNoteBtn.addEventListener("click", () => {
        noteModal.classList.add("opacity-0");
        setTimeout(() => noteModal.classList.add("hidden"), 300);
    });
}

if (toggleStarBtn) {
    toggleStarBtn.addEventListener("click", (e) => {
        e.preventDefault();
        notaEsImportante = !notaEsImportante;
        if (notaEsImportante) {
            starIcon.classList.replace("text-gray-400", "text-yellow-500");
        } else {
            starIcon.classList.replace("text-yellow-500", "text-gray-400");
        }
    });
}

saveNoteBtn.addEventListener("click", async () => {
    const titulo = noteTitle.value.trim();
    const contenido = noteContent.value.trim();
    const categoria = noteCategory.value;
    const fechaNota = noteDate.value;

    if (!titulo || !contenido) {
        alert("El título y contenido no pueden estar vacíos.");
        return;
    }

    try {
        await addDoc(collection(db, "notas"), {
            userId: usuarioActual.uid,
            titulo: titulo,
            contenido: contenido,
            categoria: categoria,
            fecha: fechaNota,
            importante: notaEsImportante,
            fechaCreacion: new Date().toISOString()
        });
        cancelNoteBtn.click();
        cargarNotasDesdeNube();
    } catch (error) {
        console.error("Error al guardar nota: ", error);
    }
});

async function cargarNotasDesdeNube() {
    if (!usuarioActual || !notesContainer) return;

    try {
        const q = query(collection(db, "notas"), where("userId", "==", usuarioActual.uid));
        const querySnapshot = await getDocs(q);
        
        notasGlobales = [];
        let contadorImportantes = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.importante) contadorImportantes++;
            notasGlobales.push({ id: docSnap.id, ...data });
        });

        statTotal.textContent = notasGlobales.length;
        statImportant.textContent = contadorImportantes;

        renderizarNotas(notasGlobales);

    } catch (error) {
        console.error("Error cargando notas: ", error);
    }
}

// Función encargada de pintar los bloques HTML de las notas
function renderizarNotas(listaDeNotas) {
    // Aplicar filtros de la barra lateral izquierda
    let notasFiltradas = listaDeNotas;
    if (filtroActual === "important") {
        notasFiltradas = listaDeNotas.filter(n => n.importante);
    } else if (filtroActual !== "all") {
        notasFiltradas = listaDeNotas.filter(n => n.categoria === filtroActual);
    }

    notesContainer.innerHTML = "";
    
    if (notasFiltradas.length === 0) {
        notesContainer.innerHTML = `<p class="col-span-full text-center text-gray-400 py-8 text-sm">No hay notas que mostrar.</p>`;
        return;
    }

    notasFiltradas.forEach((nota) => {
        const tarjetaHtml = `
            <div class="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 flex flex-col justify-between transition hover:shadow-lg relative">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <span class="px-2 py-1 text-xs font-semibold rounded-md ${obtenerColorCategoria(nota.categoria)}">
                            ${nota.categoria}
                        </span>
                        ${nota.importante ? '⭐' : ''}
                    </div>
                    <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2">${nota.titulo}</h3>
                    <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap mb-4">${nota.contenido}</p>
                </div>
                <div class="flex items-center justify-between text-xs text-gray-400 border-t pt-3 border-gray-100 dark:border-gray-700 mt-2">
                    <span>📅 ${nota.fecha || 'Sin fecha'}</span>
                    <button class="btn-eliminar text-red-500 hover:text-red-700 font-medium" data-id="${nota.id}">
                        Eliminar
                    </button>
                </div>
            </div>
        `;
        notesContainer.innerHTML += tarjetaHtml;
    });

    // Añadir eventos a los botones de borrar creados dinámicamente
    document.querySelectorAll(".btn-eliminar").forEach(boton => {
        boton.addEventListener("click", async (e) => {
            const idNota = e.target.getAttribute("data-id");
            if (confirm("¿Seguro que quieres borrar esta nota?")) {
                try {
                    await deleteDoc(doc(db, "notas", idNota));
                    cargarNotasDesdeNube();
                } catch (error) {
                    console.error("Error al eliminar:", error);
                }
            }
        });
    });
}

function obtenerColorCategoria(cat) {
    switch (cat) {
        case "Personal": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
        case "Escuela": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
        case "Trabajo": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
        default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
}

// ==========================================
// 7. MOTOR DEL BUSCADOR INTEGRADO (EN TIEMPO REAL)
// ==========================================
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const textoBuscar = e.target.value.toLowerCase().trim();
        
        // Filtra sobre la marcha buscando coincidencias en el título o contenido
        const notasFiltradasPorBusqueda = notasGlobales.filter(nota => {
            return nota.titulo.toLowerCase().includes(textoBuscar) || 
                   nota.contenido.toLowerCase().includes(textoBuscar);
        });
        
        renderizarNotas(notasFiltradasPorBusqueda);
    });
}

// ==========================================
// 8. FILTROS DE NAVEGACIÓN DE LA BARRA LATERAL
// ==========================================
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active", "bg-gray-100", "dark:bg-gray-700"));
        
        const botonSeleccionado = e.currentTarget;
        botonSeleccionado.classList.add("active", "bg-gray-100", "dark:bg-gray-700");
        
        filtroActual = botonSeleccionado.getAttribute("data-filter");
        renderizarNotas(notasGlobales);

        // En pantallas móviles, cierra el menú automáticamente después de elegir una categoría
        if (window.innerWidth < 768 && sidebar) {
            sidebar.classList.add("-translate-x-full");
        }
    });
});