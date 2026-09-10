require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const dns = require('dns');

// Forzar IPv4 para evitar el error ENETUNREACH en Render
dns.setDefaultResultOrder('ipv4first');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Configurar Nodemailer usando IP IPv4 directa de Google para evitar errores de red en Render
const transporter = nodemailer.createTransport({
    host: '142.250.150.108',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER, // Usa variables de entorno para mayor seguridad
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        servername: 'smtp.gmail.com' // Obligatorio para validar el certificado SSL con la IP
    }
});

// Conexión a la base de datos SQLite (archivo local)
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Error al conectar con SQLite:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
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

// Ruta 1: Registro y envío de código
app.post('/api/registrar', (req, res) => {
    const { nombres, apellidos, cedula, telefono, email } = req.body;
    const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Error en la base de datos.' });
        }

        if (user) {
            if (user.verificado === 1) {
                return res.status(400).json({ error: 'Este correo ya está registrado y verificado.' });
            }
            const updateQuery = `UPDATE users SET nombres = ?, apellidos = ?, cedula = ?, telefono = ?, codigoVerificacion = ? WHERE email = ?`;
            db.run(updateQuery, [nombres, apellidos, cedula, telefono, codigoVerificacion, email], function(updateErr) {
                if (updateErr) {
                    if (updateErr.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'La cédula ya se encuentra registrada.' });
                    }
                    return res.status(500).json({ error: 'Error al actualizar el usuario.' });
                }
                enviarCorreo(email, nombres, codigoVerificacion, res);
            });
        } else {
            const insertQuery = `INSERT INTO users (nombres, apellidos, cedula, telefono, email, codigoVerificacion, verificado) VALUES (?, ?, ?, ?, ?, ?, 0)`;
            db.run(insertQuery, [nombres, apellidos, cedula, telefono, email, codigoVerificacion], function(insertErr) {
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
});

// Función auxiliar para enviar el correo usando Nodemailer
async function enviarCorreo(email, nombres, codigoVerificacion, res) {
    try {
        const mailOptions = {
            from: `"Sistema de Registro" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Tu Código de Verificación',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 25px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
                    <h2 style="color: #818cf8; margin-top: 0;">¡Hola, ${nombres}!</h2>
                    <p style="font-size: 15px; color: #94a3b8;">Utiliza el siguiente código de verificación:</p>
                    <div style="background: #1e293b; border: 1px solid #334155; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; color: #818cf8; letter-spacing: 6px;">${codigoVerificacion}</span>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Código de verificación enviado.' });
    } catch (err) {
        console.error('Excepción al enviar correo:', err);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));