import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi'
import dayjs from 'dayjs'

let db;
dotenv.config()
const mongoClient = new MongoClient(process.env.MONGO_URI);
mongoClient.connect().then(() => {
    db = mongoClient.db("bate_papo");
});

const app = express();
app.use(json());
app.use(cors());

const validacao = joi.object({
    name: joi.string().required()

})
const validar = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid('message', 'private_message').required()


})

async function verificarUsuario(name) {
    const nome = await db.collection("participante").findOne({
        name: name
    })
    if (nome) {
        return 'usuário ja existe';
    }



}
app.post("/participants", async (request, response) => {
    const name = request.body;
    const validou = validacao.validate(name)
    const verificacao = await verificarUsuario(name.name)
    const time = dayjs().locale('pt-br').format('HH:mm:ss')
    if (validou.error) {
        response.sendStatus(422)
        return
    }
    if (verificacao == "usuário ja existe") {
        response.sendStatus(409)
        return
    }
    db.collection("participante").insertOne({
        name: name.name, lastStatus: Date.now()
    });
    db.collection("mensagem").insertOne({
        from: name.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: time
    });
    response.sendStatus(201)

})
app.get("/participants", (request, response) => {
    db.collection("participante").find().toArray().then(participantes => {
        response.send(participantes)
    });
});

app.post("/messages", async (request, response) => {
    const { user } = request.headers
    const { to, text, type } = request.body
    const validou = validar.validate(request.body)
    const verificacao = await verificarUsuario(user)
    const time = dayjs().locale('pt-br').format('HH:mm:ss')

    if (validou.error || verificacao != "usuário ja existe") {
        response.sendStatus(422)
        return
    }
    await db.collection("mensagem").insertOne({
        from: user,
        to: to,
        text: text,
        type: type,
        time: time
    });
    response.sendStatus(201)
});

app.get("/messages", (request, response) => {
    const limit = parseInt(request.query.limit);
    const { user } = request.headers
    db.collection("mensagem").find({ $or: [ { to: user}, { to: "Todos"}, {from : user} ] }).limit(limit).sort({_id: 1}).toArray().then(mensagens => {
        response.send(mensagens)
    });
   
});
app.post("/status", async (request, response) => {
    const { user } = request.headers
    const participante = await verificarUsuario(user)
   
    if (participante != "usuário ja existe") {
        response.sendStatus(404)
        return
    } 
    db.collection("participante").updateOne({name: user},{$set:{lastStatus:Date.now()}})
    response.sendStatus(200)
});

setInterval (async()=>{
    const time = dayjs().locale('pt-br').format('HH:mm:ss')
    const participantes = await db.collection("participante").find().toArray()
    for(let i = 0; i < participantes.length; i++){
        let participante = participantes[i]
        const calculo = (Date.now() - participante.lastStatus) / 1000
        if(calculo > 10){
            await db.collection("participante").deleteOne({ _id: new ObjectId(participante._id) })
            await db.collection("mensagem").insertOne({
                from: participante.name,
                to: "Todos",
                text: "sai da sala...",
                type: "status",
                time: time
            });

        }

    }

},15000) 


app.listen(5000)
