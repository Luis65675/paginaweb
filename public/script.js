document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const verifyForm = document.getElementById('verify-form');
    
    const registerSection = document.getElementById('register-section');
    const loginSection = document.getElementById('login-section');
    const verifySection = document.getElementById('verify-section');
    const perfilSection = document.getElementById('perfil-section');
    
    const messageDiv = document.getElementById('message');

    // Enlaces para alternar entre Registro y Login
    const showLogin = document.getElementById('show-login');
    const showRegister = document.getElementById('show-register');

    if (showLogin) {
        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.remove('active');
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            loginSection.classList.add('active');
            messageDiv.textContent = '';
        });
    }

    if (showRegister) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginSection.classList.remove('active');
            loginSection.classList.add('hidden');
            registerSection.classList.remove('hidden');
            registerSection.classList.add('active');
            messageDiv.textContent = '';
        });
    }

    let emailActual = '';

    // CONFIGURACIÓN DE WHATSAPP (Coloca tu número aquí en formato internacional sin +)
    const telefonoWhatsApp = "584120000000"; // <--- CAMBIA ESTE NÚMERO POR EL TUYO
    const mensajeWhatsApp = "¡Hola! Me interesa información sobre los trámites en Venezuela y desarrollo web que vi en tu perfil.";
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp) {
        btnWhatsapp.href = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;
    }

    // 1. Manejo del Registro (Con contraseña agregada)
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombres = document.getElementById('nombres').value.trim();
            const apellidos = document.getElementById('apellidos').value.trim();
            const cedula = document.getElementById('cedula').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            emailActual = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            messageDiv.textContent = 'Enviando código de verificación...';
            messageDiv.style.color = '#818cf8';

            try {
                const response = await fetch('/api/registrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombres, apellidos, cedula, telefono, email: emailActual, password })
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = '';
                    registerSection.classList.remove('active');
                    registerSection.classList.add('hidden');
                    verifySection.classList.remove('hidden');
                    verifySection.classList.add('active');
                } else {
                    messageDiv.textContent = data.error || 'Ocurrió un error.';
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                messageDiv.textContent = 'Error de conexión con el servidor.';
                messageDiv.style.color = '#f43f5e';
            }
        });
    }

    // 1.1 Manejo del Inicio de Sesión (Login)
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value.trim();

            messageDiv.textContent = 'Iniciando sesión...';
            messageDiv.style.color = '#818cf8';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    // Guardamos el correo del usuario logueado en localStorage para validar sus comentarios
                    if (data.usuario && data.usuario.email) {
                        localStorage.setItem('usuarioLogueado', data.usuario.email);
                    }
                    messageDiv.textContent = '';
                    loginSection.classList.remove('active');
                    loginSection.classList.add('hidden');
                    perfilSection.classList.remove('hidden');
                    perfilSection.classList.add('active');
                    cargarComentariosPublicos(); // Actualiza la lista al iniciar sesión para mostrar botones propios
                } else {
                    messageDiv.textContent = data.error || 'Credenciales incorrectas.';
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                messageDiv.textContent = 'Error de conexión con el servidor.';
                messageDiv.style.color = '#f43f5e';
            }
        });
    }

    // 2. Manejo de Verificación
    if (verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const codigo = document.getElementById('codigo').value.trim();

            messageDiv.textContent = 'Verificando cuenta...';
            messageDiv.style.color = '#818cf8';

            try {
                const response = await fetch('/api/verificar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: emailActual, codigo })
                });

                const data = await response.json();

                if (response.ok) {
                    // Guardamos el correo tras verificar con éxito
                    if (emailActual) {
                        localStorage.setItem('usuarioLogueado', emailActual);
                    }
                    messageDiv.textContent = '';
                    verifySection.classList.remove('active');
                    verifySection.classList.add('hidden');
                    perfilSection.classList.remove('hidden');
                    perfilSection.classList.add('active');
                    cargarComentariosPublicos();
                } else {
                    messageDiv.textContent = data.error || 'Código incorrecto.';
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                messageDiv.textContent = 'Error de conexión.';
                messageDiv.style.color = '#f43f5e';
            }
        });
    }

    // 3. Sistema de Calificación con Estrellas
    const stars = document.querySelectorAll('#star-container i');
    const ratingStatus = document.getElementById('rating-status');
    let calificacionSeleccionada = 5; // Por defecto 5 estrellas

    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            calificacionSeleccionada = index + 1;
            stars.forEach((s, i) => {
                if (i < calificacionSeleccionada) {
                    s.style.color = '#f59e0b';
                } else {
                    s.style.color = '#475569';
                }
            });
            if (ratingStatus) {
                ratingStatus.textContent = `Puntuación seleccionada: ${calificacionSeleccionada} estrellas. (Se guardará al enviar tu comentario)`;
            }
        });
    });

    // 4. Bandeja de Comentarios (Enviando directo al Backend / Administrador con user_email)
    const formComentario = document.getElementById('form-comentario');
    const listaComentarios = document.getElementById('lista-comentarios');

    if (formComentario) {
        formComentario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombre-comentario').value.trim();
            const texto = document.getElementById('texto-comentario').value.trim();
            const user_email = localStorage.getItem('usuarioLogueado') || null;

            if (nombre && texto) {
                try {
                    const response = await fetch('/api/comentarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre: nombre,
                            estrellas: calificacionSeleccionada,
                            comentario: texto,
                            user_email: user_email
                        })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        formComentario.reset();
                        if (ratingStatus) ratingStatus.textContent = '¡Comentario enviado al administrador correctamente!';
                        cargarComentariosPublicos(); // Recarga la lista completa desde el servidor con el botón de borrar si aplica
                    } else {
                        alert(data.error || 'No se pudo enviar el comentario.');
                    }
                } catch (err) {
                    console.error('Error de conexión:', err);
                    alert('Error de conexión con el servidor.');
                }
            }
        });
    }

    // Función para cargar y mostrar los comentarios con opción de borrar si el usuario es dueño
    async function cargarComentariosPublicos() {
        if (!listaComentarios) return;
        try {
            const response = await fetch('/api/admin/comentarios');
            const data = await response.json();
            const usuarioActual = localStorage.getItem('usuarioLogueado');

            if (response.ok && data.success) {
                listaComentarios.innerHTML = '';
                data.comentarios.forEach(c => {
                    const esPropio = usuarioActual && c.user_email === usuarioActual;

                    const nuevoComentario = document.createElement('div');
                    nuevoComentario.style.cssText = 'background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.05); margin-top: 6px;';
                    nuevoComentario.innerHTML = `
                        <div style="font-weight: bold; color: #818cf8; display: flex; justify-content: space-between;">
                            <span>${escapeHtml(c.nombre)}</span>
                            <span style="color: #f59e0b;">${'★'.repeat(c.estrellas || 0)}</span>
                        </div>
                        <p style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(c.comentario)}</p>
                        ${esPropio ? `<button onclick="borrarMiComentario(${c.id})" style="background: #f43f5e; color: white; border: none; padding: 3px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; margin-top: 5px;"><i class="fa-solid fa-trash"></i> Borrar mi comentario</button>` : ''}
                    `;
                    listaComentarios.appendChild(nuevoComentario);
                });
            }
        } catch (err) {
            console.error('Error al cargar comentarios:', err);
        }
    }

    // Llamada global para que los comentarios se carguen al abrir la página
    cargarComentariosPublicos();

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});

// Función global fuera del DOM para que el botón generado dinámicamente pueda llamarla
async function borrarMiComentario(id) {
    if (confirm('¿Deseas eliminar tu comentario?')) {
        try {
            const response = await fetch(`/api/admin/comentarios/${id}`, { method: 'DELETE' });
            if (response.ok) {
                // Recargamos la página o dispararíamos la recarga de comentarios de forma sencilla
                location.reload(); 
            } else {
                alert('No se pudo eliminar el comentario.');
            }
        } catch (err) {
            console.error(err);
            alert('Error de conexión.');
        }
    }
}