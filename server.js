require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs'); // Agregado para encriptar y verificar contraseñas de forma segura

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Conexión a la base de datos SQLite (archivo local)
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombres TEXT NOT NULL,
                apellidos TEXT NOT NULL,
                cedula TEXT UNIQUE NOT NULL,
                telefono TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                codigoVerificacion TEXT,
                verificado INTEGER DEFAULT 0
            )`);

            // Tabla agregada para guardar los comentarios, calificaciones de estrellas y el correo del usuario
            db.run(`CREATE TABLE IF NOT EXISTS comentarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                estrellas INTEGER,
                comentario TEXT NOT NULL,
                user_email TEXT,
                fecha DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
        });
    }
});

// Ruta 1: Registro y envío de código (ahora recibe y encripta la contraseña)
app.post('/api/registrar', async (req, res) => {
    const { nombres, apellidos, cedula, telefono, email, password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'La contraseña es obligatoria.' });
    }

    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Error en la base de datos.' });
            }

            if (user) {
                if (user.verificado === 1) {
                    return res.status(400).json({ error: 'Este correo ya está registrado y verificado.' });
                }
                const updateQuery = `UPDATE users SET nombres = ?, apellidos = ?, cedula = ?, telefono = ?, password = ?, codigoVerificacion = ? WHERE email = ?`;
                db.run(updateQuery, [nombres, apellidos, cedula, telefono, hashedPassword, codigoVerificacion, email], function(updateErr) {
                    if (updateErr) {
                        if (updateErr.message.includes('UNIQUE constraint failed')) {
                            return res.status(400).json({ error: 'La cédula ya se encuentra registrada.' });
                        }
                        return res.status(500).json({ error: 'Error al actualizar el usuario.' });
                    }
                    enviarCorreo(email, nombres, codigoVerificacion, res);
                });
            } else {
                const insertQuery = `INSERT INTO users (nombres, apellidos, cedula, telefono, email, password, codigoVerificacion, verificado) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`;
                db.run(insertQuery, [nombres, apellidos, cedula, telefono, email, hashedPassword, codigoVerificacion], function(insertErr) {
                    if (insertErr) {
                        if (insertErr.message.includes('UNIQUE constraint failed')) {
                            if (insertErr.message.includes('cedula')) {
                                return res.status(400).json({ error: 'La cédula ya está registrada.' });
                            }
                            return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
                        }
                        return res.status(500).json({ error: 'Error al guardar el usuario.' });
                    }
                    enviarCorreo(email, nombres, codigoVerificacion, res);
                });
            }
        });
    } catch (hashErr) {
        console.error('Error al procesar la contraseña:', hashErr);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Ruta nueva: Iniciar sesión (Login)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Por favor, ingresa el correo y la contraseña.' });
    }

    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error en la base de datos.' });
        }

        if (!user) {
            return res.status(404).json({ error: 'El correo electrónico no está registrado.' });
        }

        if (user.verificado !== 1) {
            return res.status(400).json({ error: 'Debes verificar tu cuenta con el código enviado a tu correo antes de iniciar sesión.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Contraseña incorrecta.' });
        }

        return res.json({
            success: true,
            message: '¡Inicio de sesión exitoso!',
            usuario: {
                id: user.id,
                nombres: user.nombres,
                apellidos: user.apellidos,
                email: user.email
            }
        });
    });
});

// Función para enviar correo mediante la API HTTP de Brevo (Evita el bloqueo de Render)
async function enviarCorreo(email, nombres, codigoVerificacion, res) {
    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { email: process.env.EMAIL_USER, name: "Sistema de Registro" },
                to: [{ email: email, name: nombres }],
                subject: 'Tu Código de Verificación',
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; padding: 25px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                        <h2 style="color: #818cf8; margin-top: 0;">¡Hola, ${nombres}!</h2>
                        <p style="font-size: 15px; color: #94a3b8;">Utiliza el siguiente código de verificación:</p>
                        <div style="background: #1e293b; border: 1px solid #334155; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #818cf8; letter-spacing: 6px;">${codigoVerificacion}</span>
                        </div>
                    </div>
                `
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Error de Brevo API:', data);
            return res.status(500).json({ error: 'No se pudo enviar el correo.' });
        }

        res.json({ success: true, message: 'Código de verificación enviado.' });
    } catch (err) {
        console.error('Excepción al enviar correo con Brevo:', err);
        return res.status(500).json({ error: 'No se pudo enviar el correo.' });
    }
}

// Ruta 2: Verificación de código
app.post('/api/verificar', (req, res) => {
    const { email, codigo } = req.body;
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error al verificar.' });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (user.codigoVerificacion === codigo) {
            db.run(`UPDATE users SET verificado = 1, codigoVerificacion = NULL WHERE email = ?`, [email], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: 'Error al actualizar.' });
                return res.json({ success: true, message: '¡Cuenta verificada con éxito!' });
            });
        } else {
            return res.status(400).json({ error: 'Código incorrecto.' });
        }
    });
});

// Ruta nueva: Guardar comentarios y puntuación de estrellas (ahora recibe user_email)
app.post('/api/comentarios', (req, res) => {
    const { nombre, estrellas, comentario, user_email } = req.body;

    if (!nombre || !comentario) {
        return res.status(400).json({ error: 'El nombre y el comentario son obligatorios.' });
    }

    const query = `INSERT INTO comentarios (nombre, estrellas, comentario, user_email) VALUES (?, ?, ?, ?)`;
    db.run(query, [nombre, estrellas || 0, comentario, user_email || null], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al guardar el comentario.' });
        }
        res.json({ success: true, message: '¡Comentario enviado al panel del administrador con éxito!' });
    });
});

// Ruta nueva: Administración - Obtener todos los comentarios y puntuaciones
app.get('/api/admin/comentarios', (req, res) => {
    db.all(`SELECT * FROM comentarios ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los comentarios.' });
        }
        res.json({ success: true, comentarios: rows });
    });
});

// Ruta 3: Administración - Obtener todos los usuarios registrados
app.get('/api/admin/usuarios', (req, res) => {
    db.all(`SELECT id, nombres, apellidos, cedula, telefono, email, verificado FROM users`, [], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al obtener los usuarios.' });
        }
        res.json({ success: true, usuarios: rows });
    });
});

// Ruta 4: Administración - Eliminar un usuario por su ID
app.delete('/api/admin/usuarios/:id', (req, res) => {
    const userId = req.params.id;
    db.run(`DELETE FROM users WHERE id = ?`, [userId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar el usuario.' });
        }
        res.json({ success: true, message: 'Usuario eliminado con éxito.' });
    });
});

// Ruta 5: Administración - Eliminar un comentario por su ID
app.delete('/api/admin/comentarios/:id', (req, res) => {
    const comentarioId = req.params.id;
    db.run(`DELETE FROM comentarios WHERE id = ?`, [comentarioId], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al eliminar el comentario.' });
        }
        res.json({ success: true, message: 'Comentario eliminado con éxito.' });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));