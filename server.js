require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Conexión y creación de la base de datos SQLite (archivo local 'database.sqlite')
const dbFile = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error de conexión a la base de datos SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite correctamente.');
        // Crear la tabla de usuarios si no existe
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombres TEXT NOT NULL,
            apellidos TEXT NOT NULL,
            cedula TEXT UNIQUE NOT NULL,
            telefono TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            codigoVerificacion TEXT,
            verificado INTEGER DEFAULT 0
        )`);
    }
});

// Configurar Nodemailer con tus credenciales
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Ruta 1: Registrar usuario preliminar y enviar código
app.post('/api/registrar', (req, res) => {
    const { nombres, apellidos, cedula, telefono, email } = req.body;
    
    // Generar código aleatorio de 6 dígitos
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    // Buscar si el usuario ya existe por email
    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Hubo un error al procesar el registro.' });
        }

        if (user) {
            if (user.verificado === 1) {
                return res.status(400).json({ error: 'Este correo ya está registrado y verificado.' });
            }
            // Actualizar datos si el correo no estaba verificado aún
            const updateQuery = `UPDATE users SET nombres = ?, apellidos = ?, cedula = ?, telefono = ?, codigoVerificacion = ? WHERE email = ?`;
            db.run(updateQuery, [nombres, apellidos, cedula, telefono, codigoVerificacion, email], function(updateErr) {
                if (updateErr) {
                    if (updateErr.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'La cédula ya se encuentra registrada en el sistema.' });
                    }
                    return res.status(500).json({ error: 'Error al actualizar el registro.' });
                }
                enviarCorreo(email, nombres, codigoVerificacion, res);
            });
        } else {
            // Crear nuevo registro pendiente de verificar
            const insertQuery = `INSERT INTO users (nombres, apellidos, cedula, telefono, email, codigoVerificacion, verificado) VALUES (?, ?, ?, ?, ?, ?, 0)`;
            db.run(insertQuery, [nombres, apellidos, cedula, telefono, email, codigoVerificacion], function(insertErr) {
                if (insertErr) {
                    if (insertErr.message.includes('UNIQUE constraint failed')) {
                        if (insertErr.message.includes('cedula')) {
                            return res.status(400).json({ error: 'La cédula ya se encuentra registrada en el sistema.' });
                        }
                        return res.status(400).json({ error: 'El correo electrónico ya se encuentra registrado en el sistema.' });
                    }
                    return res.status(500).json({ error: 'Error al guardar el usuario.' });
                }
                enviarCorreo(email, nombres, codigoVerificacion, res);
            });
        }
    });
});

// Función auxiliar para enviar el correo
function enviarCorreo(email, nombres, codigoVerificacion, res) {
    transporter.sendMail({
        from: `"Sistema de Registro" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Tu Código de Verificación',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 25px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                <h2 style="color: #818cf8; margin-top: 0;">¡Hola, ${nombres}!</h2>
                <p style="font-size: 15px; color: #94a3b8;">Estás a un paso de completar tu registro. Utiliza el siguiente código de verificación:</p>
                <div style="background: #1e293b; border: 1px solid #334155; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #818cf8; letter-spacing: 6px;">${codigoVerificacion}</span>
                </div>
                <p style="font-size: 13px; color: #64748b;">Si no solicitaste este código, puedes ignorar este mensaje.</p>
            </div>
        `
    }, (mailErr) => {
        if (mailErr) {
            console.error(mailErr);
            return res.status(500).json({ error: 'No se pudo enviar el correo de verificación.' });
        }
        res.json({ success: true, message: 'Código de verificación enviado al correo.' });
    });
}

// Ruta 2: Verificar el código
app.post('/api/verificar', (req, res) => {
    const { email, codigo } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error al verificar el código.' });
        }

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        if (user.codigoVerificacion === codigo) {
            db.run(`UPDATE users SET verificado = 1, codigoVerificacion = NULL WHERE email = ?`, [email], (updateErr) => {
                if (updateErr) {
                    return res.status(500).json({ error: 'Error al actualizar el estado de verificación.' });
                }
                return res.json({ success: true, message: '¡Cuenta verificada y registrada con éxito!' });
            });
        } else {
            return res.status(400).json({ error: 'El código de verificación es incorrecto.' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));