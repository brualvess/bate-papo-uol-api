import express, { json } from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
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
async function verificarUsuario(name) {
    const nome = await db.collection("participante").findOne({
        name: name
    }) 
    if (nome) {
        return 'usuário ja existe';
    }



}
app.post("/participants", async(request, response) => {
    const name = request.body;
    const validou = validacao.validate(name)
    const verificacao =await  verificarUsuario(name.name)
    const dia = dayjs().locale('pt-br').format('HH:mm:ss')
    if (validou.error) {
        response.sendStatus(422)
        return
    }
    if (verificacao == "usuário ja existe") {
        response.sendStatus(409)
        return
    } 
    console.log(verificacao)
    db.collection("participante").insertOne({
        name: name.name, lastStatus: Date.now()
    });
    db.collection("mensagem").insertOne({
        from: name.name,
        to: 'Todos',
        text: 'entra na sala...',
        type: 'status',
        time: dia
    });
    response.sendStatus(201)

})
app.get("/participants", (request, response) => {
    db.collection("participante").find().toArray().then(participantes => {
        response.send(participantes)
    });
});

app.listen(5000)
