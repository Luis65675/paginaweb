document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const registerSection = document.getElementById('register-section');
    const verifySection = document.getElementById('verify-section');
    const perfilSection = document.getElementById('perfil-section');
    const messageDiv = document.getElementById('message');

    let emailActual = '';

    // CONFIGURACIÓN DE WHATSAPP (Coloca tu número aquí en formato internacional sin +)
    const telefonoWhatsApp = "584120000000"; // <--- CAMBIA ESTE NÚMERO POR EL TUYO
    const mensajeWhatsApp = "¡Hola! Me interesa información sobre los trámites en Venezuela y desarrollo web que vi en tu perfil.";
    const btnWhatsapp = document.getElementById('btn-whatsapp');
    if (btnWhatsapp) {
        btnWhatsapp.href = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensajeWhatsApp)}`;
    }

    // 1. Manejo del Registro
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nombres = document.getElementById('nombres').value.trim();
            const apellidos = document.getElementById('apellidos').value.trim();
            const cedula = document.getElementById('cedula').value.trim();
            const telefono = document.getElementById('telefono').value.trim();
            emailActual = document.getElementById('email').value.trim();

            messageDiv.textContent = 'Enviando código de verificación...';
            messageDiv.style.color = '#818cf8';

            try {
                const response = await fetch('/api/registrar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombres, apellidos, cedula, telefono, email: emailActual })
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
                    messageDiv.textContent = '';
                    verifySection.classList.remove('active');
                    verifySection.classList.add('hidden');
                    perfilSection.classList.remove('hidden');
                    perfilSection.classList.add('active');
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
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            const val = index + 1;
            stars.forEach((s, i) => {
                if (i < val) {
                    s.style.color = '#f59e0b';
                } else {
                    s.style.color = '#475569';
                }
            });
            if (ratingStatus) {
                ratingStatus.textContent = `¡Gracias por tu calificación de ${val} estrellas!`;
            }
        });
    });

    // 4. Bandeja de Comentarios
    const formComentario = document.getElementById('form-comentario');
    const listaComentarios = document.getElementById('lista-comentarios');

    if (formComentario) {
        formComentario.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('nombre-comentario').value.trim();
            const texto = document.getElementById('texto-comentario').value.trim();

            if (nombre && texto) {
                const nuevoComentario = document.createElement('div');
                nuevoComentario.style.cssText = 'background: rgba(0,0,0,0.3); padding: 8px; border-radius: 8px; font-size: 11px; border: 1px solid rgba(255,255,255,0.05); margin-top: 6px;';
                nuevoComentario.innerHTML = `
                    <div style="font-weight: bold; color: #818cf8;">${escapeHtml(nombre)}</div>
                    <p style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(texto)}</p>
                `;
                listaComentarios.prepend(nuevoComentario);
                formComentario.reset();
            }
        });
    }

    function escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});