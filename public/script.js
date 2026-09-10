let userEmail = '';

const registerForm = document.getElementById('register-form');
const verifyForm = document.getElementById('verify-form');
const registerSection = document.getElementById('register-section');
const verifySection = document.getElementById('verify-section');
const messageDiv = document.getElementById('message');
const btnRegister = document.getElementById('btn-register');
const btnVerify = document.getElementById('btn-verify');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombres = document.getElementById('nombres').value;
    const apellidos = document.getElementById('apellidos').value;
    const cedula = document.getElementById('cedula').value;
    const telefono = document.getElementById('telefono').value;
    userEmail = document.getElementById('email').value;

    messageDiv.style.color = '#94a3b8';
    messageDiv.textContent = 'Enviando código de verificación...';
    btnRegister.disabled = true;

    try {
        const response = await fetch('/api/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombres, apellidos, cedula, telefono, email: userEmail })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.textContent = '';
            registerSection.classList.add('hidden');
            verifySection.classList.remove('hidden');
        } else {
            messageDiv.style.color = '#f87171';
            messageDiv.textContent = data.error;
        }
    } catch (error) {
        messageDiv.style.color = '#f87171';
        messageDiv.textContent = 'Error de conexión con el servidor.';
    } finally {
        btnRegister.disabled = false;
    }
});

verifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const codigo = document.getElementById('codigo').value;

    messageDiv.style.color = '#94a3b8';
    messageDiv.textContent = 'Verificando código...';
    btnVerify.disabled = true;

    try {
        const response = await fetch('/api/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, codigo })
        });

        const data = await response.json();

        if (response.ok) {
            messageDiv.style.color = '#4ade80';
            messageDiv.textContent = data.message;
            verifyForm.reset();
        } else {
            messageDiv.style.color = '#f87171';
            messageDiv.textContent = data.error;
        }
    } catch (error) {
        messageDiv.style.color = '#f87171';
        messageDiv.textContent = 'Error de conexión con el servidor.';
    } finally {
        btnVerify.disabled = false;
    }
});