require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Conectado a la base de datos correctamente'))
  .catch(err => console.error('Error de conexión a la base de datos:', err));

// Esquema de Usuario
const userSchema = new mongoose.Schema({
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    cedula: { type: String, required: true, unique: true },
    telefono: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    codigoVerificacion: { type: String },
    verificado: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Configurar Nodemailer con tus credenciales
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Ruta 1: Registrar usuario preliminar y enviar código
app.post('/api/registrar', async (req, res) => {
    try {
        const { nombres, apellidos, cedula, telefono, email } = req.body;
        
        // Generar código aleatorio de 6 dígitos
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        let user = await User.findOne({ email });

        if (user) {
            if (user.verificado) {
                return res.status(400).json({ error: 'Este correo ya está registrado y verificado.' });
            }
            // Actualizar datos si el correo no estaba verificado aún
            user.nombres = nombres;
            user.apellidos = apellidos;
            user.cedula = cedula;
            user.telefono = telefono;
            user.codigoVerificacion = codigoVerificacion;
            await user.save();
        } else {
            // Crear nuevo registro pendiente de verificar
            user = new User({ nombres, apellidos, cedula, telefono, email, codigoVerificacion });
            await user.save();
        }

        // Enviar correo electrónico
        await transporter.sendMail({
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
        });

        res.json({ success: true, message: 'Código de verificación enviado al correo.' });
    } catch (error) {
        console.error(error);
        // Manejar errores de campos duplicados (MongoDB Error 11000)
        if (error.code === 11000) {
            const campoDuplicado = Object.keys(error.keyPattern)[0];
            const nombreCampo = campoDuplicado === 'cedula' ? 'cédula' : 'correo electrónico';
            return res.status(400).json({ error: `La ${nombreCampo} ya se encuentra registrada en el sistema.` });
        }
        res.status(500).json({ error: 'Hubo un error al procesar el registro.' });
    }
});

// Ruta 2: Verificar el código
app.post('/api/verificar', async (req, res) => {
    try {
        const { email, codigo } = req.body;
        const user = await User.findOne({ email });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        if (user.codigoVerificacion === codigo) {
            user.verificado = true;
            user.codigoVerificacion = null; // Limpiar código tras verificación exitosa
            await user.save();
            return res.json({ success: true, message: '¡Cuenta verificada y registrada con éxito!' });
        } else {
            return res.status(400).json({ error: 'El código de verificación es incorrecto.' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar el código.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));