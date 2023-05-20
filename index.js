const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 3000
const { MongoClient, ServerApiVersion , ObjectId} = require('mongodb');
let dotenv = require('dotenv').config()
const jwt = require('jsonwebtoken')

const app = express()


// middleware 
app.use(cors())
app.use(express.json())



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization 
    if(!authorization){
        return res.status(401).send({error:true, message : 'Authorization field 1'})
    }
    const token = authorization.split(' ')[1]
    // console.log(authorization)
    jwt.verify(token, process.env.ACCESS_TOKEN, (err,decoded)=> {
        if(err){
            return res.status(401).send({error:true, message : 'Authorization field'})
        }
        // console.log('token verified')
        req.decoded = decoded
        next()
    })

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qntinqa.mongodb.net/?retryWrites=true&w=majority`;
// console.log(uri)

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const notesCollection = client.db('data').collection('notes')

        app.post('/', verifyJWT ,async (req, res) => {
            const noteDetails = req.body
            const result = await notesCollection.insertOne(noteDetails)
            res.send(result)
        })

        app.post('/jwt', (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1h'
            })
            res.send({ token })
        })


        app.get('/notes', verifyJWT, async (req, res) => {
            let query = {}
            if (req.query.email && req.query.email === req.decoded.email) {
                query = { email: req.query.email }
                const result = await notesCollection.find(query).sort({update: -1}).toArray()
                return res.send(result)
            }
            return res.status(401).send({ error: true, message: 'Authorization field' })


        })

        app.delete('/notes',verifyJWT, async(req,res)=> {
            const id = req?.query?.id
            if(!id){
                return res.status(401).send({error:true,message: 'Id not found '})
            }
            const query = {$and :[{_id:new ObjectId(id), }, {email:req.decoded.email}]}
            const result = await notesCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/test',async (req,res)=> {
            const result = await notesCollection.find().toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('server is running ')
})


app.listen(port, () => {
    console.log(`Server is running on ${port}`)
})