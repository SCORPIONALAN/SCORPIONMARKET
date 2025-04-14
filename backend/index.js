import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors';
import { OpenAI } from 'openai';

const __dirname = path.resolve();
dotenv.config(); //Inicializar variables de entorno
const app = express();
const PORT = process.env.PORT;
const MaxPromptsPerDay = 3;
const usersPerDay = {}
// Funcion que limpia cada 24 horas la lista de usuarios
setInterval(()=>{
    for (const user in usersPerDay){
        delete usersPerDay[user];
    }
}, 86400000)
//                  MIDDLEWARES PARA EL FUNCIONAMIENTO
//      CONEXION FRONT CON BACK
app.use(cors({
    origin:"http://localhost:5173",
    credentials: true
}));
//      USO DE JSON
app.use(express.json());
app.use(express.urlencoded({extended: true})) // Devolver los valores de un formulario como JSON

// Construccion del sitio

if(process.env.NODE_ENV === 'production'){
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*',(req,res)=>{
        res.sendFile(path.join(__dirname, '../frontend', 'dist', 'index.html'));
    })
}
//      Middleware para condicionar
const MiddlewarePrompt = async(req, res, next)=>{
    const {userId} = req.body;
    if(!userId) return res.status(404).json({content: "No hay usuario!", error:"No existe un usuario"});
    if(!usersPerDay[userId]){
        usersPerDay[userId] = {attemps: 1};
    }else{
        if(usersPerDay[userId].attemps >= MaxPromptsPerDay){
            return res.status(429).json({
                content: "Limite de peticiones alcanzado",
                error: "Limite de peticiones alcanzado"
            });
        };
        usersPerDay[userId].attemps +=1;
    }
    next();
}
//                  RUTA POST PARA OPENIA
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const conexto = `
        Eres el asistente de SCORPIONTIENDA, una tienda en FES Aragón (Nezahualcóyotl, Edo. Méx). Solo respondes dudas sobre productos, precios, horario, ubicación y métodos de pago. Si te preguntan algo fuera de eso, responde: "Una disculpa! Lo que nos pides no está relacionado a la tienda😔". Responde de forma amable y directa.
        Considera como dudas válidas sobre horario cualquier mensaje que pregunte si están abiertos, si hay servicio, si están disponibles o si pueden atender.
        Si el usuario menciona un producto con un nombre muy parecido al del menú (por ejemplo "taco dorado" en vez de "tacos dorados"), respóndele amablemente confirmando si se vende o no. No rechaces su mensaje por no ser idéntico. Usa sentido común para reconocer plurales, variaciones o sinónimos.
        Si el usuario pide algo que no esté en el menú, responde:  
        "Una disculpa no vendemos <lo que ingresó el usuario>, tomaremos nota y próximamente lo agregaremos al menú 🤗"
        Horario: Lunes a Viernes de 11am–9pm. No trabajamos sábados ni domingos.  
        Si te preguntan por el horario o disponibilidad, y actualmente (según el sistema) no es un día hábil o está fuera del horario, responde:  
        "Perdón, no estamos en servicio. Aquí nuestros horarios: Lunes a Viernes de 11am a 9pm."
        Métodos de pago: Efectivo y transferencia.
        Productos:  
        Hotdogs - Clásico $30, Tocino $40, Hawaiano $60 (+$10 con papas)  
        Tortas de chilaquiles - Milanesa $40, Pollo $30, Chilaquiles rojos/verdes $30  
        Tacos dorados $30, Papas a la francesa $30  
        Refrescos - Coca $22, Sprite $20, Sangría $20, Agua mineral $20, Volt $20
    `
let conversaciones = {};

app.post('/api/pedir', MiddlewarePrompt, async (req, res)=>{
    
    const {userId, input} = req.body;
    if(!input) return res.status(404).json({error: "Mandaste un mensaje vacio"});
    try {
        if(!conversaciones[userId]){
            conversaciones[userId] = [ {role: 'system', content: conexto},]
        }
        conversaciones[userId].push({role: 'user', content: input})
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: conversaciones[userId],
            max_tokens: 300,
        });
        const reply = response.choices[0].message.content; // La respuesta
        // agregar respuestas
        conversaciones[userId].push({role:'assistant', content: reply});
        // Limitar numero de mensajes en la memoria
        if(conversaciones[userId].length > 12){
            const systemMsg = conversaciones[userId][0]; // Prompt Main
            const ultimosMensajes = conversaciones[userId].slice(-10);
            conversaciones[userId] = [systemMsg, ...ultimosMensajes];
        }
        return res.status(200).json({reply});

    } catch (error) {
        console.error("Error: ", error)
        return res.status(500).json({error: "Error al generar la respuesta"})
    }
});

// Inicializar servidor en puerto
app.listen(PORT, ()=>{
    console.log(`Escuchando desde el puerto ${PORT}`);
});