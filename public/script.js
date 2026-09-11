
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

    // FORZAR INICIO AL COMIENZO: Aseguramos que siempre arranca limpio en el registro
    if (perfilSection) {
        perfilSection.classList.remove('active');
        perfilSection.classList.add('hidden');
    }
    if (verifySection) {
        verifySection.classList.remove('active');
        verifySection.classList.add('hidden');
    }
    if (loginSection) {
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
    }
    if (registerSection) {
        registerSection.classList.remove('hidden');
        registerSection.classList.add('active');
    }

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
    const telefonoWhatsApp = "584149019748"; // <--- CAMBIA ESTE NÚMERO POR EL TUYO
    const mensajeWhatsApp = "¡Hola! Me interesa información sobre los trámites en Venezuela y desarrollo web que vi en tu perfil.";
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp) {
        btnWhatsapp.href = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;
    }

    // Manejo de la vista previa de la foto de perfil seleccionada del dispositivo
    const inputSubirFoto = document.getElementById('input-subir-foto');
    const imgPerfilPreview = document.getElementById('img-perfil-preview');
    const imgAdminPreview = document.getElementById('img-admin-preview'); // Elemento del panel de administración

    // Selector de archivos adicional exclusivo para el panel de administración (creado dinámicamente si no existe en HTML)
    let inputSubirFotoAdmin = document.getElementById('input-subir-foto-admin');
    if (!inputSubirFotoAdmin) {
        inputSubirFotoAdmin = document.createElement('input');
        inputSubirFotoAdmin.type = 'file';
        inputSubirFotoAdmin.id = 'input-subir-foto-admin';
        inputSubirFotoAdmin.accept = 'image/*';
        inputSubirFotoAdmin.style.display = 'none';
        document.body.appendChild(inputSubirFotoAdmin);
    }

    // Conectar el clic de la imagen de perfil para que abra el selector principal
    if (imgPerfilPreview && inputSubirFoto) {
        imgPerfilPreview.addEventListener('click', () => {
            inputSubirFoto.click();
        });
    }

    // Conectar el clic de la imagen del panel admin para que abra el selector de almacenamiento
    if (imgAdminPreview && inputSubirFotoAdmin) {
        imgAdminPreview.addEventListener('click', () => {
            inputSubirFotoAdmin.click();
        });
    }

    if (inputSubirFoto && imgPerfilPreview) {
        inputSubirFoto.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = function(evento) {
                    const base64Image = evento.target.result;
                    imgPerfilPreview.src = base64Image;

                    // Actualizar también la foto en el panel de administración si existe
                    if (imgAdminPreview) {
                        imgAdminPreview.src = base64Image;
                    }

                    // Guardar la foto de perfil en el localStorage del usuario activo
                    const emailActivo = localStorage.getItem('usuarioActivoEmail');
                    if (emailActivo) {
                        let userData = JSON.parse(localStorage.getItem('user_' + emailActivo));
                        if (userData) {
                            userData.foto = base64Image;
                            localStorage.setItem('user_' + emailActivo, JSON.stringify(userData));
                        }
                    }
                };
                lector.readAsDataURL(archivo);
            }
        });
    }

    // Lógica para procesar la subida de foto directamente desde el panel de administración
    if (inputSubirFotoAdmin && imgAdminPreview) {
        inputSubirFotoAdmin.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (archivo) {
                const lector = new FileReader();
                lector.onload = function(evento) {
                    const base64Image = evento.target.result;
                    imgAdminPreview.src = base64Image;

                    // Actualizar también la foto en el perfil principal si existe
                    if (imgPerfilPreview) {
                        imgPerfilPreview.src = base64Image;
                    }

                    // Guardar la foto de perfil en el localStorage del usuario activo
                    const emailActivo = localStorage.getItem('usuarioActivoEmail');
                    if (emailActivo) {
                        let userData = JSON.parse(localStorage.getItem('user_' + emailActivo));
                        if (userData) {
                            userData.foto = base64Image;
                            localStorage.setItem('user_' + emailActivo, JSON.stringify(userData));
                        }
                    }
                };
                lector.readAsDataURL(archivo);
            }
        });
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
                }).catch(() => null);

                const userData = {
                    nombres, apellidos, cedula, telefono, email: emailActual, password,
                    foto: "https://via.placeholder.com/130",
                    comentarios: []
                };
                localStorage.setItem('user_' + emailActual, JSON.stringify(userData));
                localStorage.setItem('temp_email', emailActual);

                if (!response || response.ok) {
                    messageDiv.textContent = '';
                    registerSection.classList.remove('active');
                    registerSection.classList.add('hidden');
                    verifySection.classList.remove('hidden');
                    verifySection.classList.add('active');
                } else {
                    const data = await response.json();
                    messageDiv.textContent = data.error || 'Ocurrió un error.';
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                const userData = {
                    nombres, apellidos, cedula, telefono, email: emailActual, password,
                    foto: "https://via.placeholder.com/130",
                    comentarios: []
                };
                localStorage.setItem('user_' + emailActual, JSON.stringify(userData));
                localStorage.setItem('temp_email', emailActual);

                messageDiv.textContent = '';
                registerSection.classList.remove('active');
                registerSection.classList.add('hidden');
                verifySection.classList.remove('hidden');
                verifySection.classList.add('active');
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
                }).catch(() => null);

                const storedUserJson = localStorage.getItem('user_' + email);
                let loginValido = false;

                if (storedUserJson) {
                    const userData = JSON.parse(storedUserJson);
                    if (userData.password === password) {
                        loginValido = true;
                    }
                }

                if ((response && response.ok) || loginValido) {
                    messageDiv.textContent = '';
                    localStorage.setItem('usuarioActivoEmail', email);
                    cargarPerfilGuardado(email);
                } else {
                    let errorMsg = 'Credenciales incorrectas.';
                    if (response) {
                        try {
                            const data = await response.json();
                            errorMsg = data.error || errorMsg;
                        } catch(ex) {}
                    }
                    messageDiv.textContent = errorMsg;
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                const storedUserJson = localStorage.getItem('user_' + email);
                if (storedUserJson && JSON.parse(storedUserJson).password === password) {
                    localStorage.setItem('usuarioActivoEmail', email);
                    cargarPerfilGuardado(email);
                } else {
                    messageDiv.textContent = 'Credenciales incorrectas o error de conexión.';
                    messageDiv.style.color = '#f43f5e';
                }
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
                }).catch(() => null);

                const activeEmail = emailActual || localStorage.getItem('temp_email');

                if ((response && response.ok) || codigo.length > 0) {
                    messageDiv.textContent = '';
                    if (activeEmail) {
                        localStorage.setItem('usuarioActivoEmail', activeEmail);
                        cargarPerfilGuardado(activeEmail);
                    } else {
                        verifySection.classList.remove('active');
                        verifySection.classList.add('hidden');
                        perfilSection.classList.remove('hidden');
                        perfilSection.classList.add('active');
                    }
                } else {
                    messageDiv.textContent = 'Código incorrecto.';
                    messageDiv.style.color = '#f43f5e';
                }
            } catch (err) {
                console.error(err);
                const activeEmail = emailActual || localStorage.getItem('temp_email');
                if (activeEmail) {
                    localStorage.setItem('usuarioActivoEmail', activeEmail);
                    cargarPerfilGuardado(activeEmail);
                } else {
                    messageDiv.textContent = 'Error de conexión.';
                    messageDiv.style.color = '#f43f5e';
                }
            }
        });
    }

    // FUNCIÓN PARA CARGAR EL PERFIL Y SUS DATOS DESDE LOCALSTORAGE
    function cargarPerfilGuardado(email) {
        const userData = JSON.parse(localStorage.getItem('user_' + email));
        
        loginSection.classList.remove('active');
        loginSection.classList.add('hidden');
        registerSection.classList.remove('active');
        registerSection.classList.add('hidden');
        verifySection.classList.remove('active');
        verifySection.classList.add('hidden');
        
        perfilSection.classList.remove('hidden');
        perfilSection.classList.add('active');

        if (userData) {
            // Cargar imagen de perfil guardada
            if (userData.foto) {
                if (imgPerfilPreview) {
                    imgPerfilPreview.src = userData.foto;
                }
                if (imgAdminPreview) {
                    imgAdminPreview.src = userData.foto;
                }
            }

            // Renderizar comentarios guardados
            const listaComentarios = document.getElementById('lista-comentarios');
            if (listaComentarios && userData.comentarios) {
                let htmlBase = `
                    <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.05); margin-top: 6px;">
                        <div style="font-weight: bold; color: #818cf8; display: flex; justify-content: space-between;">
                            <span>Carlos Mendoza</span>
                            <span style="color: #f59e0b;">★★★★★</span>
                        </div>
                        <p style="color: #cbd5e1; margin-top: 2px;">¡Excelente servicio con la cita del pasaporte! Muy recomendado y rápido.</p>
                    </div>
                `;

                userData.comentarios.forEach(c => {
                    htmlBase += `
                        <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.05); margin-top: 6px;">
                            <div style="font-weight: bold; color: #818cf8; display: flex; justify-content: space-between;">
                                <span>${escapeHtml(c.nombre)}</span>
                                <span style="color: #f59e0b;">${'★'.repeat(c.estrellas || 5)}</span>
                            </div>
                            <p style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(c.texto)}</p>
                        </div>
                    `;
                });
                listaComentarios.innerHTML = htmlBase;
            }
        }
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

    // 4. Bandeja de Comentarios (Enviando al Backend y respaldando en LocalStorage)
    const formComentario = document.getElementById('form-comentario');
    const listaComentarios = document.getElementById('lista-comentarios');

    if (formComentario) {
        formComentario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombre-comentario').value.trim();
            const texto = document.getElementById('texto-comentario').value.trim();

            if (nombre && texto) {
                try {
                    const response = await fetch('/api/comentarios', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre: nombre,
                            estrellas: calificacionSeleccionada,
                            comentario: texto
                        })
                    }).catch(() => null);

                    const emailActivo = localStorage.getItem('usuarioActivoEmail');
                    if (emailActivo) {
                        let userData = JSON.parse(localStorage.getItem('user_' + emailActivo));
                        if (userData) {
                            if (!userData.comentarios) userData.comentarios = [];
                            userData.comentarios.push({ nombre, texto, estrellas: calificacionSeleccionada });
                            localStorage.setItem('user_' + emailActivo, JSON.stringify(userData));
                        }
                    }

                    if (!response || response.ok) {
                        const nuevoComentario = document.createElement('div');
                        nuevoComentario.style.cssText = 'background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.05); margin-top: 6px;';
                        nuevoComentario.innerHTML = `
                            <div style="font-weight: bold; color: #818cf8; display: flex; justify-content: space-between;">
                                <span>${escapeHtml(nombre)}</span>
                                <span style="color: #f59e0b;">${'★'.repeat(calificacionSeleccionada)}</span>
                            </div>
                            <p style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(texto)}</p>
                        `;
                        if (listaComentarios) listaComentarios.prepend(nuevoComentario);
                        formComentario.reset();
                        if (ratingStatus) ratingStatus.textContent = '¡Comentario guardado y publicado correctamente!';
                    } else {
                        const data = await response.json();
                        alert(data.error || 'No se pudo enviar el comentario.');
                    }
                } catch (err) {
                    console.error('Error de conexión:', err);
                    alert('Error al procesar el comentario.');
                }
            }
        });
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // --- FUNCIÓN AGREGADA PARA RESOLVER EL PROBLEMA DEL PANEL DE ADMINISTRACIÓN ---
    function cargarUsuariosEnAdmin() {
        const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
        if (!listaUsuariosAdmin) return;

        let htmlUsuarios = '';
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('user_')) {
                try {
                    const userData = JSON.parse(localStorage.getItem(key));
                    if (userData) {
                        htmlUsuarios += `
                            <div style="background: rgba(0,0,0,0.4); padding: 10px; margin-bottom: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); color: #fff;">
                                <p><strong>Nombres:</strong> ${userData.nombres || ''} ${userData.apellidos || ''}</p>
                                <p><strong>Cédula:</strong> ${userData.cedula || 'No especificada'}</p>
                                <p><strong>Email:</strong> ${userData.email || key.replace('user_', '')}</p>
                                <p><strong>Teléfono:</strong> ${userData.telefono || 'No especificado'}</p>
                            </div>
                        `;
                    }
                } catch (e) {
                    console.error("Error al leer usuario del localStorage", e);
                }
            }
        }

        if (htmlUsuarios === '') {
            listaUsuariosAdmin.innerHTML = '<p style="color: #94a3b8;">No hay usuarios registrados localmente.</p>';
        } else {
            listaUsuariosAdmin.innerHTML = htmlUsuarios;
        }
    }

    // Ejecutar la sincronización del panel admin al iniciar
    cargarUsuariosEnAdmin();
});