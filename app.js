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
    doc,
    orderBy
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

let usuarioActual = null;
let modoRegistro = false;
let filtroActual = "all";

// ==========================================
// 2. CAPTURA DE ELEMENTOS DEL DOM (TU HTML)
// ==========================================
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");
const authForm = document.getElementById("auth-form");
const registerFields = document.getElementById("register-fields");
const authSubtitle = document.getElementById("auth-subtitle");
const authToggleText = document.getElementById("auth-toggle-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const submitBtn = authForm.querySelector("button[type='submit']");

// Inputs de Autenticación
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const userDisplayName = document.getElementById("user-display-name");
const logoutBtn = document.getElementById("logout-btn");

// Contenedor de Notas y Estadísticas
const notesContainer = document.getElementById("notes-container");
const statTotal = document.getElementById("stat-total");
const statImportant = document.getElementById("stat-important");

// Modal de Notas e Inputs
const noteModal = document.getElementById("note-modal");
const newNoteBtn = document.getElementById("new-note-btn");
const cancelNoteBtn = document.getElementById("cancel-note-btn");
const saveNoteBtn = document.getElementById("save-note-btn");
const noteTitle = document.getElementById("note-title");
const noteContent = document.getElementById("note-content");
const noteCategory = document.getElementById("note-category");
const noteDate = document.getElementById("note-date");

// Botones de Estado internos de la Nota
let notaEsImportante = false;
const toggleStarBtn = document.getElementById("toggle-star-btn");
const starIcon = document.getElementById("star-icon");

// ==========================================
// 3. CONTROL DE LA INTERFAZ VISUAL (MODALES Y VISTAS)
// ==========================================

// Alternar entre Iniciar Sesión y Registrarse
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

// Abrir Modal para Nueva Nota
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

// Cerrar Modal
cancelNoteBtn.addEventListener("click", cerrarModalNotas);
function cerrarModalNotas() {
    noteModal.classList.add("opacity-0");
    setTimeout(() => noteModal.classList.add("hidden"), 300);
}

// Marcar como Importante dentro del Modal
toggleStarBtn.addEventListener("click", (e) => {
    e.preventDefault();
    notaEsImportante = !notaEsImportante;
    if (notaEsImportante) {
        starIcon.classList.replace("text-gray-400", "text-yellow-500");
    } else {
        starIcon.classList.replace("text-yellow-500", "text-gray-400");
    }
});

// ==========================================
// 4. LÓGICA DE PROCESOS DE USUARIOS (FIREBASE AUTH)
// ==========================================

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

// Monitorear si el usuario está dentro o fuera
onAuthStateChanged(auth, (user) => {
    if (user) {
        usuarioActual = user;
        userDisplayName.textContent = user.displayName || "Usuario";
        authView.classList.add("hidden");
        appView.classList.remove("hidden");
        cargarNotasDesdeNube();
    } else {
        usuarioActual = null;
        appView.classList.add("hidden");
        authView.classList.remove("hidden");
        notesContainer.innerHTML = "";
    }
    // Inicializa los iconos visuales (Lucide) en las nuevas vistas
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// ==========================================
// 5. MANEJO DE NOTAS EN LA NUBE (FIRESTORE)
// ==========================================

// Guardar Nota en la base de datos
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
        cerrarModalNotas();
        cargarNotasDesdeNube();
    } catch (error) {
        console.error("Error al guardar nota: ", error);
    }
});

// Cargar y Renderizar Notas con Filtros
async function cargarNotasDesdeNube() {
    if (!usuarioActual || !notesContainer) return;

    try {
        const q = query(collection(db, "notas"), where("userId", "==", usuarioActual.uid));
        const querySnapshot = await getDocs(q);
        
        let notas = [];
        let contadorImportantes = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.importante) contadorImportantes++;
            notas.push({ id: docSnap.id, ...data });
        });

        // Actualizar los paneles de estadísticas superiores
        statTotal.textContent = notas.length;
        statImportant.textContent = contadorImportantes;

        // Filtrar dinámicamente según la navegación seleccionada
        let notasFiltradas = notas;
        if (filtroActual === "important") {
            notasFiltradas = notas.filter(n => n.importante);
        } else if (filtroActual !== "all") {
            notasFiltradas = notas.filter(n => n.categoria === filtroActual);
        }

        // Pintar las tarjetas directamente en el "notes-container"
        notesContainer.innerHTML = "";
        
        if (notasFiltradas.length === 0) {
            notesContainer.innerHTML = `<p class="col-span-full text-center text-gray-400 py-8 text-sm">No hay notas que mostrar en este filtro.</p>`;
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
                            ${nota.importante ? '⚠️' : ''}
                        </div>
                        <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100 mb-2">${nota.titulo}</h3>
                        <p class="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap mb-4">${nota.contenido}</p>
                    </div>
                    <div class="flex items-center justify-between text-xs text-gray-400 border-t pt-3 border-gray-100 dark:border-gray-700 mt-2">
                        <span>📅 ${nota.fecha || 'Sin fecha'}</span>
                        <button class="btn-eliminar text-red-500 hover:text-red-700 font-medium flex items-center gap-1" data-id="${nota.id}">
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
            notesContainer.innerHTML += tarjetaHtml;
        });

        // Asignar los eventos de borrado dinámicamente a cada botón creado
        document.querySelectorAll(".btn-eliminar").forEach(boton => {
            boton.addEventListener("click", (e) => {
                const idNota = e.target.getAttribute("data-id");
                eliminarNota(idNota);
            });
        });

    } catch (error) {
        console.error("Error cargando notas: ", error);
    }
}

// Función para borrar de la Base de Datos
async function eliminarNota(idNota) {
    if (confirm("¿Seguro que quieres borrar esta nota?")) {
        try {
            await deleteDoc(doc(db, "notas", idNota));
            cargarNotasDesdeNube();
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    }
}

// Helper para dar colores a los badges de categorías
function obtenerColorCategoria(cat) {
    switch (cat) {
        case "Personal": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
        case "Escuela": return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
        case "Trabajo": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
        default: return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
}

// ==========================================
// 6. CONTROLADORES DE LOS BOTONES DEL MENÚ IZQUIERDO
// ==========================================
document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active", "bg-gray-100", "dark:bg-gray-700"));
        
        const botonSeleccionado = e.currentTarget;
        botonSeleccionado.classList.add("active", "bg-gray-100", "dark:bg-gray-700");
        
        filtroActual = botonSeleccionado.getAttribute("data-filter");
        cargarNotasDesdeNube();
    });
});